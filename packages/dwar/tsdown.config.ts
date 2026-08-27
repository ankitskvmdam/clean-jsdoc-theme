import { createRequire } from 'node:module';
import { defineConfig } from 'tsdown';

// tsdown loads this config natively (tsup used to bundle it), so a bare JSON
// import would need an ` with { type: 'json' } ` attribute. createRequire keeps
// it portable across loaders and needs no resolveJsonModule coupling.
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { sourcemap: false },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  fixedExtension: false,
  // Declarations must REFERENCE their dependencies, not inline them (tsdown
  // bundles devDependencies by default; tsup kept external types as imports).
  deps: {
    dts: { neverBundle: true },
    neverBundle: [
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
  },
  // Inject the package version so the exported constant never drifts from
  // package.json (replaces the `__PKG_VERSION__` token at build time).
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
});
