/**
 * Smoke script: end-to-end exercise of setu → dwar → disk.
 *
 * Pulls the JSDoc taffy fixture from setu's test factory, runs it through
 * `generateSite()` to get a SiteManifest, hands the manifest to dwar's
 * `render()`, and writes the OutputFiles into `packages/dwar/preview/`.
 *
 * Optional final step: if `pagefind` is installed, also build the search
 * index against the written directory. The script is for visual sanity-
 * checking — not part of the deliverable, not committed by Phase 4.
 *
 * Usage:
 *   pnpm --filter @clean-jsdoc-theme/dwar run smoke
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSite } from '@clean-jsdoc-theme/setu';
// Reach into setu's test factory via a relative path — the smoke script is
// not packaged, so this is acceptable.
import { getJSDocTaffyData } from '../../setu/src/__tests__/factory';
import { render, runPagefindAgainstDir } from '../src/index';
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
      heading: 'IBM Plex Serif',
      body: 'IBM Plex Sans',
      mono: 'ui-monospace, SFMono-Regular, monospace',
    },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'clean-jsdoc-theme (smoke)',
  },
  basePath: '/',
};

async function main() {
  const collection = getJSDocTaffyData();
  const manifest = generateSite(collection, {
    pkg: { name: 'clean-jsdoc-theme', version: '5.0.0-alpha.0' },
  });
  console.log(`[smoke] manifest: ${manifest.pages.length} pages, ${manifest.nav.length} nav roots`);

  const result = await render(manifest, { theme });
  console.log(
    `[smoke] render: ${result.stats.pageCount} pages, ` +
      `${result.stats.assetCount} assets, ` +
      `css=${result.stats.cssBytes}B, js=${result.stats.jsBytes}B, ` +
      `${result.stats.durationMs}ms`,
  );

  // Fresh output dir.
  await rm(previewDir, { recursive: true, force: true });
  await mkdir(previewDir, { recursive: true });

  let htmlCount = 0;
  for (const file of result.files) {
    const out = resolve(previewDir, file.path);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(
      out,
      typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents),
    );
    if (file.path.endsWith('.html')) htmlCount += 1;
  }
  console.log(`[smoke] wrote ${result.files.length} files (${htmlCount} HTML) → ${previewDir}`);

  // Pagefind if available.
  try {
    await runPagefindAgainstDir(previewDir);
    console.log('[smoke] pagefind index written under preview/pagefind/');
  } catch (err) {
    console.warn(`[smoke] pagefind skipped: ${(err as Error).message}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
