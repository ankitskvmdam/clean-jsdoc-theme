import { defineConfig } from 'vite';
import { staticDocs, staticDocsServer } from '../../scripts/vite-static-docs.mjs';

// This example had no `dev` script at all — only `serve` against a stale build.
export default defineConfig({
  ...staticDocsServer({ outDir: 'dist', port: 3004 }),
  plugins: [
    staticDocs({
      generate: 'pnpm run build:docs',
      watch: [
        'src',
        'docs',
        'docs.ja',
        'docs.hi',
        'README.md',
        'README.ja.md',
        'README.hi.md',
        'jsdoc.json',
        'clean-jsdoc-theme-artifacts',
      ],
      packages: ['clean-jsdoc-theme', 'aadesh', 'bhasha', 'dwar', 'rang', 'setu', 'utils'],
    }),
  ],
});
