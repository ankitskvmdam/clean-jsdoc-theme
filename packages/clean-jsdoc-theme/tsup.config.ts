/* eslint-disable */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/publish.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
});
