/**
 * Bundle all island entry points in ONE split esbuild build.
 *
 * Strategy: a single `esbuild.build()` with `splitting: true` and every island
 * as an entry point. esbuild hoists code shared across entries (Preact, the
 * rang registry, shared helpers) into a separate `chunk-<hash>.js` that every
 * entry imports via relative ESM, instead of inlining the runtime into each of
 * the 12 chunks. That cut the emitted `_islands/` payload from ~4.74 MB (12
 * self-contained bundles) to ~0.40 MB (entries + one shared chunk).
 *
 * Every emitted file is content-hashed (`[name]-[hash].js`) so chunks
 * cache-bust independently. Callers thread the resulting name → href map
 * through to the loader (the entry filenames are no longer predictable).
 *
 * Inputs are virtual entry files (in-memory strings), so a tiny esbuild plugin
 * resolves the `island:<name>` entry specifiers and loads each one's source —
 * the chunks import `@clean-jsdoc-theme/rang` and `preact` from dwar's own
 * node_modules (via `resolveDir`) without writing any files to disk.
 */

import { fileURLToPath } from 'node:url';
import { dirname, basename, join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build, type Plugin } from 'esbuild';
import type { IslandName } from '@clean-jsdoc-theme/utils';
import { getIslandChunkEntrySource } from './islands-loader';

// Anchor esbuild's module resolution at dwar's own package directory so it
// walks dwar's node_modules tree — preact and @clean-jsdoc-theme/rang are
// dwar's deps, not the consumer's, so they live here regardless of cwd.
const DWAR_PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));

const ALL_ISLANDS: IslandName[] = [
  'sidebar',
  'mobile-nav',
  'toc',
  'toc-mobile',
  'cmdk',
  'code-tabs',
  'copy-btn',
  'copy-page',
  'theme-toggle',
  'settings',
  'code-viewer',
  'embed',
  'tabs',
];

export interface IslandChunkFile {
  /** Forward-slash relative path, e.g. `_islands/sidebar-A1B2C3D4.js`. */
  path: string;
  contents: string;
  byteSize: number;
}

export interface BundleIslandsResult {
  /** All emitted output files: entry chunks + the shared chunk(s). */
  files: IslandChunkFile[];
  /** Map from island name to its emitted (content-hashed) entry chunk path. */
  entryPaths: Record<IslandName, string>;
}

export interface BundleIslandsOptions {
  /** Path prefix for emitted chunks (default `_islands`). */
  outDir?: string;
  /** esbuild's resolve base. Defaults to dwar's own package directory. */
  resolveDir?: string;
  /** Restrict bundling to the islands actually used (optimization). */
  islands?: IslandName[];
  /**
   * Optional directory for an on-disk cache of the bundle. When set, the result
   * is read/written from a file keyed on a content hash of the bundle's inputs
   * (rang's compiled `dist/index.js` + the island entry sources + the preact
   * version), so a warm rebuild with unchanged inputs skips esbuild entirely.
   * Fully resilient: any cache read/write/key error silently falls back to a
   * fresh build — caching never throws out of `bundleIslands`.
   */
  cacheDir?: string;
}

// Resolve sibling packages (rang, preact) against dwar's own module graph, not
// the consumer's — they're dwar's deps regardless of cwd.
const requireFromHere = createRequire(import.meta.url);

/**
 * Content-hash key for the island bundle. Composed (stable order) of: the
 * concatenated island entry sources (dwar's entry logic), the contents of
 * rang's compiled entry file (every rang component change — rang ships a single
 * bundled file), and the installed preact version. All sibling-package reads
 * are best-effort: a failure substitutes a fixed marker rather than throwing,
 * so a key is always produced. Over-keying is safe (a spurious miss just
 * rebuilds); under-keying — a stale hit — is the thing the rang-contents term
 * guards against. Returns a short sha256 hex.
 */
function computeCacheKey(names: IslandName[]): string {
  const parts: string[] = [];

  // dwar's island-entry logic: the source each chunk is built from.
  for (const name of names) {
    parts.push(`entry:${name}`);
    parts.push(getIslandChunkEntrySource(name));
  }

  // rang's compiled output (single bundled dist/index.js) — captures any rang
  // component change. Hash its contents, not a version, so editing rang in dev
  // (rebuild) invalidates the key even without a version bump.
  //
  // rang ships an ESM-only `exports` map with no `require`/bare condition, so
  // `resolve('@clean-jsdoc-theme/rang')` throws under the CJS resolver. Resolve
  // its package.json instead (exposed via `exports["./package.json"]`) and read
  // the entry it points at. A bare-`rang` fallback covers a `require`-condition
  // future; only a total failure falls back to the constant (a spurious miss
  // just rebuilds — a stale hit, which this guards against, is the real risk).
  let rangContents = 'rang:unresolved';
  try {
    const pkgPath = requireFromHere.resolve('@clean-jsdoc-theme/rang/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      exports?: { '.'?: { import?: string } };
      module?: string;
      main?: string;
    };
    const entryRel = pkg.exports?.['.']?.import ?? pkg.module ?? pkg.main ?? 'dist/index.js';
    rangContents = readFileSync(join(dirname(pkgPath), entryRel), 'utf8');
  } catch {
    try {
      rangContents = readFileSync(requireFromHere.resolve('@clean-jsdoc-theme/rang'), 'utf8');
    } catch {
      rangContents = 'rang:unresolved';
    }
  }
  parts.push('rang');
  parts.push(rangContents);

  // preact version — guards against a preact bump while rang/dwar are unchanged.
  let preactVersion = 'unknown';
  try {
    preactVersion = (requireFromHere('preact/package.json') as { version?: string }).version ?? 'unknown';
  } catch {
    preactVersion = 'unknown';
  }
  parts.push(`preact:${preactVersion}`);

  return createHash('sha256').update(parts.join('\x00')).digest('hex').slice(0, 16);
}

