import { describe, it, expect } from 'vitest';
import { buildDocPages } from '@clean-jsdoc-theme/setu';
import { render } from '@clean-jsdoc-theme/dwar';
import type { OutputFile, SiteManifest, ThemeConfig } from '@clean-jsdoc-theme/utils';

/**
 * setu computes each page's TOC ids (`extractHeadings`) and dwar independently
 * stamps ids on the rendered headings (`rehypeSlugHeadings`). Both go through
 * utils' `slugifyHeading`; this checks end to end that they agree, including
 * the fallback ids for punctuation/emoji-only headings and their dedupe suffix.
 */
const theme: ThemeConfig = {
  tokens: {
    colors: {
      bg: '#ffffff',
      bgMuted: '#f3f4f6',
      fg: '#111827',
      fgMuted: '#6b7280',
      accent: '#2563eb',
      accentFg: '#ffffff',
      border: '#e5e7eb',
    },
    fonts: { heading: 'Source Serif 4', body: 'Roboto', mono: 'monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'Parity',
  },
  basePath: '/',
};

function asString(file: OutputFile): string {
  return typeof file.contents === 'string'
    ? file.contents
    : new TextDecoder().decode(file.contents);
}

describe('heading ids: setu TOC === dwar rendered', () => {
  it('match for punctuation/emoji-only, duplicate and normal headings', async () => {
    const content = [
      '# Parity',
      '## $',
      '## 🚀',
      '## 🚀',
      '## Getting started',
      '### Getting started',
      '## Café',
      '## Section',
      '## ⚠️ Warning',
      '## 1️⃣ Step',
      '## ⚠️',
      '## a ≠ b',
    ].join('\n\n');
    const { pages } = buildDocPages([{ path: 'parity', content, type: 'markdown' }]);
    const page = pages[0];
    const setuIds = (page.headings ?? []).map((h) => h.id);
    expect(setuIds).toEqual([
      'section--24',
      'section--1f680',
      'section--1f680-1',
      'getting-started',
      'getting-started-1',
      'cafe',
      'section',
      'warning',
      '1-step',
      'section--26a0_fe0f',
      'a-b', // control: `≠` is `=` + U+0338, a Latin-block mark, always stripped
    ]);

    const manifest: SiteManifest = { pages: [page], nav: [], buildId: 'parity' };
    const result = await render(manifest, { theme });
    expect(result.errors ?? []).toEqual([]);
    const html = asString(result.files.find((f) => f.path === 'parity/index.html')!);
    const dwarIds = [...html.matchAll(/<h[2-6][^>]*\sid="([^"]*)"/g)].map((m) => m[1]);
    expect(dwarIds).toEqual(setuIds);
  });

  it('match for formatted headings (bold, emphasis, link, inline code, emoji)', async () => {
    const content = [
      '# Formatted',
      '## **Bold** title',
      '## An *emphasised* word',
      '## See [the docs](https://example.com)',
      '## The `run()` method',
      '## $ *!*',
      '## \u26a0\ufe0f **Warning**',
      '## Launch 🚀 ![logo](logo.png)',
    ].join('\n\n');
    const { pages } = buildDocPages([{ path: 'formatted', content, type: 'markdown' }]);
    const page = pages[0];
    const setuIds = (page.headings ?? []).map((h) => h.id);
    expect(setuIds).toEqual([
      'bold-title',
      'an-emphasised-word',
      'see-the-docs',
      'the-run-method',
      'section--24_20_21',
      'warning',
      'launch',
    ]);

    const manifest: SiteManifest = { pages: [page], nav: [], buildId: 'formatted' };
    const result = await render(manifest, { theme });
    expect(result.errors ?? []).toEqual([]);
    const html = asString(result.files.find((f) => f.path === 'formatted/index.html')!);
    const dwarIds = [...html.matchAll(/<h[2-6][^>]*\sid="([^"]*)"/g)].map((m) => m[1]);
    expect(dwarIds).toEqual(setuIds);
  });

  it('match for footnotes, line breaks, images, strikethrough and {@link}', async () => {
    const markdown = [
      '# Inline',
      '## Intro[^1]',
      '## a<br>b',
      '## Logo ![alt](x.png)',
      '## ~~old~~ new',
      '## See {@link Foo}',
      '[^1]: note',
    ].join('\n\n');
    const resolve = (t: string) => (t === 'Foo' ? { href: '/foo/', external: false } : null);
    const { pages } = buildDocPages(
      [
        { path: 'inline', content: markdown, type: 'markdown' },
        { path: 'raw', content: '<h2>a<br>b</h2><h2>Intro<sup>1</sup></h2>', type: 'html' },
      ],
      {},
      resolve
    );
    const expected: Record<string, string[]> = {
      // The footnote definition adds GFM's own `Footnotes` section heading.
      inline: ['intro1', 'a-b', 'logo', 'old-new', 'see-foo', 'footnotes'],
      raw: ['a-b', 'intro1'],
    };

    const manifest: SiteManifest = { pages, nav: [], buildId: 'inline' };
    const result = await render(manifest, { theme });
    expect(result.errors ?? []).toEqual([]);
    for (const page of pages) {
      const setuIds = (page.headings ?? []).map((h) => h.id);
      expect(setuIds).toEqual(expected[page.slug]);
      const html = asString(result.files.find((f) => f.path === `${page.slug}/index.html`)!);
      const dwarIds = [...html.matchAll(/<h[2-6][^>]*\sid="([^"]*)"/g)].map((m) => m[1]);
      expect(dwarIds).toEqual(setuIds);
    }
  });
});
