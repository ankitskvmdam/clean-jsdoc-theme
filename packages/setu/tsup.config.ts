import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  silent: true,
  dts: true,
  clean: true,
  sourcemap: true,
});
