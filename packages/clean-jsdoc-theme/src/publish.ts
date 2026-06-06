'use strict';

// JSDoc 4 → setu → dwar bridge. `publish(taffyData, opts, tutorials)` is the
// entry JSDoc invokes; everything below orchestrates the four phase packages.

import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import type {
  OutputFile,
  SiteLogo,
  SiteManifest,
  SiteName,
  ThemeConfig,
} from '@clean-jsdoc-theme/dwar';
import type { SourceFileInput, TutorialInput } from '@clean-jsdoc-theme/setu';
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
  exports?:
    | string
    | {
        '.'?:
          | string
          | {
              import?: string | { default?: string };
              default?: string;
            };
      };
}

function resolveEsmEntry(name: string): string {
  const pkgRoot = resolvePackageDir(name);
  const pkg = JSON.parse(
    readFileSync(resolvePath(pkgRoot, 'package.json'), 'utf8')
  ) as MinimalPkgJson;

  const exp = pkg.exports;
  if (exp && typeof exp === 'object') {
    const dot = (exp as { '.'?: unknown })['.'];
    if (typeof dot === 'string') return resolvePath(pkgRoot, dot);
    if (dot && typeof dot === 'object') {
      const imp = (dot as { import?: unknown }).import;
      if (typeof imp === 'string') return resolvePath(pkgRoot, imp);
      if (imp && typeof imp === 'object') {
        const def = (imp as { default?: unknown }).default;
        if (typeof def === 'string') return resolvePath(pkgRoot, def);
      }
      const def = (dot as { default?: unknown }).default;
      if (typeof def === 'string') return resolvePath(pkgRoot, def);
    }
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
   * Project README as HTML. JSDoc renders the Markdown README (`-R`/`opts.readme`
   * or one found in the source paths) and replaces this with the resulting HTML
   * before calling `publish`. Rendered as the site home page.
   */
  readme?: string;
  /** Path to the tutorials directory (`-u`/`opts.tutorials`); resolved tree arrives as the 3rd `publish` arg. */
  tutorials?: string;
  /**
   * JSDoc's default-template source-output toggle. Read from
   * `conf.templates.default.outputSourceFiles` (or, as a fallback, nested under
   * `opts.templates`). Defaults to `true`; set it to `false` to suppress the
   * per-file source viewer pages and the `Source: file:line` member links.
   */
  templates?: { default?: { outputSourceFiles?: unknown } };
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

/**
 * Merge user overrides from `jsdoc.json` (`siteName`, `fonts`) over the
 * defaults. Only the keys the user supplies are overridden; everything else
 * keeps the default theme. `siteName` is pre-resolved by `prepareSiteName`.
 */
function resolveTheme(opts: JSDocOpts, siteName: SiteName | undefined): ThemeConfig {
  const f = opts.fonts;

  return {
    ...defaultTheme,
    tokens: {
      ...defaultTheme.tokens,
      fonts: f
        ? {
            heading: f.heading ?? defaultTheme.tokens.fonts.heading,
            body: f.body ?? defaultTheme.tokens.fonts.body,
            mono: f.mono ?? defaultTheme.tokens.fonts.mono,
          }
        : defaultTheme.tokens.fonts,
      ...(siteName ? { siteName } : {}),
    },
  };
}

/** A logo value that's already a servable URL/URI needs no copying. */
function isServableUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || /^data:/i.test(value);
}

/**
 * Resolve `opts.siteName` into a render-ready value plus any image files to
 * write. A string passes through (trimmed). For a logo set, each local image
 * path is read and emitted as an output asset (`_assets/logo-<key><ext>`) with
 * its value rewritten to the served path; `http(s)://` / `data:` values pass
 * through untouched, and the `alt` label is preserved. A path that can't be
 * read is left verbatim with a warning rather than aborting the build.
 */
async function prepareSiteName(
  raw: string | SiteLogo | undefined,
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
      const served = `_assets/logo-${key}${extname(abs)}`;
      files.push({ path: served, contents: buf });
      out[key] = `/${served}`;
    } catch {
      console.warn(
        `clean-jsdoc-theme: could not read logo image for siteName.${key} ('${v}'); using it verbatim.`,
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

/** Extensions we treat as "source" worth emitting a viewer page for. */
const SOURCE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.mts', '.cts', '.tsx',
]);

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
        : segs[segs.length - 1] ?? absPaths[i];
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
        `clean-jsdoc-theme: could not read source file '${abs}' — ${(err as Error).message}; skipping.`,
      );
    }
  }

  inputs.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return inputs;
}

export async function publish(data: unknown, opts: JSDocOpts, tutorials?: unknown): Promise<void> {
  const destination = opts.destination;
  if (!destination || typeof destination !== 'string') {
    throw new Error(
      'clean-jsdoc-theme publish: opts.destination is required ' +
        '(set "opts.destination" in your jsdoc.json).'
    );
  }

  const [{ generateSite }, { render, runPagefindAgainstDir }] = await Promise.all([
    loadSetu(),
    loadDwar(),
  ]);

  const pkg = await resolvePkg(data, opts);

  // README (rendered to HTML by JSDoc into `opts.readme`) → home page; the
  // tutorials resolver tree → guide pages. Both flow through setu as ordinary
  // pages. Note: local images referenced by README/tutorial Markdown are NOT
  // copied into the output — use absolute/served URLs for those.
  const readme = typeof opts.readme === 'string' && opts.readme.length > 0 ? opts.readme : undefined;
  const tutorialTree = normalizeTutorials(tutorials);

  // Source viewer pages + `Source: file:line` member links. Gated behind
  // JSDoc's `templates.default.outputSourceFiles` (default ON); reading files
  // is optional and self-skips on error, so this never aborts the build.
  const sources = outputSourceFilesEnabled(opts) ? await collectSourceFiles(data) : [];

  const manifest = generateSite(data, {
    ...(pkg ? { pkg } : {}),
    ...(readme ? { readme } : {}),
    ...(tutorialTree.length > 0 ? { tutorials: tutorialTree } : {}),
    ...(sources.length > 0 ? { sources } : {}),
  });

  // Resolve siteName (text or logo set) and copy any local logo images into the
  // output before render, so the served paths are baked into the markup.
  const { siteName, files: logoFiles } = await prepareSiteName(opts.siteName);

  const absoluteDestination = resolvePath(destination);
  const result = await render(manifest, {
    theme: resolveTheme(opts, siteName),
    destination: absoluteDestination,
  });

  if (result.errors && result.errors.length > 0) {
    console.warn(
      `clean-jsdoc-theme: ${result.errors.length} page(s) failed to render and were skipped:`,
    );
    for (const e of result.errors) {
      console.warn(`  - ${e.slug}: ${e.message}`);
    }
  }
  console.log(
    `clean-jsdoc-theme: rendered ${result.stats.pageCount} page(s), ` +
      `${result.stats.assetCount} asset(s)` +
      (sources.length > 0 ? `, ${sources.length} source file(s)` : '') +
      ` → ${destination}`,
  );

  await writeOutputFiles(absoluteDestination, [...result.files, ...logoFiles]);

  // Pagefind is optional; if the user doesn't have it installed we don't
  // want to fail the whole build. Surface the failure as a warning.
  try {
    await runPagefindAgainstDir(absoluteDestination);
  } catch (err) {
    console.warn(`clean-jsdoc-theme: pagefind step skipped — ${(err as Error).message}`);
  }
}
