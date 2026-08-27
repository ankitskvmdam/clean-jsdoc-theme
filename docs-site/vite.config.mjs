import { defineConfig } from 'vite';
import { staticDocs, staticDocsServer } from '../scripts/vite-static-docs.mjs';

// The site is generated into `dist/clean-jsdoc-theme` (opts.basePath is
// `/clean-jsdoc-theme`), so `dist` is served as the root and `/` redirects into
// the sub-path — the same thing the old serve.json redirect did.
export default defineConfig({
  ...staticDocsServer({ outDir: 'dist', port: 3001 }),
  plugins: [
    staticDocs({
      generate: 'pnpm run build:docs',
      redirect: '/clean-jsdoc-theme/',
      watch: [
        'docs',
        'docs.hi',
        'docs.ja',
        'docs.zh',
        'src',
        'typedoc-src',
        'README.md',
        'jsdoc.json',
        'jsdoc.api.json',
        'typedoc.json',
        'tsconfig.typedoc.json',
        'clean-jsdoc-theme-artifacts',
      ],
      // A change in any of these cascades here via `turbo watch build`.
      packages: [
        'clean-jsdoc-theme',
        'typedoc',
        'dwar',
        'rang',
        'setu',
        'utils',
        'aadesh',
        'bhasha',
      ],
    }),
  ],
});
