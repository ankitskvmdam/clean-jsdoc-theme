/* eslint-disable */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
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
});
