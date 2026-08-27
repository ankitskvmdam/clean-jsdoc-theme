import { defineConfig } from 'vite';
import { staticDocs, staticDocsServer } from '../../scripts/vite-static-docs.mjs';

export default defineConfig({
  ...staticDocsServer({ outDir: 'dist', port: 3000 }),
  plugins: [
    staticDocs({
      generate: 'pnpm run build:docs',
      watch: ['src', 'tutorials', 'assets', 'README.md', 'jsdoc.json'],
      packages: ['clean-jsdoc-theme', 'dwar', 'rang', 'setu', 'utils'],
    }),
  ],
});
