'use strict';

// JSDoc 4 → setu → dwar bridge. `publish(taffyData, opts, tutorials)` is the
// entry JSDoc invokes; everything below orchestrates the four phase packages.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, join as joinPath, resolve as resolvePath } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import type {
  CopyPageAction,
  CopyPageConfig,
  PageNavConfig,
  OutputFile,
  SiteLogo,
  SiteManifest,
  SiteName,
  ThemeColors,
  ThemeConfig,
} from '@clean-jsdoc-theme/dwar';
import type { DocInput, MenuItem, SourceFileInput, TutorialInput } from '@clean-jsdoc-theme/setu';
import { writeOutputFiles } from './write-output-files';

// JSDoc's tutorial source-type enum (jsdoc/lib/jsdoc/tutorial.js): HTML = 1,
// MARKDOWN = 2. A tutorial's `.content` is the RAW source; `.type` says how to
// read it.
const JSDOC_TUTORIAL_TYPE_MARKDOWN = 2;

// Absolute path of the running module. The `new Function` wrapper around
// `import.meta` keeps the CJS parser from rejecting it.
function anchorPath(): string {
  if (typeof __filename === 'string') return __filename;
  try {
    const getEsmUrl = new Function(
      'try { return import.meta && import.meta.url; } catch { return undefined; }'
    ) as () => string | undefined;
    const url = getEsmUrl();
    if (typeof url === 'string' && url.startsWith('file://')) {
      return fileURLToPath(url);
    }
  } catch {
    // fall through to the throw below.
  }
  throw new Error(
    'clean-jsdoc-theme: could not determine the running module path ' +
      '(neither __filename nor import.meta.url resolved).'
  );
}

function resolvePackageDir(name: string): string {
  const start = anchorPath();
  let dir = dirname(start);
  let prev = '';
  while (dir !== prev) {
    const candidate = resolvePath(dir, 'node_modules', name);
    try {
      readFileSync(resolvePath(candidate, 'package.json'), 'utf8');
      return candidate;
    } catch {
      // not here — go up.
    }
    prev = dir;
    dir = dirname(dir);
  }
  throw new Error(`clean-jsdoc-theme: could not locate '${name}' on disk starting from ${start}.`);
}

interface MinimalPkgJson {
  main?: string;
  module?: string;
  exports?: string | Record<string, unknown>;
}

/**
 * Resolve an `exports` condition subtree (a string target, or a conditions
 * object like `{ import, require, default, types }`) to an absolute path,
 * preferring the ESM condition (`import`, then a bare `default`). Recurses for
 * nested conditions (`import: { default: "…" }`). Returns `undefined` when no
 * usable target is present.
 */
function resolveExportTarget(node: unknown, pkgRoot: string): string | undefined {
  if (typeof node === 'string') return resolvePath(pkgRoot, node);
  if (!node || typeof node !== 'object') return undefined;
  const o = node as Record<string, unknown>;
  const imp = resolveExportTarget(o.import, pkgRoot);
  if (imp) return imp;
  if (typeof o.default === 'string') return resolvePath(pkgRoot, o.default);
  return undefined;
}

function resolveEsmEntry(name: string): string {
  const pkgRoot = resolvePackageDir(name);
  const pkg = JSON.parse(
    readFileSync(resolvePath(pkgRoot, 'package.json'), 'utf8')
  ) as MinimalPkgJson;

  const exp = pkg.exports;
  if (typeof exp === 'string') return resolvePath(pkgRoot, exp);
  if (exp && typeof exp === 'object') {
    // Either a `.` subpath (`{ ".": … }`) or top-level conditions with no
    // subpaths (`{ import, default, types }`, as ora ships). Resolve whichever.
    const dot = (exp as Record<string, unknown>)['.'];
    const target = resolveExportTarget(dot !== undefined ? dot : exp, pkgRoot);
    if (target) return target;
  }
  if (typeof pkg.module === 'string') return resolvePath(pkgRoot, pkg.module);
  if (typeof pkg.main === 'string') return resolvePath(pkgRoot, pkg.main);

  throw new Error(
    `clean-jsdoc-theme: could not determine ESM entry file for '${name}' (no exports/module/main).`
  );
}

// setu and dwar are ESM-only; JSDoc 4 loads this theme via `require()`, so the
// CJS bundle here can't `require()` them. Dynamic-import a `file://` URL
// instead. The specifier is funneled through a variable so tsup/esbuild don't
// rewrite the dynamic import into a static `require()` during CJS bundling.
async function loadDep<T>(name: string, requiredExports: readonly string[]): Promise<T> {
  const entry = resolveEsmEntry(name);
  const id = pathToFileURL(entry).href;
  const mod = (await import(id)) as Record<string, unknown>;
  for (const key of requiredExports) {
    if (typeof mod[key] !== 'function') {
      throw new Error(
        `clean-jsdoc-theme: '${name}' did not export a '${key}' function ` +
          `(resolved from ${entry}; got keys: ${Object.keys(mod).join(', ') || '(none)'}).`
      );
    }
  }
  return mod as T;
}
const loadSetu = (): Promise<typeof import('@clean-jsdoc-theme/setu')> =>
  loadDep('@clean-jsdoc-theme/setu', ['generateSite']);
const loadDwar = (): Promise<typeof import('@clean-jsdoc-theme/dwar')> =>
  loadDep('@clean-jsdoc-theme/dwar', ['render', 'runPagefindAgainstDir']);
const loadUtils = (): Promise<typeof import('@clean-jsdoc-theme/utils')> =>
  loadDep('@clean-jsdoc-theme/utils', [
    'validateThemeOpts',
    'createGoogleFontResolver',
    'formatDiagnostics',
    'formatBuildReport',
    'normalizeBasePath',
    'withBase',
    'toExtractManifest',
  ]);

/** The `ora` spinner factory (its default export). */
type OraFactory = typeof import('ora').default;

/**
 * Load `ora` (ESM-only) the same way as the other deps — via a resolved
 * `file://` URL so the CJS bundle doesn't `require()` it. Returns `null` if
 * `ora` can't be loaded, so progress degrades to silent rather than failing
 * the build.
 */
const loadOra = async (): Promise<OraFactory | null> => {
  try {
    const mod = await loadDep<typeof import('ora')>('ora', ['default']);
    return mod.default;
  } catch {
    return null;
  }
};

/**
 * JSDoc's own standard `opts` keys (`jsdoc/lib/jsdoc/opts/argparser.js` +
 * `conf` schema). These share the flat `opts` namespace with the theme's
 * options, so they must never be flagged as unknown theme keys — even by a
 * near-miss typo distance. Theme keys (`docs`, `docGroups`, …) live in
 * `THEME_OPT_KEYS`, NOT here.
 */
const JSDOC_OWN_OPTS: ReadonlySet<string> = new Set([
  'destination',
  'template',
  'encoding',
  'recurse',
  'readme',
  'package',
  'tutorials',
  'query',
  'private',
  'access',
  'explain',
  'debug',
  'verbose',
  'pedantic',
  'match',
  'nocolor',
  'templates',
]);

