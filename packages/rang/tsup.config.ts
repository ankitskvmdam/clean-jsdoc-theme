/* eslint-disable */
import { defineConfig } from 'tsup';
import pkg from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  // Inject the package version so the exported constant never drifts from
  // package.json (replaces the `__PKG_VERSION__` token at build time).
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
});
