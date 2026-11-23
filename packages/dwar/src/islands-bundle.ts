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
 *
 * With `cacheDir`, the result is cached on disk and reused only while the
 * files it was built from are unchanged and its package imports still resolve
 * to the same directories — see `islands-cache.ts`.
 *
 * If esbuild fails — it can't start (its platform binary is missing or
 * blocked) or the build itself errors — the returned promise rejects with an
 * error that names this step and keeps esbuild's error as its `cause` (#371).
 */

import { fileURLToPath } from 'node:url';
import { dirname, basename, join, resolve } from 'node:path';
import {
  build,
  version as esbuildVersion,
  type BuildOptions,
  type BuildResult,
  type Plugin,
} from 'esbuild';
import type { IslandName } from '@clean-jsdoc-theme/utils';
import { getIslandChunkEntrySource } from './islands-loader';
import {
  collectCacheInputs,
  collectResolutionEdges,
  ISLAND_VIRTUAL_NAMESPACE,
  islandCacheFileName,
  readIslandCache,
  writeIslandCache,
} from './islands-cache';

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
  'playground',
  'tabs',
  // NB: `language-switcher` is intentionally NOT here — it's bundled only for a
  // localized build (render() adds it when opts.locale is set), so a normal
  // build's `_islands/` output stays byte-identical.
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
   * Optional directory for an on-disk cache of the bundle. The cache file is
   * named by a pre-key (esbuild version + options, outDir, resolveDir, island
   * entry sources) and records what the bundle was built from: each bundled
   * `@clean-jsdoc-theme/*` / workspace file by content hash, each third-party
   * package by its package.json, and where every package import resolved. A
   * warm rebuild skips esbuild only while all of them are unchanged (see
   * `islands-cache.ts` for the limits).
   * Fully resilient: any cache read/write error silently falls back to a fresh
   * build — caching never throws out of `bundleIslands`.
   */
  cacheDir?: string;
}

// The esbuild options that don't vary per call. Shared by the build and the
// cache pre-key so a change to either can't drift from the other.
const STATIC_BUILD_OPTIONS = {
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  sourcemap: false,
  platform: 'browser',
  // With virtual namespace entries `island:sidebar`, `[name]` resolves to
  // `sidebar`, so entry chunks land at `sidebar-<hash>.js`; the shared code
  // esbuild splits out lands at `chunk-<hash>.js`.
  entryNames: '[name]-[hash]',
  chunkNames: 'chunk-[hash]',
} as const satisfies BuildOptions;

export async function bundleIslands(opts: BundleIslandsOptions = {}): Promise<BundleIslandsResult> {
  const outDir = (opts.outDir ?? '_islands').replace(/\/$/, '');
  const resolveDir = opts.resolveDir ?? DWAR_PACKAGE_DIR;
  const names = opts.islands ?? ALL_ISLANDS;

  // Pinned explicitly so the metafile's relative input paths can be resolved
  // back to files for the cache manifest. (esbuild's own default is the cwd
  // captured when esbuild was first loaded; it differs only if the process
  // chdir'd since, and the working dir feeds esbuild's output hashes.)
  const absWorkingDir = process.cwd();

  // Opt-in cross-build cache (see islands-cache.ts). The file name is a
  // pre-key over the build configuration; inside, a manifest of the previous
  // build's inputs is re-hashed and must match exactly for a hit. Everything
  // cache-related is best-effort: any error falls through to a fresh build,
  // and a write failure never breaks the build. Without `cacheDir`, this is
  // all skipped and bundleIslands stays pure (no fs touch).
  let cacheFile: string | undefined;
  if (opts.cacheDir) {
    try {
      cacheFile = join(
        opts.cacheDir,
        islandCacheFileName({
          esbuildVersion,
          buildOptions: STATIC_BUILD_OPTIONS,
          outDir,
          resolveDir: resolve(resolveDir),
          entries: names.map((name) => ({ name, source: getIslandChunkEntrySource(name) })),
        })
      );
      const hit = await readIslandCache(cacheFile);
      if (hit) return hit;
    } catch {
      // Miss or any error: fall through to a fresh build below.
    }
  }

  // The entry sources are in-memory strings, not files on disk. We feed them to
  // esbuild as virtual `island:<name>` entry points: `onResolve` strips the
  // prefix and tags the path with our namespace, `onLoad` returns the source.
  // `resolveDir` on the load result is what lets the source's bare imports
  // (`preact`, `@clean-jsdoc-theme/rang`) resolve against dwar's node_modules.
  const NS = ISLAND_VIRTUAL_NAMESPACE;
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

  let buildResult: BuildResult<{ write: false; metafile: true }>;
  try {
    buildResult = await build({
      // Object entry points let us pin each output's `[name]` to the bare island
      // name (`sidebar`), instead of esbuild deriving it from the virtual
      // `island:sidebar` specifier (which would yield `island_sidebar`).
      entryPoints: names.map((n) => ({ in: `island:${n}`, out: n })),
      ...STATIC_BUILD_OPTIONS,
      absWorkingDir,
      logLevel: 'silent',
      write: false,
      outdir: outDir,
      metafile: true,
      plugins: [plugin],
    });
  } catch (err) {
    throw islandBundleError(err);
  }

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

  // Populate the cache on a successful build, recording every bundled input.
  // Best-effort: a write failure (read-only dir, race) must never break the
  // build.
  if (cacheFile) {
    try {
      const inputs = collectCacheInputs(Object.keys(buildResult.metafile.inputs), absWorkingDir);
      const edges = collectResolutionEdges(buildResult.metafile.inputs, absWorkingDir, resolveDir);
      await writeIslandCache(cacheFile, inputs, edges, result);
    } catch {
      // Ignore — the build result is still returned; we just didn't cache it.
    }
  }

  return result;
}

/**
 * The error a failed esbuild run turns into: it names the step, so a build log
 * doesn't end in a bare `spawn UNKNOWN` or `The service was stopped`, and
 * keeps esbuild's error as `cause`. A build failure (esbuild ran and reported
 * errors) carries an `errors` array; anything else means esbuild itself could
 * not run, so add the usual fix.
 */
function islandBundleError(err: unknown): Error {
  const original = err instanceof Error ? err.message : String(err);
  const ran =
    typeof err === 'object' && err !== null && Array.isArray((err as { errors?: unknown }).errors);
  const hint = ran
    ? ''
    : ' (esbuild itself could not run: its platform binary, the optional dependency ' +
      `\`@esbuild/${process.platform}-${process.arch}\`, may be missing or blocked; ` +
      'reinstall dependencies with optional dependencies enabled)';
  return new Error(
    `clean-jsdoc-theme: could not bundle the interactive components (islands) with esbuild: ${original}${hint}`,
    { cause: err }
  );
}

export { ALL_ISLANDS };