interface JSDocOpts {
  destination?: string;
  package?: string;
  /**
   * Site identity from `jsdoc.json` (`"opts": { "siteName": ... }`). Either a
   * string (shown in the header/footer and appended to each page's `<title>`),
   * or a logo image set `{ default, dark, light, alt }`. Local image paths are
   * copied into the output; `http(s)://` and `data:` values pass through. The
   * `alt` text (or `pkg.name`) is used for the `<title>` suffix and image alt.
   */
  siteName?: string | SiteLogo;
  /**
   * Font overrides from `jsdoc.json` (`"opts": { "fonts": { ... } }`). Values
   * are Google Fonts family names for `heading`/`body`; `mono` is a CSS stack.
   */
  fonts?: { heading?: string; body?: string; mono?: string };
  /**
   * Light-mode color overrides from `jsdoc.json` (`"opts": { "colors": { ... } }`).
   * Any subset of `bg`, `bgMuted`, `fg`, `fgMuted`, `accent`, `accentFg`, `border`;
   * each value is any CSS color string (the theme ships oklch). Omitted keys keep
   * the default palette.
   */
  colors?: unknown;
  /**
   * Dark-mode color overrides (`"opts": { "darkColors": { ... } }`). Same keys as
   * {@link JSDocOpts.colors}; emitted under `[data-theme="dark"]`. Omitted keys
   * keep the default dark palette.
   */
  darkColors?: unknown;
  /**
   * Project README as HTML. JSDoc renders the Markdown README (`-R`/`opts.readme`
   * or one found in the source paths) and replaces this with the resulting HTML
   * before calling `publish`. Rendered as the site home page.
   */
  readme?: string;
  /** Path to the tutorials directory (`-u`/`opts.tutorials`); resolved tree arrives as the 3rd `publish` arg. */
  tutorials?: string;
  /**
   * Path to a docs content directory (`jsdoc.json` `"opts": { "docs": "docs/" }`),
   * resolved relative to the cwd. The bridge walks it recursively; each
   * `*.md`/`*.markdown` (and `*.html`) file becomes a prose page at its clean,
   * unprefixed slug (the relative path), grouped by frontmatter/directory. A root
   * `index.md` becomes the home page. Unset → no docs site (today's behavior).
   */
  docs?: unknown;
  /**
   * Top-level doc-group display order (`jsdoc.json` `"opts": { "docGroups": [...] }`).
   * An ordered list of doc-group labels controlling how the doc-group sidebar
   * sections render (after the API sections). Omit for the default order.
   */
  docGroups?: unknown;
  /**
   * Group label assigned to a doc page that carries no frontmatter/directory
   * group (`jsdoc.json` `"opts": { "defaultDocGroup": "Docs" }`). Omit to leave
   * such pages ungrouped.
   */
  defaultDocGroup?: unknown;
  /**
   * Sidebar section order from `jsdoc.json` (`"opts": { "sectionOrder": [...] }`).
   * An ordered list of section labels (e.g. `["Classes", "Tutorials"]`) that both
   * filters and orders the sidebar sections; "Home" and "Source Files" are always
   * shown regardless. Omit (or leave empty) for the default order.
   */
  sectionOrder?: unknown;
  /**
   * Full sidebar menu from `jsdoc.json` (`"opts": { "menu": [...] }`). An ordered
   * list of `{ id, title, href, icon }` entries. When present it takes precedence
   * over `sectionOrder` and controls the entire sidebar (built-ins, sections, and
   * external links). See setu's {@link MenuItem}.
   */
  menu?: unknown;
  /**
   * Club related sidebar entries into prefix-grouped subtrees (`jsdoc.json`
   * `"opts": { "clubSidebarItems": true }`). Groups entries within each section
   * by the path segment before the first `/` (e.g. `queue/*` under a `queue`
   * parent); a prefix with a single entry is left flat. Off by default.
   */
  clubSidebarItems?: unknown;
  /**
   * Custom prompt for the copy-page button's "Open in ChatGPT/Claude/Perplexity"
   * actions (`jsdoc.json` `"opts": { "aiPrompt": "…" }`). `{siteName}`, `{url}`,
   * and `{mdUrl}` (the page's raw Markdown link) placeholders are substituted at
   * click time. Only the prompt + links are sent (the AI fetches `{mdUrl}`), so
   * the query stays short for long docs. Omit for a sensible default.
   */
  aiPrompt?: unknown;
  /**
   * Copy-page button config (`jsdoc.json` `"opts": { "copyPage": … }`). Either a
   * boolean (`false` hides the button) or an object `{ enabled?, actions? }`,
   * where `actions` is an ordered subset of
   * `["copy","view","claude","chatgpt","perplexity"]` (`[]` shows just the
   * primary copy button). Defaults to enabled with all actions.
   */
  copyPage?: unknown;
  /**
   * Previous/next page pager config (`jsdoc.json` `"opts": { "pageNav": … }`).
   * Either a boolean (`false` hides the pager) or an object `{ enabled? }`. The
   * pager links each content page to its neighbors in sidebar reading order.
   * Defaults to enabled.
   */
  pageNav?: unknown;
  /**
   * Inline custom CSS (`jsdoc.json` `"opts": { "customCss": "…" }`), injected as
   * a `<style>` after the theme stylesheet so it can override.
   */
  customCss?: unknown;
  /**
   * Path(s) to custom CSS file(s) (`"opts": { "customCssFile": "a.css" }` or an
   * array). Each file is copied AS-IS (its own bytes) to
   * `_assets/<name>.<hash>.css` and linked after the theme stylesheet. The
   * `<hash>` is a content hash (see `hashCustomAssets`), so an unchanged file
   * keeps a stable, cacheable URL.
   */
  customCssFile?: unknown;
  /**
   * Inline custom JS (`"opts": { "customJs": "…" }`), injected as a classic
   * `<script>` before `</body>`, after the theme's own scripts.
   */
  customJs?: unknown;
  /**
   * Path(s) to custom JS file(s) (`"opts": { "customJsFile": "a.js" }` or an
   * array). Each file is copied AS-IS to `_assets/<name>.<hash>.js` and
   * referenced before `</body>`. See `hashCustomAssets`.
   */
  customJsFile?: unknown;
  /**
   * Whether to append a content hash to copied `customCssFile`/`customJsFile`
   * asset names (`_assets/<name>.<hash>.css`). Defaults to `true` — the hash is
   * derived from the file's content (NOT random), so an unchanged file yields
   * the same URL across builds (cache-friendly) and a changed file cache-busts.
   * Set `false` to copy with the original `<name>.css`/`.js` (no hash).
   */
  hashCustomAssets?: unknown;
  /**
   * Build-stage progress output (`jsdoc.json` `"opts": { "progress": false }`).
   * The setu→dwar pipeline does noticeably more than a bare jsdoc run (per-page
   * MDX compile, per-island esbuild bundling, the Pagefind index), so by default
   * the bridge narrates each stage with its elapsed time. Set `false` to silence
   * the stage lines (the build report still prints).
   */
  progress?: unknown;
  /**
   * JSDoc's default-template source options, read from `conf.templates.default`
   * (or, as a fallback, nested under `opts.templates`):
   *  - `outputSourceFiles` — defaults to `true`; set `false` to suppress the
   *    per-file source viewer pages and the `Source: file:line` member links.
   *  - `sourceLinkToComment` — defaults to `false`. By default a `Source:`
   *    link lands on the first line of the declaration; set `true` to point it
   *    at the doclet's doc-comment line instead (the pre-v5 behavior).
   */
  templates?: { default?: { outputSourceFiles?: unknown; sourceLinkToComment?: unknown } };
  [key: string]: unknown;
}

