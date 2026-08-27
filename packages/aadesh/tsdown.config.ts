import { createRequire } from 'node:module';
import { defineConfig } from 'tsdown';

// tsdown loads this config natively (tsup used to bundle it), so a bare JSON
// import would need an ` with { type: 'json' } ` attribute. createRequire keeps
// it portable across loaders and needs no resolveJsonModule coupling.
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

export default defineConfig({
  // Two entries, so the shared code lands in a split chunk. The chunk's name is
  // internal (only these entries import it) and `files: ["dist"]` ships it, so
  // rolldown naming it differently from esbuild is not a consumer-visible change
  // — but `bin` still has to resolve to `dist/cli.js`, hence fixedExtension.
  entry: ['src/index.ts', 'src/cli.ts'],
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
  // Inject the package version so the exported constant never drifts from
  // package.json (replaces the `__PKG_VERSION__` token at build time).
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
});
