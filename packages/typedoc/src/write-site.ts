/**
 * The TypeDoc output writer: the `addOutput` callback that turns a
 * `ProjectReflection` into a real clean-jsdoc-theme site.
 *
 * Pipeline (mirrors the JSDoc bridge's `publish.ts`, but ESM all the way so setu
 * / dwar / utils are imported directly):
 *
 *   reflections → `reflectionsToDoclets` → `salty.taffy` → `generateSite`
 *               → `render` → `writeOutputFiles` → (optional) Pagefind
 *
 * Phase 3 wires the core end-to-end with sensible theme defaults. The
 * `cleanJsdocTheme` option block (siteName / fonts / sidebar) is phase 4 — here
 * the defaults from the JSDoc bridge are copied verbatim (the small pure helpers
 * only; we never cross-import the bridge package).
 */
import { gzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';
import type { MenuItem, PlaygroundSiteConfig, SourceFileInput } from '@clean-jsdoc-theme/setu';
import { render, runPagefindAgainstDir } from '@clean-jsdoc-theme/dwar';
import type {
  CopyPageAction,
  CopyPageConfig,
  PageNavConfig,
  MetaTag,
  SiteManifest,
  SiteName,
  ThemeConfig,
} from '@clean-jsdoc-theme/dwar';
import type { Application, ProjectReflection } from 'typedoc';
import {
  createGoogleFontResolver,
  formatBuildReport,
  formatDiagnostics,
  toExtractManifest,
  validateThemeOpts,
} from '@clean-jsdoc-theme/utils';
import type { FontSet, PlaygroundProvider, TDoclet, ValidatedFonts } from '@clean-jsdoc-theme/utils';
import { reflectionsToDoclets } from './reflection-to-doclets';
import { markdownToHtml, partsToMarkdown } from './comment';
import { writeOutputFiles } from './write-output-files';
import { KNOWN_NON_THEME_KEYS, readThemeOption } from './options';
import type { CleanJsdocThemeBlock } from './options';

/**
 * Default theme — copied from the JSDoc bridge (`publish.ts`). OKLCH light/dark
 * palettes + Google-Font heading/body and a CSS mono stack. v1 defaults; the
 * full option block (siteName/fonts overrides) lands in phase 4.
 */
const defaultTheme: ThemeConfig = {
  tokens: {
    colors: {
      bg: 'oklch(0.9924 0.0079 106.54)',
      bgMuted: 'oklch(0.9595 0.0079 106.55)',
      fg: 'oklch(0.3639 0 0)',
      fgMuted: 'oklch(0.5278 0 0)',
      accent: 'oklch(0 0 0)',
      accentFg: 'oklch(1 0 0)',
      border: 'oklch(0.9561 0 0)',
    },
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
 * Resolve the theme for a render by layering the validated `cleanJsdocTheme`
 * block over the defaults — only the keys the user supplies are overridden.
 * `siteName` is the validated value; `fonts` is the validated subset (a family
 * flagged `fonts/not-google` is dropped upstream so the default applies);
 * `aiPrompt`/`copyPage` come straight off the block. Mirrors the JSDoc bridge's
 * `resolveTheme`.
 */
/**
 * Resolve the font triple for the active `locale`: a per-locale override wins,
 * then the base font, then the theme default — per slot. With no locale (the
 * current TypeDoc path, which has no localized-build mode yet) only the base +
 * default apply. Mirrors the JSDoc bridge's `resolveFontSet`.
 */
function resolveFontSet(fonts: ValidatedFonts, locale: string | undefined) {
  const base = defaultTheme.tokens.fonts;
  const override = (locale && fonts.locales?.[locale]) || {};
  return {
    heading: override.heading ?? fonts.heading ?? base.heading,
    body: override.body ?? fonts.body ?? base.body,
    mono: override.mono ?? fonts.mono ?? base.mono,
  };
}

function resolveTheme(
  block: CleanJsdocThemeBlock,
  siteName: SiteName | undefined,
  fonts: ValidatedFonts,
  locale?: string
): ThemeConfig {
  const aiPrompt =
    typeof block.aiPrompt === 'string' && block.aiPrompt.trim() ? block.aiPrompt.trim() : undefined;
  const copyPage = normalizeCopyPage(block.copyPage);
  const pageNav = normalizePageNav(block.pageNav);
  const playground = normalizePlayground(block.playground);

  return {
    ...defaultTheme,
    ...(aiPrompt ? { aiPrompt } : {}),
    ...(copyPage ? { copyPage } : {}),
    ...(pageNav ? { pageNav } : {}),
    ...(playground ? { playground: playground.theme } : {}),
    tokens: {
      ...defaultTheme.tokens,
      fonts: resolveFontSet(fonts, locale),
      ...(siteName ? { siteName } : {}),
    },
  };
}

/**
 * Validate `block.sectionOrder` into a clean `string[]`, or `undefined` to fall
 * back to setu's default order. Accepts only an array; trims string entries and
 * drops non-strings/empties. Copied from the JSDoc bridge's `normalizeSectionOrder`.
 */
function normalizeSectionOrder(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return out.length > 0 ? out : undefined;
}

/**
 * Validate `block.menu` into a clean `MenuItem[]`, or `undefined` when there's no
 * usable menu. Copied from the JSDoc bridge's `normalizeMenu`: the link URL is
 * read from `link` (preferred) or `href`; only entries with an `id` or a link
 * survive.
 */
function normalizeMenu(raw: unknown): MenuItem[] | undefined {
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

/** Valid copy-page dropdown actions (mirrors dwar's `CopyPageAction`). */
const COPY_PAGE_ACTIONS: readonly CopyPageAction[] = [
  'copy',
  'view',
  'claude',
  'chatgpt',
  'perplexity',
];

/**
 * Validate `block.copyPage` into a {@link CopyPageConfig}, or `undefined` for the
 * defaults (enabled, all actions). Copied from the JSDoc bridge's
 * `normalizeCopyPage`: a boolean shorthand (`false` hides the button) or an
 * object whose `actions` are filtered to the known ids (order preserved).
 */
function normalizeCopyPage(raw: unknown): CopyPageConfig | undefined {
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
 * Validate `block.pageNav` into a {@link PageNavConfig}, or `undefined` for the
 * default (enabled). Copied from the JSDoc bridge's `normalizePageNav`: a boolean
 * shorthand (`false` hides the pager) or an object whose `enabled` is read.
 */
function normalizePageNav(raw: unknown): PageNavConfig | undefined {
  if (raw === false) return { enabled: false };
  if (raw === true || raw == null) return undefined;
  if (typeof raw !== 'object') return undefined;
  const enabled = (raw as Record<string, unknown>).enabled;
  return typeof enabled === 'boolean' ? { enabled } : undefined;
}

/** Valid code-playground providers (mirrors utils' `PlaygroundProvider`). */
const PLAYGROUND_PROVIDERS: readonly PlaygroundProvider[] = ['codepen', 'jsfiddle', 'codesandbox'];

/** A site-wide per-provider options record, or `undefined` for a non-object. */
function playgroundOptionRecord(raw: unknown): Record<string, unknown> | undefined {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : undefined;
}

/**
 * Validate `block.playground` into its two consumer slices, or `undefined` when
 * off (absent or `false`). `true`/`{}` turns it on with defaults. The `site`
 * slice feeds setu's `@playground` resolver; the `theme` slice becomes
 * `ThemeConfig.playground`. Copied from the JSDoc bridge's `normalizePlayground`
 * (the two bridges don't cross-import).
 */
function normalizePlayground(
  raw: unknown
): { site: PlaygroundSiteConfig; theme: NonNullable<ThemeConfig['playground']> } | undefined {
  if (raw == null || raw === false) return undefined;
  const o = raw === true ? {} : raw;
  if (typeof o !== 'object' || Array.isArray(o)) return undefined;
  const obj = o as Record<string, unknown>;

  const site: PlaygroundSiteConfig = {};
  if (obj.enableForAllExamples === true) site.enableForAllExamples = true;
  if (Array.isArray(obj.providers)) {
    const providers: PlaygroundProvider[] = [];
    for (const p of obj.providers) {
      if (
        typeof p === 'string' &&
        (PLAYGROUND_PROVIDERS as readonly string[]).includes(p) &&
        !providers.includes(p as PlaygroundProvider)
      ) {
        providers.push(p as PlaygroundProvider);
      }
    }
    if (providers.length > 0) site.providers = providers;
  }

  const theme: NonNullable<ThemeConfig['playground']> = { enabled: true };
  const codepen = playgroundOptionRecord(obj.codepen);
  const jsfiddle = playgroundOptionRecord(obj.jsfiddle);
  const codesandbox = playgroundOptionRecord(obj.codesandbox);
  if (codepen) theme.codepen = codepen;
  if (jsfiddle) theme.jsfiddle = jsfiddle;
  if (codesandbox) theme.codesandbox = codesandbox;

  return { site, theme };
}

/**
 * Resolve the `footer` block option (inline HTML `string` | `{ file }`) into the
 * single `ThemeConfig.footer` string. The `{ file }` form is read from disk here
 * (the bridge is the I/O layer, so dwar's `render()` stays pure). A
 * missing/unreadable file is warned about and dropped; an empty value → the
 * default footer. Mirrors the JSDoc bridge's `resolveFooter`.
 */
async function resolveFooter(
  raw: unknown,
  logger: AdaptApp['logger']
): Promise<string | undefined> {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (raw && typeof raw === 'object' && typeof (raw as { file?: unknown }).file === 'string') {
    const file = (raw as { file: string }).file.trim();
    if (!file) return undefined;
    try {
      const html = await readFile(resolvePath(file), 'utf8');
      return html.trim().length > 0 ? html : undefined;
    } catch {
      logger.warn(
        `[clean-jsdoc-theme] could not read footer file ('${file}'); omitting the custom footer.`
      );
      return undefined;
    }
  }
  return undefined;
}

/** Attributes that identify a `<meta>` tag (so an entry must carry at least one). */
const META_IDENTITY_ATTRS = ['name', 'property', 'http-equiv', 'charset', 'itemprop'] as const;

/**
 * Validate `block.meta` into a clean `MetaTag[]`, or `undefined` when there's
 * nothing usable. Mirrors the JSDoc bridge's `normalizeMeta`: keeps string→string
 * pairs (trimmed; finite numbers coerced), drops an entry with no identifying
 * attribute (warned). dwar does the final escaping + key validation.
 */
function normalizeMeta(raw: unknown, logger: AdaptApp['logger']): MetaTag[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: MetaTag[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const o = entry as Record<string, unknown>;
    const tag: MetaTag = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') {
        const t = v.trim();
        if (t.length > 0) tag[k] = t;
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        tag[k] = String(v);
      }
    }
    const hasIdentity = META_IDENTITY_ATTRS.some((a) => typeof tag[a] === 'string');
    if (!hasIdentity || Object.keys(tag).length === 0) {
      logger.warn(
        `[clean-jsdoc-theme] skipping a meta entry with no usable name/property/http-equiv/charset attribute (${JSON.stringify(entry)}).`
      );
      continue;
    }
    out.push(tag);
  }
  return out.length > 0 ? out : undefined;
}

/** A logo value that's already a servable URL/URI needs no copying. */
function isServableUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || /^data:/i.test(value);
}

/**
 * Resolve a validated `siteName` into a render-ready value plus any local logo
 * images to write. A string passes through. For a logo set, each local image
 * path is read and emitted as an asset (`_assets/logo-<key><ext>`) with its value
 * rewritten to the served path; `http(s)://`/`data:` pass through. A path that
 * can't be read is left verbatim with a warning — never fatal. Mirrors the JSDoc
 * bridge's `prepareSiteName`.
 */
async function prepareSiteName(
  raw: SiteName | undefined,
  logger: AdaptApp['logger']
): Promise<{ siteName: SiteName | undefined; files: { path: string; contents: Buffer }[] }> {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return { siteName: trimmed.length > 0 ? trimmed : undefined, files: [] };
  }
  if (!raw || typeof raw !== 'object') return { siteName: undefined, files: [] };

  const files: { path: string; contents: Buffer }[] = [];
  const out: Record<string, string> = {};
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
      logger.warn(
        `[clean-jsdoc-theme] could not read logo image for siteName.${key} ('${v}'); using it verbatim.`
      );
      out[key] = v;
    }
  }

  const hasContent = out.default || out.dark || out.light || out.alt;
  return { siteName: hasContent ? (out as SiteName) : undefined, files };
}

