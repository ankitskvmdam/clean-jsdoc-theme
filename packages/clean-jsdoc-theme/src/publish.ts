'use strict';

// JSDoc 4 → setu → dwar bridge. `publish(taffyData, opts, tutorials)` is the
// entry JSDoc invokes; everything below orchestrates the four phase packages.

import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import type { SiteManifest, ThemeConfig } from '@clean-jsdoc-theme/dwar';
import { writeOutputFiles } from './write-output-files';

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
   * Site name from `jsdoc.json` (`"opts": { "siteName": "..." }`). Shown in the
   * header and appended to each page's `<title>`. Falls back to `pkg.name`.
   */
  siteName?: string;
  /**
   * Font overrides from `jsdoc.json` (`"opts": { "fonts": { ... } }`). Values
   * are Google Fonts family names for `heading`/`body`; `mono` is a CSS stack.
   */
  fonts?: { heading?: string; body?: string; mono?: string };
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
      border: 'oklch(0.9761 0 0)',
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
      border: 'oklch(0.1921 0.004 286.02)',
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
 * keeps the default theme.
 */
function resolveTheme(opts: JSDocOpts): ThemeConfig {
  const f = opts.fonts;
  const siteName =
    typeof opts.siteName === 'string' && opts.siteName.trim().length > 0
      ? opts.siteName
      : undefined;

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

export async function publish(data: unknown, opts: JSDocOpts, _tutorials?: unknown): Promise<void> {
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

  const manifest = generateSite(data, pkg ? { pkg } : undefined);

  const absoluteDestination = resolvePath(destination);
  const result = await render(manifest, {
    theme: resolveTheme(opts),
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
      `${result.stats.assetCount} asset(s) → ${destination}`,
  );

  await writeOutputFiles(absoluteDestination, result.files);

  // Pagefind is optional; if the user doesn't have it installed we don't
  // want to fail the whole build. Surface the failure as a warning.
  try {
    await runPagefindAgainstDir(absoluteDestination);
  } catch (err) {
    console.warn(`clean-jsdoc-theme: pagefind step skipped — ${(err as Error).message}`);
  }
}