const defaultTheme: ThemeConfig = {
  tokens: {
    // Light palette (oklch). bg #fdfdf7 · fg #3e3e3e · border #eeeeee;
    // muted/accent derived to harmonize.
    colors: {
      bg: 'oklch(0.9924 0.0079 106.54)',
      bgMuted: 'oklch(0.9595 0.0079 106.55)',
      fg: 'oklch(0.3639 0 0)',
      fgMuted: 'oklch(0.5278 0 0)',
      accent: 'oklch(0 0 0)',
      accentFg: 'oklch(1 0 0)',
      border: 'oklch(0.9561 0 0)',
    },
    // Dark palette (oklch). bg #09090b · fg #9e9e9e · border #141416;
    // muted/accent derived to harmonize.
    darkColors: {
      bg: 'oklch(0.1408 0.0044 285.82)',
      bgMuted: 'oklch(0.2103 0.0059 285.89)',
      fg: 'oklch(0.6993 0 0)',
      fgMuted: 'oklch(0.5382 0 0)',
      accent: 'oklch(1 0 0)',
      accentFg: 'oklch(0 0 0)',
      border: 'oklch(0.2321 0.004 286.02)',
    },
    fonts: {
      heading: 'Source Serif 4',
      body: 'Roboto',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    shiki: { light: 'github-light', dark: 'github-dark' },
  },
  basePath: '/',
};

/** A subset of `{ heading, body, mono }` — the shape validated font overrides take. */
interface ValidatedFonts {
  heading?: string;
  body?: string;
  mono?: string;
}

/**
 * Merge validated user overrides from `jsdoc.json` (`siteName`, `fonts`) over
 * the defaults. Only the keys the user supplies are overridden; everything else
 * keeps the default theme. `siteName` is pre-resolved/validated and its local
 * logos copied by `prepareSiteName`; `fonts` is the validated subset (any
 * family flagged `fonts/not-google` is dropped upstream so the default applies).
 */
function resolveTheme(
  opts: JSDocOpts,
  siteName: SiteName | undefined,
  fonts: ValidatedFonts,
  basePath: string
): ThemeConfig {
  const aiPrompt =
    typeof opts.aiPrompt === 'string' && opts.aiPrompt.trim() ? opts.aiPrompt.trim() : undefined;
  const copyPage = normalizeCopyPage(opts.copyPage);
  const pageNav = normalizePageNav(opts.pageNav);

  // Color overrides merge per-key over the default palettes, so supplying only
  // `colors.bg` keeps every other default color. `darkColors` layers over the
  // default dark palette the same way.
  const colors = normalizeColors(opts.colors);
  const darkColors = normalizeColors(opts.darkColors);

  return {
    ...defaultTheme,
    basePath,
    ...(aiPrompt ? { aiPrompt } : {}),
    ...(copyPage ? { copyPage } : {}),
    ...(pageNav ? { pageNav } : {}),
    tokens: {
      ...defaultTheme.tokens,
      colors: { ...defaultTheme.tokens.colors, ...(colors ?? {}) },
      darkColors: { ...defaultTheme.tokens.darkColors, ...(darkColors ?? {}) },
      fonts: {
        heading: fonts.heading ?? defaultTheme.tokens.fonts.heading,
        body: fonts.body ?? defaultTheme.tokens.fonts.body,
        mono: fonts.mono ?? defaultTheme.tokens.fonts.mono,
      },
      ...(siteName ? { siteName } : {}),
    },
  };
}

/** Trim a value to a non-empty string, or `undefined`. */
function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/**
 * Short, deterministic content hash for cache-stable custom-asset filenames.
 * Derived from the file's bytes (NOT random), so an unchanged file produces the
 * same name across builds (browser cache hit) and a changed file cache-busts.
 */
function contentHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/**
 * Copy custom CSS/JS file(s) (a path or array, relative to the working dir) to
 * served `_assets` files and return their hrefs. Each file is copied AS-IS (its
 * own bytes — never concatenated). The asset name is `<base>.<hash>.<ext>` when
 * `hash` is on (the hash is content-derived → stable URL for unchanged files),
 * else the bare `<base><ext>`. A file that can't be read is skipped with a
 * warning (resilient, like `prepareSiteName`); an identical served name is
 * emitted once.
 */
async function copyCustomFiles(
  raw: unknown,
  ext: '.css' | '.js',
  hash: boolean,
  label: string,
  hrefForServed: (servedPath: string) => string
): Promise<{ links: string[]; files: OutputFile[] }> {
  const paths = (Array.isArray(raw) ? raw : [raw]).filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  );
  const links: string[] = [];
  const files: OutputFile[] = [];
  const seen = new Set<string>();
  for (const p of paths) {
    const trimmed = p.trim();
    let bytes: Buffer;
    try {
      bytes = await readFile(resolvePath(trimmed));
    } catch {
      console.warn(`clean-jsdoc-theme: could not read ${label} ('${trimmed}'); skipping it.`);
      continue;
    }
    const base = basename(trimmed, extname(trimmed)) || 'custom';
    const name = hash ? `${base}.${contentHash(bytes)}${ext}` : `${base}${ext}`;
    const servedPath = `_assets/${name}`;
    if (seen.has(servedPath)) continue;
    seen.add(servedPath);
    files.push({ path: servedPath, contents: bytes });
    // The OutputFile `path` stays relative (no leading slash); only the served
    // href gets the base-path prefix (`/` when unset → unchanged).
    links.push(hrefForServed(servedPath));
  }
  return { links, files };
}

/**
 * Resolve the custom CSS/JS injection options into render-ready `ThemeConfig`
 * fields plus the asset files to write. Inline strings (`customCss`/`customJs`)
 * pass through; file options (`customCssFile`/`customJsFile`) are read + copied
 * to content-hashed assets here — the bridge is the I/O layer, so dwar's
 * `render()` stays pure and just links the resulting hrefs. `hashCustomAssets`
 * (default `true`) toggles the content-hash suffix.
 */
async function resolveCustomAssets(
  opts: JSDocOpts,
  hrefForServed: (servedPath: string) => string
): Promise<{
  theme: {
    customCss?: string;
    customCssLinks?: string[];
    customJs?: string;
    customJsLinks?: string[];
  };
  files: OutputFile[];
}> {
  const hash = opts.hashCustomAssets !== false; // content-hashed by default
  const [cssAssets, jsAssets] = await Promise.all([
    copyCustomFiles(opts.customCssFile, '.css', hash, 'customCssFile', hrefForServed),
    copyCustomFiles(opts.customJsFile, '.js', hash, 'customJsFile', hrefForServed),
  ]);
  const customCss = nonEmptyString(opts.customCss)?.trim();
  const customJs = nonEmptyString(opts.customJs)?.trim();
  return {
    theme: {
      ...(customCss ? { customCss } : {}),
      ...(cssAssets.links.length > 0 ? { customCssLinks: cssAssets.links } : {}),
      ...(customJs ? { customJs } : {}),
      ...(jsAssets.links.length > 0 ? { customJsLinks: jsAssets.links } : {}),
    },
    files: [...cssAssets.files, ...jsAssets.files],
  };
}

/** A logo value that's already a servable URL/URI needs no copying. */
function isServableUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || /^data:/i.test(value);
}

/**
 * Resolve `opts.siteName` into a render-ready value plus any image files to
 * write. A string passes through (trimmed). For a logo set, each local image
 * path is read and emitted as a content-hashed output asset
 * (`_assets/logo-<key>.<hash><ext>`, cache-busted like the custom assets) with
 * its value rewritten to the served path; `http(s)://` / `data:` values pass
 * through untouched, and the `alt` label is preserved. A path that can't be
 * read is left verbatim with a warning rather than aborting the build.
 */
async function prepareSiteName(
  raw: string | SiteLogo | undefined,
  hrefForServed: (servedPath: string) => string
): Promise<{ siteName: SiteName | undefined; files: OutputFile[] }> {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return { siteName: trimmed.length > 0 ? trimmed : undefined, files: [] };
  }
  if (!raw || typeof raw !== 'object') return { siteName: undefined, files: [] };

  const files: OutputFile[] = [];
  const out: SiteLogo = {};
  if (typeof raw.alt === 'string' && raw.alt.trim().length > 0) out.alt = raw.alt.trim();

  for (const key of ['default', 'dark', 'light'] as const) {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    const v = value.trim();

    if (isServableUrl(v)) {
      out[key] = v;
      continue;
    }

    try {
      const abs = resolvePath(v);
      const buf = await readFile(abs);
      const served = `_assets/logo-${key}.${contentHash(buf)}${extname(abs)}`;
      files.push({ path: served, contents: buf });
      // OutputFile `path` stays relative; only the served href gets the prefix.
      out[key] = hrefForServed(served);
    } catch {
      console.warn(
        `clean-jsdoc-theme: could not read logo image for siteName.${key} ('${v}'); using it verbatim.`
      );
      out[key] = v;
    }
  }

  const hasContent = out.default || out.dark || out.light || out.alt;
  return { siteName: hasContent ? out : undefined, files };
}

