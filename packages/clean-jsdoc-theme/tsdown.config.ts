import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/publish.ts'],
  format: ['esm', 'cjs'],
  dts: { sourcemap: false },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  // This package has NO `type` field, so with `fixedExtension: false` the CJS
  // build keeps the plain `publish.js` name that `main` + `exports.require`
  // point at (JSDoc `require()`s it), and ESM gets `publish.mjs`.
  fixedExtension: false,
  // Declarations must REFERENCE their dependencies, not inline them. tsdown
  // bundles devDependencies by default, so the dts pass was copying @types/mdast
  // into utils index.d.ts — which made utils Root a DIFFERENT nominal type from
  // setu import(mdast).Root and broke typecheck. tsup kept every external type as
  // an import; this restores that.
  deps: { dts: { neverBundle: true } },
  // Inject __filename/__dirname into the ESM output (derived from
  // import.meta.url) so the CJS-first module-path resolution in publish.ts works
  // in both builds — no `new Function('import.meta.url')` eval shim needed.
  shims: true,
});
