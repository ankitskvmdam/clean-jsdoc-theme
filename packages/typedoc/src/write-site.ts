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
import { readFile } from 'node:fs/promises';
import { extname, resolve as resolvePath } from 'node:path';
import salty from '@jsdoc/salty';
import { generateSite } from '@clean-jsdoc-theme/setu';
import type { SourceFileInput } from '@clean-jsdoc-theme/setu';
import { render, runPagefindAgainstDir } from '@clean-jsdoc-theme/dwar';
import type { SiteManifest, ThemeConfig } from '@clean-jsdoc-theme/dwar';
import type { Application, ProjectReflection } from 'typedoc';
import type { TDoclet } from '@clean-jsdoc-theme/utils';
import { reflectionsToDoclets } from './reflection-to-doclets';
import { markdownToHtml, partsToMarkdown } from './comment';
import { writeOutputFiles } from './write-output-files';

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
 * Resolve the theme for a render. v1 returns the defaults unchanged; phase 4
 * threads in the `cleanJsdocTheme` option block (siteName / fonts / sidebar).
 * Kept as a pure helper so phase 4 can layer overrides without touching the
 * pipeline.
 */
function resolveTheme(): ThemeConfig {
  return defaultTheme;
}

/** Render the project README (`CommentDisplayPart[]`) to an HTML home page. */
function renderReadme(project: ProjectReflection): string | undefined {
  const parts = project.readme;
  if (!parts || parts.length === 0) return undefined;
  const html = markdownToHtml(partsToMarkdown(parts));
  return html || undefined;
}

/** Extensions we treat as "source" worth emitting a viewer page for. */
const SOURCE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.mts', '.cts', '.tsx',
]);

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
        : segs[segs.length - 1] ?? absPaths[i];
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
  logger: AdaptApp['logger'],
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
        `[clean-jsdoc-theme] could not read source file '${abs}' — ${(err as Error).message}; skipping.`,
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

  if (typeof project.packageName === 'string' && project.packageName) pkg.name = project.packageName;
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

/** The slice of the TypeDoc `Application` this writer needs (just the logger). */
type AdaptApp = Pick<Application, 'logger'>;

/**
 * Output writer registered via `app.outputs.addOutput('clean-jsdoc-theme', …)`.
 * `outDir` is the resolved-by-TypeDoc destination for this output spec.
 */
export async function writeSite(
  outDir: string,
  project: ProjectReflection,
  app: AdaptApp,
): Promise<void> {
  const destination = resolvePath(outDir);
  const logger = app.logger;

  // Adapt → flat doclets → salty collection (the same shape setu consumes from
  // the JSDoc path).
  const doclets = reflectionsToDoclets(project, logger);
  const collection = salty.taffy(doclets);

  const readme = renderReadme(project);
  const pkg = await resolvePkg(project);
  const sources = await collectSourceFiles(doclets, logger);

  const manifest = generateSite(collection, {
    ...(pkg ? { pkg } : {}),
    ...(readme ? { readme } : {}),
    ...(sources.length > 0 ? { sources } : {}),
  });

  const result = await render(manifest, { theme: resolveTheme(), destination });
  await writeOutputFiles(destination, result.files);

  logger.info(
    `[clean-jsdoc-theme] wrote ${result.stats.pageCount} page(s) ` +
      `(${result.stats.assetCount} asset(s)) to ${destination}`,
  );

  // Render failures are reported, never thrown — the rest of the site is intact.
  if (result.errors && result.errors.length > 0) {
    logger.warn(
      `[clean-jsdoc-theme] ${result.errors.length} page(s) failed to render and were skipped:`,
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