// Priority: opts.package file → taffy `kind:'package'` doclet → undefined.
async function resolvePkg(
  data: unknown,
  opts: JSDocOpts
): Promise<SiteManifest['pkg'] | undefined> {
  if (typeof opts.package === 'string' && opts.package.length > 0) {
    try {
      const json = await readFile(opts.package, 'utf8');
      const parsed = JSON.parse(json) as Record<string, unknown>;
      return pickPkgFields(parsed);
    } catch {
      // fall through — try the taffy collection instead.
    }
  }

  // Probe the taffy collection for a `kind: 'package'` doclet without
  // taking a hard dependency on the salty API surface here.
  if (typeof data === 'function') {
    try {
      const pkgDoclets = (data as (q: unknown) => { get(): unknown[] })({ kind: 'package' }).get();
      if (Array.isArray(pkgDoclets) && pkgDoclets.length > 0) {
        return pickPkgFields(pkgDoclets[0] as Record<string, unknown>);
      }
    } catch {
      // ignore — collection isn't a salty DB or has no package doclet.
    }
  }

  return undefined;
}

function pickPkgFields(raw: Record<string, unknown>): SiteManifest['pkg'] {
  const pkg: SiteManifest['pkg'] = {};
  if (typeof raw.name === 'string') pkg.name = raw.name;
  if (typeof raw.version === 'string') pkg.version = raw.version;
  if (typeof raw.description === 'string') pkg.description = raw.description;
  if (typeof raw.homepage === 'string') pkg.homepage = raw.homepage;
  // `repository` may be a string or { url }; normalize to a string.
  if (typeof raw.repository === 'string') {
    pkg.repository = raw.repository;
  } else if (
    raw.repository &&
    typeof raw.repository === 'object' &&
    typeof (raw.repository as { url?: unknown }).url === 'string'
  ) {
    pkg.repository = (raw.repository as { url: string }).url;
  }
  return pkg;
}

/** Minimal view of JSDoc's `Tutorial` (jsdoc/lib/jsdoc/tutorial.js). */
interface JSDocTutorial {
  name?: unknown;
  title?: unknown;
  content?: unknown;
  type?: unknown;
  children?: unknown;
}

/**
 * Normalize JSDoc's tutorial resolver tree (the `tutorials` arg to `publish`)
 * into setu's plain {@link TutorialInput} shape. The root's `children` are the
 * top-level tutorials; each child carries its own `children`, so a depth-first
 * walk preserves the resolved hierarchy. Content is taken raw (`.content`);
 * `.type === 2` (MARKDOWN) is markdown, everything else is treated as HTML.
 */
function normalizeTutorials(root: unknown): TutorialInput[] {
  const walk = (node: JSDocTutorial): TutorialInput | null => {
    const name = typeof node.name === 'string' ? node.name : '';
    if (!name) return null;
    const title = typeof node.title === 'string' && node.title.length > 0 ? node.title : name;
    const content = typeof node.content === 'string' ? node.content : '';
    const type = node.type === JSDOC_TUTORIAL_TYPE_MARKDOWN ? 'markdown' : 'html';
    const children = Array.isArray(node.children)
      ? (node.children as JSDocTutorial[]).map(walk).filter((t): t is TutorialInput => t !== null)
      : [];
    return { name, title, content, type, children };
  };

  const children = (root as JSDocTutorial | undefined)?.children;
  if (!Array.isArray(children)) return [];
  return (children as JSDocTutorial[]).map(walk).filter((t): t is TutorialInput => t !== null);
}

/**
 * Resolve JSDoc's `templates.default.outputSourceFiles` flag. The `opts` arg
 * `publish` receives is `env.opts` — the `opts` block — which does NOT carry the
 * root-level `templates` block, so we probe in priority order and default ON:
 *   1. `require('jsdoc/env').conf.templates.default.outputSourceFiles` (the
 *      canonical location at runtime; wrapped in try/catch so a missing
 *      `jsdoc/env` — e.g. in unit tests — never throws the build).
 *   2. `opts.templates.default.outputSourceFiles` (in case a user nests it
 *      under `opts`).
 * Resolves to `false` ONLY when one of those is exactly `=== false`; otherwise
 * `true` (matching JSDoc's default-template default).
 */
export function outputSourceFilesEnabled(opts: JSDocOpts): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const env = require('jsdoc/env') as {
      conf?: { templates?: { default?: { outputSourceFiles?: unknown } } };
    };
    if (env?.conf?.templates?.default?.outputSourceFiles === false) return false;
  } catch {
    // `jsdoc/env` isn't resolvable (e.g. unit tests) — fall back to opts.
  }
  if (opts?.templates?.default?.outputSourceFiles === false) return false;
  return true;
}

/**
 * Resolve `templates.default.sourceLinkToComment`. Probed in the same priority
 * order as {@link outputSourceFilesEnabled} (canonical `jsdoc/env` conf, then a
 * nested `opts.templates` fallback). Resolves to `true` ONLY when one of those
 * is exactly `=== true`; otherwise `false` (the default: links jump to code).
 */
export function sourceLinkToCommentEnabled(opts: JSDocOpts): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const env = require('jsdoc/env') as {
      conf?: { templates?: { default?: { sourceLinkToComment?: unknown } } };
    };
    if (env?.conf?.templates?.default?.sourceLinkToComment === true) return true;
  } catch {
    // `jsdoc/env` isn't resolvable (e.g. unit tests) — fall back to opts.
  }
  if (opts?.templates?.default?.sourceLinkToComment === true) return true;
  return false;
}

/**
 * Whether a JSDoc `conf.plugins` list enables the bundled `plugins/markdown`
 * plugin. The theme relies on it: JSDoc runs `plugins/markdown` to convert the
 * Markdown in doclet descriptions/tags to HTML *before* `publish` ever sees the
 * doclets, so without it descriptions arrive as raw Markdown and render wrong.
 * Pure + exported for testing — accepts the `plugins` array (module specifiers,
 * e.g. `"plugins/markdown"`; tolerant of a `.js` suffix or path separators).
 */
export function hasMarkdownPlugin(plugins: unknown): boolean {
  if (!Array.isArray(plugins)) return false;
  return plugins.some((p) => typeof p === 'string' && /(^|[\\/])markdown(\.js)?$/i.test(p.trim()));
}

/**
 * Hard-require JSDoc's `plugins/markdown` plugin (see {@link hasMarkdownPlugin}).
 * Reads the merged config from `require('jsdoc/env').conf.plugins` — the
 * canonical location at runtime — and throws if the plugin is absent so the
 * build stops early with an actionable message. When `jsdoc/env` can't be
 * resolved (e.g. unit tests, or a non-JSDoc caller) the check is skipped: the
 * plugin list is unknowable there, so it can't be enforced.
 */