/** Render the project README (`CommentDisplayPart[]`) to an HTML home page. */
function renderReadme(project: ProjectReflection): string | undefined {
  const parts = project.readme;
  if (!parts || parts.length === 0) return undefined;
  const html = markdownToHtml(partsToMarkdown(parts));
  return html || undefined;
}

/** Extensions we treat as "source" worth emitting a viewer page for. */
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx']);

/**
 * Compute project-relative paths for a set of absolute source paths by stripping
 * their longest common directory prefix. Copied from the JSDoc bridge: Windows-
 * aware (splits on `/` and `\\`, case-insensitive segment compare), single-file
 * → basename, no common prefix → per-file basename.
 */
function computeRelPaths(absPaths: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  if (absPaths.length === 0) return out;

  const split = (p: string): string[] => p.split(/[\\/]+/).filter((s) => s.length > 0);
  const segLists = absPaths.map(split);

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
 * contents into {@link SourceFileInput}s for setu. Mirrors the JSDoc bridge's
 * `collectSourceFiles`, but keys off the in-memory doclet array directly (the
 * adapter already wrote `meta.path`/`meta.filename` so `resolve(path, filename)`
 * is the real on-disk file). Files that can't be read are warned + skipped —
 * never fatal. Sorted by `relPath` for stable output.
 */
async function collectSourceFiles(
  doclets: readonly TDoclet[],
  logger: AdaptApp['logger']
): Promise<SourceFileInput[]> {
  const absSet = new Set<string>();
  for (const d of doclets) {
    const meta = d.meta;
    if (!meta || typeof meta.path !== 'string' || typeof meta.filename !== 'string') continue;
    const ext = extname(meta.filename).toLowerCase();
    if (ext.length > 0 && !SOURCE_EXTENSIONS.has(ext)) continue;
    absSet.add(resolvePath(meta.path, meta.filename));
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
      logger.warn(
        `[clean-jsdoc-theme] could not read source file '${abs}' — ${(err as Error).message}; skipping.`
      );
    }
  }

  inputs.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return inputs;
}

