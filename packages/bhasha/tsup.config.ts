/* eslint-disable */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // rang owns preact and bundles bhasha into the browser — never inline a second
  // copy. Keep bhasha isomorphic: no `node:*`, only preact + utils (also pure).
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
});
