import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { sourcemap: false },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  fixedExtension: false,
  // Declarations must REFERENCE their dependencies, not inline them. tsdown
  // bundles devDependencies by default, so the dts pass was copying @types/mdast
  // into utils index.d.ts — which made utils Root a DIFFERENT nominal type from
  // setu import(mdast).Root and broke typecheck. tsup kept every external type as
  // an import; this restores that.
  deps: { dts: { neverBundle: true } },
});
