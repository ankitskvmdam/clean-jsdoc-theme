/* eslint-disable */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/publish.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Inject __filename/__dirname into the ESM output (derived from
  // import.meta.url) so the CJS-first module-path resolution in publish.ts works
  // in both builds — no `new Function('import.meta.url')` eval shim needed.
  shims: true,
});
