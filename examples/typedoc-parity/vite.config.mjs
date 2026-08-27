import { defineConfig } from 'vite';
import { staticDocs, staticDocsServer } from '../../scripts/vite-static-docs.mjs';

// Port 3003, not 3002: this example and typedoc-basic both used to hardcode 3002,
// so running the two dev servers together silently fought over the port.
export default defineConfig({
  ...staticDocsServer({ outDir: 'dist', port: 3003 }),
  plugins: [
    staticDocs({
      generate: 'pnpm run build:docs',
      watch: ['src', 'docs', 'README.md', 'typedoc.json', 'tsconfig.json'],
      packages: ['typedoc', 'dwar', 'rang', 'setu', 'utils'],
    }),
  ],
});
