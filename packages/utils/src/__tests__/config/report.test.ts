import { describe, it, expect } from 'vitest';
import { formatBuildReport } from '../../config/report';
import { byteLength } from '../../config/format';
import type { OutputFile } from '../../site/render';

/** Strip ANSI escapes so assertions read against plain text. */
function strip(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

const sampleFiles: OutputFile[] = [
  { path: 'index.html', contents: 'a'.repeat(1200) }, // route /
  { path: 'user/index.html', contents: 'b'.repeat(800) }, // route /user
  { path: 'module/userservice/index.html', contents: 'c'.repeat(1500) }, // route /module/userservice
  { path: 'user.md', contents: 'm'.repeat(400) }, // markdown companion
  { path: '_assets/styles.abc123.css', contents: 'x'.repeat(4100) }, // asset
  { path: '_islands/search.js', contents: 'y'.repeat(2000) }, // asset
  { path: 'logo.svg', contents: 's'.repeat(300) }, // image asset (no _assets prefix)
];

describe('formatBuildReport classification', () => {
  it('routes HTML pages, drops index.html, and roots / correctly', () => {
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/' }));
    expect(out).toMatch(/^ {2}\/ {2,}/m);
    expect(out).toContain('/user');
    expect(out).toContain('/module/userservice');
  });

  it('treats *.md as Markdown (not a route) and excludes it from the route table', () => {
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/' }));
    // The markdown file's path must not appear as a row.
    expect(out).not.toContain('user.md');
    // But its bytes feed the Markdown total.
    expect(out).toMatch(/Markdown 400 B/);
  });

  it('classifies _assets / _islands / images as assets', () => {
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/' }));
    expect(out).toContain('_assets/styles.abc123.css');
    expect(out).toContain('_islands/search.js');
    expect(out).toContain('logo.svg');
  });
});

describe('formatBuildReport sizes and totals', () => {
  it('renders per-route sizes via humanFileSize', () => {
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/' }));
    expect(out).toMatch(/\/ {2,}1\.2 kB/); // 1200 B
    expect(out).toMatch(/\/user {2,}800 B/);
    expect(out).toMatch(/\/module\/userservice {2,}1\.5 kB/);
  });

  it('sums HTML / Markdown / Assets / Total footer correctly', () => {
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/' }));
    // HTML = 1200 + 800 + 1500 = 3500 → 3.5 kB
    // Markdown = 400 B
    // Assets = 4100 + 2000 + 300 = 6400 → 6.4 kB
    // Total = 10300 → 10.3 kB
    expect(out).toContain('HTML 3.5 kB · Markdown 400 B · Assets 6.4 kB · Total 10.3 kB');
  });

  it('reports destination and counts in the header', () => {
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/' }));
    expect(out).toContain('Output: dist/');
    expect(out).toContain('(3 pages, 3 assets)');
  });

  it('uses stats.durationMs and counts when provided', () => {
    const out = strip(
      formatBuildReport({
        files: sampleFiles,
        destination: 'dist/',
        stats: {
          pageCount: 97,
          assetCount: 83,
          cssBytes: 0,
          jsBytes: 0,
          durationMs: 1420,
        },
      })
    );
    expect(out).toContain('build complete in 1.42s');
    expect(out).toContain('(97 pages, 83 assets)');
  });
});

describe('formatBuildReport gzip column', () => {
  it('omits the gzip column when no gzipSizer is given', () => {
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/' }));
    expect(out).not.toContain('(gzip)');
  });

  it('adds a gzip column only when a gzipSizer is given', () => {
    // Trivial fake sizer: half the raw byte length (deterministic, no real gzip).
    const gzipSizer = (b: Uint8Array | string) => Math.round(byteLength(b) / 2);
    const out = strip(formatBuildReport({ files: sampleFiles, destination: 'dist/', gzipSizer }));
    expect(out).toContain('(gzip)');
    // / route is 1200 B raw → 600 B gzip.
    expect(out).toMatch(/\/ {2,}1\.2 kB {2,}600 B/);
  });
});

describe('formatBuildReport truncation', () => {
  const manyFiles: OutputFile[] = Array.from({ length: 10 }, (_, i) => ({
    path: `page${i}/index.html`,
    contents: 'z'.repeat((i + 1) * 100),
  }));

  it('lists every route by default (no truncation line)', () => {
    const out = strip(formatBuildReport({ files: manyFiles, destination: 'dist/' }));
    expect(out).not.toMatch(/more pages/);
    for (let i = 0; i < 10; i++) expect(out).toContain(`/page${i}`);
  });

  it('caps at maxRoutes largest and shows the dropped count', () => {
    const out = strip(formatBuildReport({ files: manyFiles, destination: 'dist/', maxRoutes: 3 }));
    expect(out).toContain('+7 more pages');
    // The 3 largest are page9, page8, page7 (1000/900/800 B).
    expect(out).toContain('/page9');
    expect(out).toContain('/page8');
    expect(out).toContain('/page7');
    expect(out).not.toContain('/page0');
  });
});

describe('formatBuildReport color', () => {
  it('emits ANSI escapes only when color is true', () => {
    const plain = formatBuildReport({ files: sampleFiles, destination: 'dist/' });
    const colored = formatBuildReport({
      files: sampleFiles,
      destination: 'dist/',
      color: true,
    });
    expect(plain).not.toContain('\x1b[');
    expect(colored).toContain('\x1b[');
  });
});
