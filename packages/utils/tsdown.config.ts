import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // An object still enables dts; `sourcemap: false` suppresses the `.d.ts.map`
  // files tsdown would otherwise derive from the top-level `sourcemap` (tsup
  // never emitted those, and they'd ship in the published tarball).
  dts: { sourcemap: false },
  clean: true,
  sourcemap: true,
  // Pinned rather than inferred. tsup read `target` from tsconfig (ES2022);
  // tsdown would otherwise auto-detect from `engines.node`, which these packages
  // don't declare — so stating it keeps the emitted syntax level identical.
  target: 'es2022',
  // REQUIRED for output-name parity. tsdown defaults this to `true` (because
  // `platform` defaults to 'node'), which forces explicit `.mjs`/`.cjs` on every
  // format. tsup instead gave the format matching package.json `type` the plain
  // `.js` name. With `false`, tsdown matches tsup for both shapes we ship:
  //   type: module    → esm `.js`  + cjs `.cjs`   (this package, setu, …)
  //   type: undefined → esm `.mjs` + cjs `.js`    (clean-jsdoc-theme)
  // Our package.json `exports`/`main`/`types` name those files, so changing them
  // would break every consumer.
  fixedExtension: false,
  // Declarations must REFERENCE their dependencies, not inline them. tsdown
  // bundles devDependencies by default, so the dts pass was copying @types/mdast
  // into utils index.d.ts — which made utils Root a DIFFERENT nominal type from
  // setu import(mdast).Root and broke typecheck. tsup kept every external type as
  // an import; this restores that.
  deps: { dts: { neverBundle: true } },
});
