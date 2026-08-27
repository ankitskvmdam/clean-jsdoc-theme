import { defineConfig } from 'vite';
import { staticDocs, staticDocsServer } from '../../scripts/vite-static-docs.mjs';

export default defineConfig({
  ...staticDocsServer({ outDir: 'dist', port: 3002 }),
  plugins: [
    staticDocs({
      generate: 'pnpm run build:docs',
      watch: ['src', 'docs', 'README.md', 'typedoc.json', 'tsconfig.json'],
      packages: ['typedoc', 'dwar', 'rang', 'setu', 'utils'],
    }),
  ],
});
