import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { sourcemap: false },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  fixedExtension: false,
  // rang owns preact and bundles bhasha into the browser — never inline a second
  // copy. Keep bhasha isomorphic: no `node:*`, only preact + utils (also pure).
  // (`deps.neverBundle` is tsdown's non-deprecated spelling of tsup's `external`.)
  // Declarations must REFERENCE their dependencies, not inline them (tsdown
  // bundles devDependencies by default; tsup kept external types as imports).
  deps: {
    neverBundle: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
    dts: { neverBundle: true },
  },
});
