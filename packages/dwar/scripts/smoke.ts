/**
 * Smoke script: end-to-end exercise of dwar → disk.
 *
 * Builds a small hand-authored `SiteManifest` (dwar's only input) — an index
 * page, a guide with headings, an API page, and a `kind: 'source'` viewer —
 * hands it to dwar's `render()`, and writes the OutputFiles into
 * `packages/dwar/preview/`.
 *
 * The manifest is written by hand ON PURPOSE: dwar must not depend on setu (the
 * setu→dwar boundary is one-way, see docs/ARCHITECTURE.md). The full
 * setu→dwar→disk path is exercised end-to-end by `examples/basic`.
 *
 * The script is for visual sanity-checking — `preview/` is not committed.
 *
 * Usage:
 *   pnpm --filter @clean-jsdoc-theme/dwar run smoke
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SiteManifest } from '@clean-jsdoc-theme/utils';
import { render } from '../src/index';
import type { ThemeConfig } from '../src/index';

const here = dirname(fileURLToPath(import.meta.url));
const previewDir = resolve(here, '..', 'preview');

const theme: ThemeConfig = {
  tokens: {
    colors: {
      bg: '#ffffff',
      bgMuted: '#f3f4f6',
      fg: '#0f172a',
      fgMuted: '#475569',
      accent: '#2563eb',
      accentFg: '#ffffff',
      border: '#e5e7eb',
    },
    fonts: {
      heading: 'Source Serif 4',
      body: 'Roboto',
      mono: 'ui-monospace, SFMono-Regular, monospace',
    },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'clean-jsdoc-theme (smoke)',
  },
  basePath: '/',
};

/**
 * A manifest that touches the render paths worth eyeballing: MDX prose, code
 * fences (shiki + the copy-btn island), a heading TOC, and the code-viewer
 * island via a hidden `kind: 'source'` page.
 */
const manifest: SiteManifest = {
  buildId: 'smoke',
  pkg: {
    name: 'clean-jsdoc-theme',
    version: '5.0.0-alpha.0',
    description: 'Smoke-test fixture for dwar.render()',
  },
  nav: [
    { label: 'Home', slug: 'index' },
    { label: 'Getting started', slug: 'getting-started', group: 'Guides' },
    { label: 'Calculator', slug: 'calculator', group: 'API' },
  ],
  pages: [
    {
      slug: 'index',
      frontmatter: { title: 'Home', kind: 'index', description: 'Smoke fixture home page.' },
      body: 'Welcome to the **dwar** smoke fixture.\n\nSee the [guide](/getting-started).\n',
      headings: [],
    },
    {
      slug: 'getting-started',
      frontmatter: {
        title: 'Getting started',
        kind: 'guide',
        group: 'Guides',
        description: 'A guide page with headings and a code fence.',
      },
      body: [
        'Install it, then render.',
        '',
        '## Install',
        '',
        '```bash',
        'npm install clean-jsdoc-theme',
        '```',
        '',
        '## Render',
        '',
        '```js',
        "import { render } from '@clean-jsdoc-theme/dwar';",
        '',
        'const result = await render(manifest, { theme });',
        '```',
        '',
        '### Notes',
        '',
        '`render()` is pure — it never writes to disk.',
        '',
      ].join('\n'),
      headings: [
        { depth: 2, text: 'Install', id: 'install' },
        { depth: 2, text: 'Render', id: 'render' },
        { depth: 3, text: 'Notes', id: 'notes' },
      ],
    },
    {
      slug: 'calculator',
      frontmatter: {
        title: 'Calculator',
        kind: 'class',
        group: 'API',
        longname: 'Calculator',
        description: 'A tiny class page so the API layout renders.',
      },
      body: [
        'A tiny calculator.',
        '',
        '## add',
        '',
        'Adds two numbers and returns the sum.',
        '',
        '## subtract',
        '',
        'Subtracts `b` from `a`.',
        '',
      ].join('\n'),
      headings: [
        { depth: 2, text: 'add', id: 'add' },
        { depth: 2, text: 'subtract', id: 'subtract' },
      ],
    },
    // One `kind: 'source'` page so the smoke output exercises the code-viewer
    // island path (whole-file viewer, hidden, empty body).
    {
      slug: 'source/example-js',
      body: '',
      headings: [],
      frontmatter: { title: 'example.js', kind: 'source', hidden: true },
      source: {
        code: 'export function add(a, b) {\n  return a + b;\n}\n',
        language: 'javascript',
        filename: 'example.js',
      },
    },
  ],
};

async function main() {
  console.log(`[smoke] manifest: ${manifest.pages.length} pages, ${manifest.nav.length} nav roots`);

  const result = await render(manifest, { theme });
  console.log(
    `[smoke] render: ${result.stats.pageCount} pages, ` +
      `${result.stats.assetCount} assets, ` +
      `css=${result.stats.cssBytes}B, js=${result.stats.jsBytes}B, ` +
      `${result.stats.durationMs}ms`
  );
  for (const err of result.errors ?? []) {
    console.error(`[smoke] render error: ${err.slug}: ${err.message}`);
  }

  // Fresh output dir.
  await rm(previewDir, { recursive: true, force: true });
  await mkdir(previewDir, { recursive: true });

  let htmlCount = 0;
  for (const file of result.files) {
    const out = resolve(previewDir, file.path);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(
      out,
      typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents)
    );
    if (file.path.endsWith('.html')) htmlCount += 1;
  }
  console.log(`[smoke] wrote ${result.files.length} files (${htmlCount} HTML) → ${previewDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
