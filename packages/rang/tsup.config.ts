/* eslint-disable */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
});