function assertMarkdownPlugin(): void {
  let conf: { plugins?: unknown } | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    conf = (require('jsdoc/env') as { conf?: { plugins?: unknown } }).conf;
  } catch {
    return; // `jsdoc/env` isn't resolvable here — can't verify, so don't enforce.
  }
  if (!conf) return;
  if (!hasMarkdownPlugin(conf.plugins)) {
    throw new Error(
      'clean-jsdoc-theme requires JSDoc\'s "plugins/markdown" plugin, which ' +
        'renders Markdown in doclet descriptions to HTML. Add it to your ' +
        'jsdoc.json:\n\n  "plugins": ["plugins/markdown"]\n'
    );
  }
}

/**
 * Validate `opts.sectionOrder` into a clean `string[]`, or `undefined` to fall
 * back to setu's default order. Accepts only an array; trims string entries and
 * drops non-strings/empties. An array that yields no usable labels → `undefined`.
 */
export function normalizeSectionOrder(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return out.length > 0 ? out : undefined;
}

/**
 * Validate `opts.menu` into a clean `MenuItem[]`, or `undefined` when there's no
 * usable menu. Accepts only an array of objects; trims string fields. The link
 * URL is read from `link` (preferred) or `href`. Keeps only actionable entries —
 * a built-in (`id`) or an external link (`link`/`href`).
 */
export function normalizeMenu(raw: unknown): MenuItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: MenuItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const item: MenuItem = {};
    if (typeof o.id === 'string' && o.id.trim()) item.id = o.id.trim();
    if (typeof o.title === 'string' && o.title.trim()) item.title = o.title.trim();
    const link =
      typeof o.link === 'string' && o.link.trim()
        ? o.link.trim()
        : typeof o.href === 'string' && o.href.trim()
          ? o.href.trim()
          : undefined;
    if (link) item.link = link;
    if (typeof o.icon === 'string' && o.icon.trim()) item.icon = o.icon.trim();
    if (item.id || item.link) out.push(item);
  }
  return out.length > 0 ? out : undefined;
}

/** Valid copy-page dropdown actions (mirrors setu/dwar's `CopyPageAction`). */
const COPY_PAGE_ACTIONS: readonly CopyPageAction[] = [
  'copy',
  'view',
  'claude',
  'chatgpt',
  'perplexity',
];

/**
 * Validate `opts.copyPage` into a {@link CopyPageConfig}, or `undefined` to use
 * the defaults (enabled, all actions). Accepts a boolean shorthand (`false`
 * hides the button) or an object: `enabled` is read if boolean; `actions`, if an
 * array, is filtered to the known action ids (preserving order, dropping
 * unknowns/dupes) — an empty/all-invalid array still yields `[]` (primary button
 * only), which is meaningful and kept.
 */
export function normalizeCopyPage(raw: unknown): CopyPageConfig | undefined {
  if (raw === false) return { enabled: false };
  if (raw === true || raw == null) return undefined;
  if (typeof raw !== 'object') return undefined;

  const o = raw as Record<string, unknown>;
  const config: CopyPageConfig = {};
  if (typeof o.enabled === 'boolean') config.enabled = o.enabled;
  if (Array.isArray(o.actions)) {
    const seen = new Set<CopyPageAction>();
    for (const a of o.actions) {
      if (typeof a === 'string' && (COPY_PAGE_ACTIONS as readonly string[]).includes(a)) {
        seen.add(a as CopyPageAction);
      }
    }
    config.actions = COPY_PAGE_ACTIONS.filter((a) => seen.has(a));
  }
  return Object.keys(config).length > 0 ? config : undefined;
}

/**
 * Validate `opts.pageNav` into a {@link PageNavConfig}, or `undefined` to use the
 * default (enabled). Accepts a boolean shorthand (`false` hides the pager) or an
 * object whose `enabled` is read when boolean.
 */
export function normalizePageNav(raw: unknown): PageNavConfig | undefined {
  if (raw === false) return { enabled: false };
  if (raw === true || raw == null) return undefined;
  if (typeof raw !== 'object') return undefined;
  const enabled = (raw as Record<string, unknown>).enabled;
  return typeof enabled === 'boolean' ? { enabled } : undefined;
}

/** The palette keys a user may override under `opts.colors` / `opts.darkColors`. */
const COLOR_KEYS = ['bg', 'bgMuted', 'fg', 'fgMuted', 'accent', 'accentFg', 'border'] as const;

/**
 * Validate a user `colors`/`darkColors` object from `jsdoc.json` into a clean
 * `Partial<ThemeColors>`: keeps only the known palette keys whose value is a
 * non-empty string, dropping everything else. Returns `undefined` when the input
 * is not an object or yields no usable keys, so callers can fall back cleanly.
 * Values are passed through verbatim (any CSS color is valid).
 */