export async function bundleIslands(
  opts: BundleIslandsOptions = {}
): Promise<BundleIslandsResult> {
  const outDir = (opts.outDir ?? '_islands').replace(/\/$/, '');
  const resolveDir = opts.resolveDir ?? DWAR_PACKAGE_DIR;
  const names = opts.islands ?? ALL_ISLANDS;

  // Opt-in cross-build cache. When `cacheDir` is set, key the bundle on a
  // content hash of its inputs and try to return a cached payload before
  // running esbuild. Everything cache-related is best-effort: any error
  // (key/read/parse/corrupt shape) falls through to a fresh build, and a write
  // failure never breaks the build. Without `cacheDir`, this is all skipped and
  // bundleIslands stays pure (no fs touch) — the unit-test/smoke path.
  let cacheFile: string | undefined;
  if (opts.cacheDir) {
    try {
      const key = computeCacheKey(names);
      cacheFile = join(opts.cacheDir, `islands-${key}.json`);
      const raw = await readFile(cacheFile, 'utf8');
      const parsed = JSON.parse(raw) as BundleIslandsResult;
      // Validate shape — guard against a corrupt/partial cache file.
      if (
        parsed &&
        Array.isArray(parsed.files) &&
        parsed.entryPaths &&
        typeof parsed.entryPaths === 'object'
      ) {
        return parsed;
      }
    } catch {
      // Miss (no file) or any error: fall through to a fresh build below.
    }
  }

  // The entry sources are in-memory strings, not files on disk. We feed them to
  // esbuild as virtual `island:<name>` entry points: `onResolve` strips the
  // prefix and tags the path with our namespace, `onLoad` returns the source.
  // `resolveDir` on the load result is what lets the source's bare imports
  // (`preact`, `@clean-jsdoc-theme/rang`) resolve against dwar's node_modules.
  const NS = 'island-virtual';
  const plugin: Plugin = {
    name: 'island-entries',
    setup(b) {
      b.onResolve({ filter: /^island:/ }, (a) => ({
        path: a.path.slice('island:'.length),
        namespace: NS,
      }));
      b.onLoad({ filter: /.*/, namespace: NS }, (a) => ({
        contents: getIslandChunkEntrySource(a.path as IslandName),
        loader: 'js',
        resolveDir,
      }));
    },
  };

  const buildResult = await build({
    // Object entry points let us pin each output's `[name]` to the bare island
    // name (`sidebar`), instead of esbuild deriving it from the virtual
    // `island:sidebar` specifier (which would yield `island_sidebar`).
    entryPoints: names.map((n) => ({ in: `island:${n}`, out: n })),
    bundle: true,
    splitting: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    sourcemap: false,
    platform: 'browser',
    logLevel: 'silent',
    write: false,
    outdir: outDir,
    // With virtual namespace entries `island:sidebar`, `[name]` resolves to
    // `sidebar`, so entry chunks land at `sidebar-<hash>.js`; the shared code
    // esbuild splits out lands at `chunk-<hash>.js`.
    entryNames: '[name]-[hash]',
    chunkNames: 'chunk-[hash]',
    metafile: true,
    plugins: [plugin],
  });

  // outputFile.path is OS-absolute (and back-slashed on Windows), so re-derive
  // the forward-slash relative path from the basename. file.contents is a
  // Uint8Array — its byteLength is the true on-disk size.
  const files: IslandChunkFile[] = (buildResult.outputFiles ?? []).map((file) => ({
    path: `${outDir}/${basename(file.path)}`,
    contents: file.text,
    byteSize: file.contents.byteLength,
  }));

  // Map each island name to its emitted entry chunk path. metafile output keys
  // use forward slashes and carry the outdir prefix; their `.entryPoint` is the
  // namespaced specifier (`island-virtual:sidebar`) — split off the name.
  const entryPaths = {} as Record<IslandName, string>;
  for (const [key, output] of Object.entries(buildResult.metafile?.outputs ?? {})) {
    if (!output.entryPoint) continue;
    const name = output.entryPoint.split(':').pop() as IslandName;
    entryPaths[name] = `${outDir}/${key.split('/').pop()}`;
  }

  const result: BundleIslandsResult = { files, entryPaths };

  // Populate the cache on a successful build. Best-effort: a write failure
  // (read-only dir, race) must never break the build.
  if (cacheFile) {
    try {
      await mkdir(opts.cacheDir!, { recursive: true });
      await writeFile(cacheFile, JSON.stringify(result));
    } catch {
      // Ignore — the build result is still returned; we just didn't cache it.
    }
  }

  return result;
}

export { ALL_ISLANDS };
