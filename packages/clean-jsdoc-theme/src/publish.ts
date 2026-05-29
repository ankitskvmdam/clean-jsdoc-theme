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
      'try { return import.meta && import.meta.url; } catch { return undefined; }',
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
      '(neither __filename nor import.meta.url resolved).',
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
  throw new Error(
    `clean-jsdoc-theme: could not locate '${name}' on disk starting from ${start}.`,
  );
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
    readFileSync(resolvePath(pkgRoot, 'package.json'), 'utf8'),
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
    `clean-jsdoc-theme: could not determine ESM entry file for '${name}' (no exports/module/main).`,
  );
}

// setu and dwar are ESM-only; JSDoc 4 loads this theme via `require()`, so the
// CJS bundle here can't `require()` them. Dynamic-import a `file://` URL
// instead. The specifier is funneled through a variable so tsup/esbuild don't
// rewrite the dynamic import into a static `require()` during CJS bundling.
async function loadDep<T>(
  name: string,
  requiredExports: readonly string[],
): Promise<T> {
  const entry = resolveEsmEntry(name);
  const id = pathToFileURL(entry).href;
  const mod = (await import(id)) as Record<string, unknown>;
  for (const key of requiredExports) {
    if (typeof mod[key] !== 'function') {
      throw new Error(
        `clean-jsdoc-theme: '${name}' did not export a '${key}' function ` +
          `(resolved from ${entry}; got keys: ${
            Object.keys(mod).join(', ') || '(none)'
          }).`,
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
  [key: string]: unknown;
}

const defaultTheme: ThemeConfig = {
  tokens: {
    colors: {
      bg: '#ffffff',
      bgMuted: '#f3f4f6',
      fg: '#0f172a',
      fgMuted: '#475569',
      accent: '#2563eb',
      accentFg: '#ffffff',
      border: '#e5e7eb',
    },
    fonts: {
      sans: 'system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    shiki: { light: 'github-light', dark: 'github-dark' },
  },
  basePath: '/',
};

// Priority: opts.package file → taffy `kind:'package'` doclet → undefined.
async function resolvePkg(
  data: unknown,
  opts: JSDocOpts,
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
      const pkgDoclets = (
        data as (q: unknown) => { get(): unknown[] }
      )({ kind: 'package' }).get();
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

export async function publish(
  data: unknown,
  opts: JSDocOpts,
  _tutorials?: unknown,
): Promise<void> {
  const destination = opts.destination;
  if (!destination || typeof destination !== 'string') {
    throw new Error(
      'clean-jsdoc-theme publish: opts.destination is required ' +
        '(set "opts.destination" in your jsdoc.json).',
    );
  }

  const [{ generateSite }, { render, runPagefindAgainstDir }] = await Promise.all([
    loadSetu(),
    loadDwar(),
  ]);

  const pkg = await resolvePkg(data, opts);

  const manifest = generateSite(data, pkg ? { pkg } : undefined);

  // dwar's island bundler invokes esbuild without an explicit `resolveDir`,
  // so it defaults to `process.cwd()`. When JSDoc runs from the consumer's
  // project root, that cwd doesn't see the dwar transitive deps (`preact`,
  // `@clean-jsdoc-theme/rang`). Briefly chdir to dwar's own directory while
  // `render()` runs so the bundler walks dwar's `node_modules` instead.
  // Resolve `destination` to an absolute path first so the chdir doesn't
  // affect where output files land.
  const absoluteDestination = resolvePath(destination);
  const dwarDir = resolvePackageDir('@clean-jsdoc-theme/dwar');
  const prevCwd = process.cwd();
  let result;
  try {
    process.chdir(dwarDir);
    result = await render(manifest, {
      theme: defaultTheme,
      destination: absoluteDestination,
    });
  } finally {
    process.chdir(prevCwd);
  }

  await writeOutputFiles(absoluteDestination, result.files);

  // Pagefind is optional; if the user doesn't have it installed we don't
  // want to fail the whole build. Surface the failure as a warning.
  try {
    await runPagefindAgainstDir(absoluteDestination);
  } catch (err) {
    console.warn(
      `clean-jsdoc-theme: pagefind step skipped — ${(err as Error).message}`,
    );
  }
}