export function normalizeColors(raw: unknown): Partial<ThemeColors> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Partial<ThemeColors> = {};
  for (const key of COLOR_KEYS) {
    const v = src[key];
    if (typeof v === 'string' && v.trim().length > 0) out[key] = v.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Extensions we treat as "source" worth emitting a viewer page for. */
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx']);

/**
 * Compute project-relative paths for a set of absolute source paths by stripping
 * their longest common directory prefix. Returns a `Map<absPath, relPath>` with
 * `relPath` normalized to forward slashes. Pure + exported for testing.
 *
 * Windows-aware: paths are split on both `/` and `\\`, and segment comparison is
 * case-insensitive (NTFS is case-insensitive, and JSDoc's `meta.path` casing can
 * differ from disk). The single-file case yields just its basename. If the paths
 * share no common leading segment (e.g. different drives / UNC vs. drive), each
 * file falls back to its basename so the index stays sane.
 */
export function computeRelPaths(absPaths: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  if (absPaths.length === 0) return out;

  const split = (p: string): string[] => p.split(/[\\/]+/).filter((s) => s.length > 0);
  const segLists = absPaths.map(split);

  // Longest common directory prefix (exclude the basename from the prefix so a
  // single file resolves to its own name, not the empty string).
  let common = segLists[0].slice(0, -1);
  for (let i = 1; i < segLists.length && common.length > 0; i++) {
    const segs = segLists[i];
    let j = 0;
    const max = Math.min(common.length, segs.length - 1);
    while (j < max && common[j].toLowerCase() === segs[j].toLowerCase()) j++;
    common = common.slice(0, j);
  }

  for (let i = 0; i < absPaths.length; i++) {
    const segs = segLists[i];
    const rel =
      common.length > 0 && segs.length > common.length
        ? segs.slice(common.length).join('/')
        : (segs[segs.length - 1] ?? absPaths[i]);
    out.set(absPaths[i], rel);
  }
  return out;
}

/**
 * Collect every source file referenced by a doclet's `meta` and read its
 * contents, ready to hand to setu as {@link SourceFileInput}s. `absPath` is the
 * exact `resolve(meta.path, meta.filename)` so setu's `Source: file:line`
 * matching (which joins the same fields) lines up. Files that can't be read are
 * warned about and skipped — never fatal. Returns sorted-by-`relPath` for
 * stable output.
 */
async function collectSourceFiles(data: unknown): Promise<SourceFileInput[]> {
  // Mirror resolvePkg's safe probe, but query ALL doclets (empty query).
  let doclets: unknown[] = [];
  if (typeof data === 'function') {
    try {
      doclets = (data as (q: unknown) => { get(): unknown[] })({}).get();
    } catch {
      try {
        doclets = (data as () => { get(): unknown[] })().get();
      } catch {
        doclets = [];
      }
    }
  }
  if (!Array.isArray(doclets) || doclets.length === 0) return [];

  // Unique absolute paths from doclet meta.
  const absSet = new Set<string>();
  for (const d of doclets) {
    const meta = (d as { meta?: { path?: unknown; filename?: unknown } } | undefined)?.meta;
    if (!meta || typeof meta.path !== 'string' || typeof meta.filename !== 'string') continue;
    const filename = meta.filename;
    // Skip obvious non-source by extension, but stay permissive (no ext → keep).
    const ext = extname(filename).toLowerCase();
    if (ext.length > 0 && !SOURCE_EXTENSIONS.has(ext)) continue;
    absSet.add(resolvePath(meta.path, filename));
  }
  if (absSet.size === 0) return [];

  const absPaths = [...absSet];
  const relPaths = computeRelPaths(absPaths);

  const inputs: SourceFileInput[] = [];
  for (const abs of absPaths) {
    try {
      const content = await readFile(abs, 'utf8');
      inputs.push({ absPath: abs, relPath: relPaths.get(abs) ?? abs, content });
    } catch (err) {
      console.warn(
        `clean-jsdoc-theme: could not read source file '${abs}' — ${(err as Error).message}; skipping.`
      );
    }
  }

  inputs.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return inputs;
}

/** Doc-file extensions → `DocInput.type`. Markdown is the priority; html maps to 'html'. */
const DOC_EXTENSIONS = new Map<string, DocInput['type']>([
  ['.md', 'markdown'],
  ['.markdown', 'markdown'],
  ['.html', 'html'],
  ['.htm', 'html'],
]);

/** Directory names skipped while walking a docs tree (build/vcs noise). */
const DOC_DIR_SKIP = new Set(['node_modules', '.git', '.svn', '.hg']);

/**
 * Recursively walk a docs directory and read each Markdown/HTML file into a
 * {@link DocInput} for setu's docs front-end. Mirrors {@link collectSourceFiles}'s
 * safe-probe style:
 *
 * - `path` is the file path relative to `dir`, POSIX-normalized (forward slashes)
 *   with the extension stripped (`<dir>/guides/advanced.md` → `'guides/advanced'`,
 *   `<dir>/index.md` → `'index'`).
 * - `content` is the raw UTF-8 text (frontmatter stays embedded — setu parses it).
 * - `type` is `'markdown'` for `.md`/`.markdown`, `'html'` for `.html`/`.htm`.
 *
 * Resilient by design: a missing/unreadable directory yields `[]` (never throws);
 * dotfiles/dot-dirs and `node_modules`-like noise are skipped; a single
 * unreadable file is warned about and skipped. Results are sorted by `path` so
 * the output is stable build-to-build. Setu does no I/O — this is the only place
 * the docs tree is read.
 */
export async function collectDocs(dir: string): Promise<DocInput[]> {
  if (typeof dir !== 'string' || dir.trim().length === 0) return [];
  const root = resolvePath(dir);
  const docs: DocInput[] = [];

  const walk = async (absDir: string, relPrefix: string): Promise<void> => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch {
      // Missing/unreadable directory — skip leniently (root miss → []).
      return;
    }

    for (const entry of entries) {
      const name = entry.name;
      // Skip dotfiles/dot-dirs and known build/vcs noise.
      if (name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        if (DOC_DIR_SKIP.has(name)) continue;
        await walk(joinPath(absDir, name), relPrefix ? `${relPrefix}/${name}` : name);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = extname(name).toLowerCase();
      const type = DOC_EXTENSIONS.get(ext);
      if (!type) continue;

      const abs = joinPath(absDir, name);
      const stem = name.slice(0, name.length - ext.length);
      const relPath = relPrefix ? `${relPrefix}/${stem}` : stem;
      try {
        const content = await readFile(abs, 'utf8');
        docs.push({ path: relPath, content, type });
      } catch (err) {
        console.warn(
          `clean-jsdoc-theme: could not read doc file '${abs}' — ${(err as Error).message}; skipping.`
        );
      }
    }
  };

  await walk(root, '');

  // Deterministic order so the manifest is stable build-to-build.
  docs.sort((a, b) => a.path.localeCompare(b.path));
  return docs;
}

/** Markdown image: captures `![alt](`, the src, an optional `"title"`, and `)`. */
const DOC_IMAGE_RE = /(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

/**
 * Resolve the local images a doc references and route them through the same
 * content-hashed `_assets/` pipeline the logo and custom files use. For each
 * `![alt](src)` whose `src` points to a file on disk, the file is copied to
 * `_assets/<base>.<hash><ext>` (cache-busted, deduped across docs) and the `src`
 * is rewritten to the root-relative `/_assets/<base>.<hash><ext>` (rang's
 * `MdxImg` adds the base path, like it does for links). A `src` is resolved
 * relative to the project root when it starts with `/`, else relative to the
 * doc's own directory; absolute (`http(s):`, `data:`), `#`-anchor, and
 * unreadable srcs are left untouched (the last with a warning). Returns the docs
 * with rewritten content plus the asset files to write. The bridge is the I/O
 * layer here, so setu/dwar only ever see the final `_assets/` paths.
 */
export async function resolveDocImages(
  docs: DocInput[],
  docsDir: string
): Promise<{ docs: DocInput[]; files: OutputFile[]; inlineSvgs: Record<string, string> }> {
  if (docs.length === 0) return { docs, files: [], inlineSvgs: {} };
  const root = resolvePath(docsDir);
  const files: OutputFile[] = [];
  const seenServed = new Set<string>();
  // Inline-SVG markup keyed by the rewritten src, so the renderer can inline the
  // SVG (→ its `[data-theme]` styles follow the toggle) rather than `<img>` it.
  const inlineSvgs: Record<string, string> = {};
  // abs path → rewritten src (root-relative `/_assets/…`), or null if unreadable.
  const cache = new Map<string, string | null>();

  const resolveOne = async (rawSrc: string, docDir: string): Promise<string | null> => {
    const src = rawSrc.trim();
    if (!src || isServableUrl(src) || src.startsWith('#') || src.startsWith('data:')) return null;
    const abs = src.startsWith('/') ? resolvePath(src.slice(1)) : resolvePath(docDir, src);
    if (cache.has(abs)) return cache.get(abs) ?? null;
    let bytes: Buffer;
    try {
      bytes = await readFile(abs);
    } catch {
      console.warn(
        `clean-jsdoc-theme: could not read doc image '${src}' (resolved '${abs}'); leaving it as-is.`
      );
      cache.set(abs, null);
      return null;
    }
    const ext = extname(abs);
    const served = `_assets/${basename(abs, ext) || 'asset'}.${contentHash(bytes)}${ext}`;
    if (!seenServed.has(served)) {
      seenServed.add(served);
      files.push({ path: served, contents: bytes });
    }
    const href = '/' + served;
    // SVGs are ALSO inlined: the renderer drops the markup into the page so its
    // `[data-theme="dark"]` styles track the theme toggle (an `<img>`-loaded SVG
    // only sees the OS color scheme). A responsive sizing style is injected onto
    // the `<svg>` root; the `_assets/` copy still backs the companion `.md` link.
    if (ext.toLowerCase() === '.svg') {
      inlineSvgs[href] = bytes
        .toString('utf8')
        .replace(/<svg\b/, '<svg style="max-width:100%;height:auto;display:block"');
    }
    cache.set(abs, href);
    return href;
  };

  const out: DocInput[] = [];
  for (const doc of docs) {
    const docDir = dirname(resolvePath(root, doc.path));
    const map = new Map<string, string>();
    for (const m of doc.content.matchAll(DOC_IMAGE_RE)) {
      const src = m[2];
      if (map.has(src)) continue;
      const href = await resolveOne(src, docDir);
      if (href) map.set(src, href);
    }
    if (map.size === 0) {
      out.push(doc);
      continue;
    }
    const content = doc.content.replace(DOC_IMAGE_RE, (full, pre, src, post) =>
      map.has(src) ? `${pre}${map.get(src)}${post}` : full
    );
    out.push({ ...doc, content });
  }
  return { docs: out, files, inlineSvgs };
}

/**
 * Validate `opts.docGroups` into a clean `string[]`, or `undefined` to fall back
 * to setu's default doc-group order. Mirrors {@link normalizeSectionOrder}:
 * accepts only an array; trims string entries and drops non-strings/empties.
 */
export function normalizeDocGroups(raw: unknown): string[] | undefined {
  return normalizeSectionOrder(raw);
}

/** Format an elapsed-ms span compactly: `840ms` under a second, else `5.2s`. */
function formatElapsed(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Handle a stage's `fn` can use to report sub-step progress on the spinner. */
interface StageHandle {
  /** Replace the live spinner label mid-stage (no-op when progress is off). */
  setText(text: string): void;
}

/**
 * Build-stage narrator backed by `ora`. The setu→dwar pipeline does much more
 * than a bare jsdoc run (per-page MDX compile, per-island esbuild bundling, the
 * Pagefind index), so a 7–8s build can otherwise look hung. `stage(label, fn)`
 * starts an ora spinner, runs `fn`, then resolves it to `✔ <label> (<elapsed>)`
 * on success or `✖ <label>` on failure. ora handles the spinner animation, TTY
 * detection (no animation when piped/CI), and the success/fail symbols.
 *
 * The catch: ora animates its frame on a `setInterval`, but each stage does
 * heavy *synchronous* work (module evaluation during the dynamic `import()`,
 * per-page MDX compile/SSR) that blocks the event loop — so the interval can't
 * fire and the spinner freezes on one frame, looking hung. Two things keep it
 * visibly alive: an elapsed-seconds **heartbeat** appended to the label (so it
 * advances whenever the loop breathes — module-graph I/O gaps, esbuild/Pagefind
 * subprocess waits), and the `setText` handle, which long stages use to report
 * their current sub-step (e.g. the renderer load steps setu → dwar → utils).
 *
 * `ora` is `null` when progress is disabled (`opts.progress === false`) or the
 * package couldn't be loaded — then `stage` just runs `fn` with no output.
 */
function createBuildProgress(ora: OraFactory | null) {
  async function stage<T>(label: string, fn: (handle: StageHandle) => T | Promise<T>): Promise<T> {
    const noop: StageHandle = { setText: () => {} };
    if (!ora) return await fn(noop);
    const spinner = ora(label).start();
    const begin = Date.now();
    let current = label;
    // Refresh the spinner text with the current sub-step + elapsed seconds. ora
    // repaints on its own interval, so this only shows once the event loop is
    // free, but it means a long stage advances rather than sitting on one frame.
    const refresh = () => {
      const secs = Math.floor((Date.now() - begin) / 1000);
      spinner.text = secs > 0 ? `${current} (${secs}s)` : current;
    };
    const heartbeat = setInterval(refresh, 1000);
    if (typeof heartbeat.unref === 'function') heartbeat.unref();
    const handle: StageHandle = {
      setText(text) {
        current = text;
        refresh();
      },
    };
    try {
      const result = await fn(handle);
      clearInterval(heartbeat);
      spinner.succeed(`${label} (${formatElapsed(Date.now() - begin)})`);
      return result;
    } catch (err) {
      clearInterval(heartbeat);
      spinner.fail(label);
      throw err;
    }
  }

  return { stage };
}

export async function publish(data: unknown, opts: JSDocOpts, tutorials?: unknown): Promise<void> {
  const destination = opts.destination;
  if (!destination || typeof destination !== 'string') {
    throw new Error(
      'clean-jsdoc-theme publish: opts.destination is required ' +
        '(set "opts.destination" in your jsdoc.json).'
    );
  }

  // The theme depends on JSDoc's `plugins/markdown` to pre-render doclet
  // Markdown to HTML; bail early with an actionable message if it's missing.
  assertMarkdownPlugin();

  // Color only on a real TTY (and unless JSDoc's `--nocolor` is set).
  const color = Boolean(process.stdout.isTTY) && opts.nocolor !== true;

  // Kick off the project file-reading I/O NOW, so it runs concurrently with the
  // renderer load below. None of it (pkg resolution, source files, the docs
  // tree) needs setu/dwar/utils, so on large projects — where reading hundreds
  // of source files is non-trivial — it overlaps the multi-second module
  // evaluation instead of running serially after it. These collectors are
  // internally resilient (unreadable files are warned + skipped, never thrown),
  // so starting them before their await point can't surface an unhandled
  // rejection; we await them at their narrated stages below.
  const docsDir =
    typeof opts.docs === 'string' && opts.docs.trim().length > 0 ? opts.docs.trim() : undefined;
  const pkgPromise = resolvePkg(data, opts);
  const sourcesPromise: Promise<SourceFileInput[]> = outputSourceFilesEnabled(opts)
    ? collectSourceFiles(data)
    : Promise.resolve([]);
  const docsPromise: Promise<DocInput[]> = docsDir ? collectDocs(docsDir) : Promise.resolve([]);

  // Stage progress (ora spinners) is on by default; `opts.progress: false`
  // silences it. ora loads first so the narrator can wrap the renderer load
  // (stage 1) too; a load failure degrades to silent rather than breaking.
  const ora = opts.progress === false ? null : await loadOra();
  const progress = createBuildProgress(ora);

  const [
    { generateSite },
    { render, runPagefindAgainstDir },
    {
      validateThemeOpts,
      createGoogleFontResolver,
      formatDiagnostics,
      formatBuildReport,
      normalizeBasePath,
      withBase,
      toExtractManifest,
    },
    // Loaded sequentially (not Promise.all) so the spinner can step its label
    // through each module — the evaluation of these large ESM bundles is the
    // single longest, most event-loop-blocking stage, so visibly naming the
    // module in flight is what stops it from reading as a hang.
  ] = await progress.stage('Loading renderer', async ({ setText }) => {
    setText('Loading renderer (setu)');
    const setu = await loadSetu();
    setText('Loading renderer (dwar)');
    const dwar = await loadDwar();
    setText('Loading renderer (utils)');
    const utils = await loadUtils();
    return [setu, dwar, utils] as const;
  });

  // Normalized base-path prefix (`/` when unset). Threaded into every emitted
  // href — logos and custom assets here; dwar prefixes the rest at render time.
  const basePath = normalizeBasePath(opts.basePath);
  // The OutputFile `path` stays relative; only the served href gets the prefix.
  const hrefForServed = (servedPath: string): string => withBase(basePath, '/' + servedPath);

  // Validate the theme options early (before any render work) so the developer
  // sees problems first. The Google-Font check is the one networked piece, kept
  // behind an injectable resolver in utils; it's fail-open, so an offline build
  // never breaks on it. Unknown keys get typo suggestions (`suggest-typos`),
  // never blanket warnings — JSDoc's own opts share this flat namespace.
  const fontResolver = createGoogleFontResolver();
  const { value, diagnostics } = await progress.stage('Validating options', () =>
    validateThemeOpts({
      opts,
      fontResolver,
      unknownKeyPolicy: 'suggest-typos',
      knownNonThemeKeys: JSDOC_OWN_OPTS,
    })
  );

  // Strict mode: `opts.strict` (or nested `templates.default.strict`). When on
  // AND there are errors, log + throw to fail the build. Otherwise (the
  // resilient default) log and continue — a bad font/typo never breaks a build.
  const strict =
    opts.strict === true ||
    (opts.templates as { default?: { strict?: unknown } } | undefined)?.default?.strict === true;

  if (diagnostics.list.length > 0) {
    const formatted = formatDiagnostics(diagnostics, { color });
    if (strict && diagnostics.hasErrors()) {
      console.error(formatted);
      throw new Error(
        'clean-jsdoc-theme: opts validation failed in strict mode ' +
          '(see the diagnostics above). Fix the errors or unset `strict`.'
      );
    }
    console.log(formatted);
  }

  // Resolved off the kickoff above (started concurrently with the renderer load).
  const pkg = await pkgPromise;

  // README (rendered to HTML by JSDoc into `opts.readme`) → home page; the
  // tutorials resolver tree → guide pages. Both flow through setu as ordinary
  // pages. Note: local images referenced by README/tutorial Markdown are NOT
  // copied into the output — use absolute/served URLs for those.
  const readme =
    typeof opts.readme === 'string' && opts.readme.length > 0 ? opts.readme : undefined;
  const tutorialTree = normalizeTutorials(tutorials);

  // Source viewer pages + `Source: file:line` member links. Gated behind
  // JSDoc's `templates.default.outputSourceFiles` (default ON); reading files
  // is optional and self-skips on error, so this never aborts the build.
  const sourceLinkToComment = sourceLinkToCommentEnabled(opts);

  // The docs tree → prose pages at clean (unprefixed) slugs; `docGroups` orders
  // the doc-group sidebar sections, `defaultDocGroup` labels ungrouped docs. The
  // reads were started in the kickoff above (the bridge is the sanctioned I/O
  // layer; setu stays disk-free), so this stage just awaits the now-overlapped
  // work — narrated as a single step.
  const { sources, docs, docImageFiles, inlineSvgs } = await progress.stage(
    'Reading sources & docs',
    async () => {
      const [srcs, rawDocs] = await Promise.all([sourcesPromise, docsPromise]);
      // Route the local images those docs reference through the content-hashed
      // `_assets/` pipeline (copy + rewrite the src), so they cache-bust like the
      // logo and custom assets. SVGs are additionally collected as inline markup
      // so render() can drop them into the page (theme-toggle-aware) — see
      // RenderOptions.inlineSvgs.
      const resolved = docsDir
        ? await resolveDocImages(rawDocs, docsDir)
        : { docs: rawDocs, files: [], inlineSvgs: {} };
      return {
        sources: srcs,
        docs: resolved.docs,
        docImageFiles: resolved.files,
        inlineSvgs: resolved.inlineSvgs,
      };
    }
  );

  const docGroups = normalizeDocGroups(opts.docGroups);
  const defaultDocGroup =
    typeof opts.defaultDocGroup === 'string' && opts.defaultDocGroup.trim().length > 0
      ? opts.defaultDocGroup.trim()
      : undefined;

  // Sidebar config: `menu` (full control) takes precedence over `sectionOrder`.
  // Each accepts only well-formed input; anything else falls back to defaults.
  const sectionOrder = normalizeSectionOrder(opts.sectionOrder);
  const menu = normalizeMenu(opts.menu);
  const clubSidebarItems = opts.clubSidebarItems === true;

  const manifest = await progress.stage('Generating pages', () =>
    generateSite(data, {
      ...(pkg ? { pkg } : {}),
      ...(readme ? { readme } : {}),
      ...(tutorialTree.length > 0 ? { tutorials: tutorialTree } : {}),
      ...(sources.length > 0 ? { sources } : {}),
      ...(sources.length > 0 && sourceLinkToComment ? { sourceLinkToComment } : {}),
      ...(docs.length > 0 ? { docs } : {}),
      ...(docGroups ? { docGroups } : {}),
      ...(defaultDocGroup ? { defaultDocGroup } : {}),
      ...(sectionOrder ? { sectionOrder } : {}),
      ...(menu ? { menu } : {}),
      ...(clubSidebarItems ? { clubSidebarItems } : {}),
    })
  );

  // Localization extract mode (aadesh, Phase 3): when CLEAN_JSDOC_THEME_EXTRACT
  // names a path, write the translatable slot template there and STOP — skipping
  // the expensive render/island-bundle/Pagefind. aadesh spawns jsdoc with this
  // env var set to harvest the template, then drives the per-locale builds.
  const extractPath = process.env.CLEAN_JSDOC_THEME_EXTRACT?.trim();
  if (extractPath) {
    const target = resolvePath(extractPath);
    await progress.stage('Writing extract manifest', async () => {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, JSON.stringify(toExtractManifest(manifest), null, 2) + '\n', 'utf8');
    });
    console.log(
      `clean-jsdoc-theme: extract mode — wrote ${manifest.slots?.length ?? 0} slot(s) to ${target}`
    );
    return;
  }

  // Resolve siteName (text or logo set) and copy any local logo images into the
  // output before render, so the served paths are baked into the markup. The
  // shape was already validated above; `prepareSiteName` now only does the
  // local-logo file-copy I/O on the validated value.
  const { siteName, files: logoFiles } = await prepareSiteName(value.siteName, hrefForServed);

  // Resilient font fallback: a family flagged `fonts/not-google` is dropped so
  // `resolveTheme` falls back to the default for that slot (the error was
  // already reported in the diagnostics block). Verified/unverified families
  // pass through.
  const notGoogle = new Set(
    diagnostics.list
      .filter((d) => d.code === 'fonts/not-google' && d.path)
      .map((d) => d.path as string)
  );
  const fonts: ValidatedFonts = { ...value.fonts };
  if (notGoogle.has('fonts.heading')) delete fonts.heading;
  if (notGoogle.has('fonts.body')) delete fonts.body;

  // Custom CSS/JS (v4 parity): inline strings pass through; custom files are
  // copied AS-IS to content-hashed `_assets` here (the I/O layer) and merged onto
  // the theme as hrefs, so dwar links them while render() stays pure. Empty/unset
  // → no fields added, so behavior is unchanged when unused.
  const customAssets = await resolveCustomAssets(opts, hrefForServed);

  const absoluteDestination = resolvePath(destination);
  // Cache the island esbuild bundle across builds — see RenderOptions.islandCacheDir;
  // the dev/watch loop reuses it when rang/dwar are unchanged.
  const islandCacheDir = resolvePath(process.cwd(), 'node_modules', '.cache', 'clean-jsdoc-theme');
  const result = await progress.stage('Rendering site', () =>
    render(manifest, {
      theme: { ...resolveTheme(opts, siteName, fonts, basePath), ...customAssets.theme },
      destination: absoluteDestination,
      islandCacheDir,
      inlineSvgs,
    })
  );

  const outputFiles = [...result.files, ...logoFiles, ...customAssets.files, ...docImageFiles];
  await progress.stage('Writing files', () => writeOutputFiles(absoluteDestination, outputFiles));

  // Next.js-style build report: where the files landed, page/asset counts, and
  // per-route sizes (+ gzip). `node:zlib` is injected here as the gzip sizer so
  // utils stays node-free. Replaces the old single `rendered N page(s)…` line.
  const zlib = await import('node:zlib');
  const gzipSizer = (b: Uint8Array | string): number => zlib.gzipSync(b).length;
  console.log(
    formatBuildReport({
      files: outputFiles,
      stats: result.stats,
      destination,
      gzipSizer,
      color,
    })
  );

  // Skipped pages (render failures) are folded in right after the report so the
  // count is visible alongside the successful totals — never fatal.
  if (result.errors && result.errors.length > 0) {
    console.warn(
      `clean-jsdoc-theme: ${result.errors.length} page(s) failed to render and were skipped:`
    );
    for (const e of result.errors) {
      console.warn(`  - ${e.slug}: ${e.message}`);
    }
  }

  // Pagefind is optional; if the user doesn't have it installed we don't
  // want to fail the whole build. Surface the failure as a warning (the stage
  // marks ✗, then this note clarifies it's non-fatal).
  try {
    await progress.stage('Indexing search (pagefind)', () =>
      runPagefindAgainstDir(absoluteDestination)
    );
  } catch (err) {
    console.warn(`clean-jsdoc-theme: pagefind step skipped (optional) — ${(err as Error).message}`);
  }
}
