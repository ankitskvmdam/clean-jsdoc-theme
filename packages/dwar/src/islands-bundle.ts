/**
 * Bundle each IslandName into its own ESM chunk via esbuild.
 *
 * Strategy: bundle Preact inline into each chunk (the seven chunks total
 * ~60–90 KB minified, which is acceptable). This avoids the coordination
 * problem of shipping a separate shared runtime that all chunks pin to the
 * same version of.
 *
 * Inputs are virtual entry files (in-memory strings) via esbuild's `stdin`
 * + a tiny resolver plugin so each chunk can import `@clean-jsdoc-theme/rang`
 * and `preact` from the host's node_modules without writing files to disk.
 */

import { build } from 'esbuild';
import type { IslandName } from '@clean-jsdoc-theme/utils';
import { getIslandChunkEntrySource } from './islands-loader';

const ALL_ISLANDS: IslandName[] = [
  'sidebar',
  'toc',
  'cmdk',
  'code-tabs',
  'copy-btn',
  'theme-toggle',
  'mobile-nav',
];

export interface IslandBundleResult {
  name: IslandName;
  /** Forward-slash relative path, e.g. `_islands/sidebar.js`. */
  path: string;
  contents: string;
  byteSize: number;
}

export interface BundleIslandsOptions {
  /** Path prefix for emitted chunks (default `_islands`). */
  outDir?: string;
  /** Host project root, used as esbuild's resolve base. Defaults to CWD. */
  resolveDir?: string;
  /** Restrict bundling to the islands actually used (optimization). */
  islands?: IslandName[];
}

export async function bundleIslands(
  opts: BundleIslandsOptions = {},
): Promise<IslandBundleResult[]> {
  const outDir = (opts.outDir ?? '_islands').replace(/\/$/, '');
  const resolveDir = opts.resolveDir ?? process.cwd();
  const names = opts.islands ?? ALL_ISLANDS;

  const results: IslandBundleResult[] = [];
  for (const name of names) {
    const source = getIslandChunkEntrySource(name);
    const result = await build({
      stdin: {
        contents: source,
        resolveDir,
        loader: 'js',
        sourcefile: `__island_${name}__.js`,
      },
      bundle: true,
      write: false,
      format: 'esm',
      target: 'es2022',
      minify: true,
      sourcemap: false,
      platform: 'browser',
      logLevel: 'silent',
      outfile: `__island_${name}__.js`,
    });
    const file = result.outputFiles?.[0];
    if (!file) {
      throw new Error(
        `esbuild produced no output for island '${name}'`,
      );
    }
    const contents = file.text;
    results.push({
      name,
      path: `${outDir}/${name}.js`,
      contents,
      byteSize: Buffer.byteLength(contents, 'utf8'),
    });
  }
  return results;
}

export { ALL_ISLANDS };
