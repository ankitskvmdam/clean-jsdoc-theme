/* eslint-disable */
import { defineConfig } from 'tsup';
import pkg from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    'preact',
    'preact/hooks',
    'preact/jsx-runtime',
    'preact-render-to-string',
    '@mdx-js/mdx',
    'esbuild',
    'pagefind',
    '@clean-jsdoc-theme/rang',
    '@clean-jsdoc-theme/utils',
  ],
  // Inject the package version so the exported constant never drifts from
  // package.json (replaces the `__PKG_VERSION__` token at build time).
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
});