/**
 * Resolve `SiteManifest['pkg']` for the project. TypeDoc exposes the package
 * name/version on the project; we read the rest (description / homepage /
 * repository) from `<cwd>/package.json` when present. Missing/unreadable
 * package.json is non-fatal — we still surface whatever the project carries.
 */
async function resolvePkg(project: ProjectReflection): Promise<SiteManifest['pkg'] | undefined> {
  const pkg: NonNullable<SiteManifest['pkg']> = {};

  if (typeof project.packageName === 'string' && project.packageName)
    pkg.name = project.packageName;
  if (typeof project.packageVersion === 'string' && project.packageVersion) {
    pkg.version = project.packageVersion;
  }

  try {
    const raw = JSON.parse(await readFile(resolvePath('package.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    if (!pkg.name && typeof raw.name === 'string') pkg.name = raw.name;
    if (!pkg.version && typeof raw.version === 'string') pkg.version = raw.version;
    if (typeof raw.description === 'string') pkg.description = raw.description;
    if (typeof raw.homepage === 'string') pkg.homepage = raw.homepage;
    if (typeof raw.repository === 'string') {
      pkg.repository = raw.repository;
    } else if (
      raw.repository &&
      typeof raw.repository === 'object' &&
      typeof (raw.repository as { url?: unknown }).url === 'string'
    ) {
      pkg.repository = (raw.repository as { url: string }).url;
    }
  } catch {
    // No readable package.json in cwd — fall back to the project fields only.
  }

  return Object.keys(pkg).length > 0 ? pkg : undefined;
}

/** The slice of the TypeDoc `Application` this writer needs (logger + options). */
type AdaptApp = Pick<Application, 'logger' | 'options'>;

/**
 * Output writer registered via `app.outputs.addOutput('clean-jsdoc-theme', …)`.
 * `outDir` is the resolved-by-TypeDoc destination for this output spec.
 */
export async function writeSite(
  outDir: string,
  project: ProjectReflection,
  app: AdaptApp
): Promise<void> {
  const destination = resolvePath(outDir);
  const logger = app.logger;

  // Read + validate the `cleanJsdocTheme` option block early (before any render
  // work) so problems surface first. It's a dedicated namespace, so `warn-all`
  // is safe — every unrecognized key earns a warning (`strict` excepted). The
  // Google-Font check is the one networked piece, kept behind an injectable
  // resolver in utils; it's fail-open, so an offline build never breaks on it.
  const block = readThemeOption(app);
  const fontResolver = createGoogleFontResolver();
  const { value, diagnostics } = await validateThemeOpts({
    opts: block,
    fontResolver,
    unknownKeyPolicy: 'warn-all',
    knownNonThemeKeys: KNOWN_NON_THEME_KEYS,
  });

  // Strict mode escalates errors (bad font / unknown key) to a hard failure;
  // otherwise (the resilient default) we log and continue.
  const strict = block.strict === true;
  if (diagnostics.list.length > 0) {
    const formatted = formatDiagnostics(diagnostics);
    if (strict && diagnostics.hasErrors()) {
      logger.error(formatted);
      throw new Error(
        '[clean-jsdoc-theme] cleanJsdocTheme validation failed in strict mode ' +
          '(see the diagnostics above). Fix the errors or unset `strict`.'
      );
    }
    logger.info(formatted);
  }

  // Adapt → flat doclets → salty collection (the same shape setu consumes from
  // the JSDoc path).
  const doclets = reflectionsToDoclets(project, logger);
  const collection = salty.taffy(doclets);

  const readme = renderReadme(project);
  const pkg = await resolvePkg(project);
  const sources = await collectSourceFiles(doclets, logger);

  // Sidebar config from the block: `menu` (full control) > `sectionOrder`.
  const sectionOrder = normalizeSectionOrder(block.sectionOrder);
  const menu = normalizeMenu(block.menu);
  const clubSidebarItems = block.clubSidebarItems === true;
  // Enablement slice → setu's `@playground` resolver (runtime slice → the theme).
  const playground = normalizePlayground(block.playground);

  const manifest = generateSite(collection, {
    ...(pkg ? { pkg } : {}),
    ...(readme ? { readme } : {}),
    ...(sources.length > 0 ? { sources } : {}),
    ...(sectionOrder ? { sectionOrder } : {}),
    ...(menu ? { menu } : {}),
    ...(clubSidebarItems ? { clubSidebarItems } : {}),
    ...(playground ? { playground: playground.site } : {}),
  });

  // Localization extract mode (aadesh, Phase 3): when CLEAN_JSDOC_THEME_EXTRACT
  // names a path, write the translatable slot template there and STOP — the same
  // contract as the JSDoc bridge, so aadesh harvests the template identically
  // whichever pipeline produced it.
  const extractPath = process.env.CLEAN_JSDOC_THEME_EXTRACT?.trim();
  if (extractPath) {
    const target = resolvePath(extractPath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(toExtractManifest(manifest), null, 2) + '\n', 'utf8');
    logger.info(
      `clean-jsdoc-theme: extract mode — wrote ${manifest.slots?.length ?? 0} slot(s) to ${target}`
    );
    return;
  }

  // Resolve siteName (text or logo set) + copy any local logo images so the
  // served paths are baked into the markup. The shape was validated above.
  const { siteName, files: logoFiles } = await prepareSiteName(value.siteName, logger);

  // Resilient font fallback: a family flagged `fonts/not-google` is dropped so
  // `resolveTheme` falls back to the default for that slot (the error was
  // already reported above). Verified/unverified families pass through.
  const notGoogle = new Set(
    diagnostics.list
      .filter((d) => d.code === 'fonts/not-google' && d.path)
      .map((d) => d.path as string)
  );
  const fonts: ValidatedFonts = { ...value.fonts };
  if (notGoogle.has('fonts.heading')) delete fonts.heading;
  if (notGoogle.has('fonts.body')) delete fonts.body;
  // Same resilient drop for per-locale fonts (`fonts.ja:heading`).
  if (fonts.locales) {
    const cleaned: Record<string, FontSet> = {};
    for (const [loc, set] of Object.entries(fonts.locales)) {
      const s: FontSet = { ...set };
      if (notGoogle.has(`fonts.${loc}:heading`)) delete s.heading;
      if (notGoogle.has(`fonts.${loc}:body`)) delete s.body;
      cleaned[loc] = s;
    }
    fonts.locales = cleaned;
  }

  // Cache the island esbuild bundle across builds — see RenderOptions.islandCacheDir;
  // the dev/watch loop reuses it when rang/dwar are unchanged.
  const islandCacheDir = resolvePath(process.cwd(), 'node_modules', '.cache', 'clean-jsdoc-theme');
  // Custom footer (v4 parity): inline HTML or `{ file }` read here → resolved
  // string on the theme, so render() stays pure. Unset/empty → default footer.
  const footer = await resolveFooter(block.footer, logger);
  const meta = normalizeMeta(block.meta, logger);
  const result = await render(manifest, {
    theme: {
      ...resolveTheme(block, siteName, fonts),
      ...(footer ? { footer } : {}),
      ...(meta ? { meta } : {}),
    },
    destination,
    islandCacheDir,
  });

  const outputFiles = [...result.files, ...logoFiles];
  await writeOutputFiles(destination, outputFiles);

  // Next.js-style build report: where the files landed, page/asset counts, and
  // per-route sizes (+ gzip). `node:zlib` is fine HERE (the typedoc bridge is a
  // node plugin); utils stays node-free via the injected sizer.
  const gzipSizer = (b: Uint8Array | string): number => gzipSync(b).length;
  logger.info(
    formatBuildReport({
      files: outputFiles,
      stats: result.stats,
      destination,
      gzipSizer,
    })
  );

  // Render failures are reported, never thrown — the rest of the site is intact.
  if (result.errors && result.errors.length > 0) {
    logger.warn(
      `[clean-jsdoc-theme] ${result.errors.length} page(s) failed to render and were skipped:`
    );
    for (const e of result.errors) logger.warn(`  - ${e.slug}: ${e.message}`);
  }

  // Pagefind is optional; a missing/failing Pagefind must not break the build.
  try {
    await runPagefindAgainstDir(destination);
  } catch (err) {
    logger.warn(`[clean-jsdoc-theme] pagefind step skipped — ${(err as Error).message}`);
  }
}
