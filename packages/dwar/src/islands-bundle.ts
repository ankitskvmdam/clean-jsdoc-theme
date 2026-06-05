/**
 * Bundle each IslandName into its own ESM chunk via esbuild.
 *
 * Strategy: bundle Preact inline into each chunk (the chunks total
 * ~60–90 KB minified, which is acceptable). This avoids the coordination
 * problem of shipping a separate shared runtime that all chunks pin to the
 * same version of.
 *
 * Inputs are virtual entry files (in-memory strings) via esbuild's `stdin`
 * + a tiny resolver plugin so each chunk can import `@clean-jsdoc-theme/rang`
 * and `preact` from the host's node_modules without writing files to disk.
 */

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { build } from 'esbuild';
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
  'cmdk',
  'code-tabs',
  'copy-btn',
  'theme-toggle',
  'settings',
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
  /** esbuild's resolve base. Defaults to dwar's own package directory. */
  resolveDir?: string;
  /** Restrict bundling to the islands actually used (optimization). */
  islands?: IslandName[];
}

export async function bundleIslands(
  opts: BundleIslandsOptions = {},
): Promise<IslandBundleResult[]> {
  const outDir = (opts.outDir ?? '_islands').replace(/\/$/, '');
  const resolveDir = opts.resolveDir ?? DWAR_PACKAGE_DIR;
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
      legalComments: 'none',
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
