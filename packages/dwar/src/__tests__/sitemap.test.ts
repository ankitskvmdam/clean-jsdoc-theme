import { describe, it, expect } from 'vitest';
import { buildSitemapXml, pageUrl } from '../sitemap';
import { render } from '../index';
import { makeManifest, minimalTheme } from './fixtures';
import type { OutputFile } from '@clean-jsdoc-theme/utils';

const asString = (f: OutputFile): string =>
  typeof f.contents === 'string' ? f.contents : new TextDecoder().decode(f.contents);

describe('pageUrl', () => {
  it('renders pretty trailing-slash directory URLs; home slug → base root', () => {
    expect(pageUrl('https://x.com', '/', '')).toBe('https://x.com/');
    expect(pageUrl('https://x.com', '/', 'module/foo')).toBe('https://x.com/module/foo/');
  });

  it('joins basePath exactly once (sub-path deploy)', () => {
    expect(pageUrl('https://x.com', '/docs/', '')).toBe('https://x.com/docs/');
    expect(pageUrl('https://x.com', '/docs/', 'guides/a')).toBe('https://x.com/docs/guides/a/');
  });

  it('normalizes stray slashes on the slug', () => {
    expect(pageUrl('https://x.com', '/', '/module/foo/')).toBe('https://x.com/module/foo/');
  });
});

describe('buildSitemapXml', () => {
  const slugs = ['', 'module/foo', 'guides/a'];

  it('emits a valid urlset with one sorted, de-duplicated <loc> per slug', () => {
    const xml = buildSitemapXml('https://x.com', '/', slugs)!;
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://x.com/</loc>');
    expect(xml).toContain('<loc>https://x.com/module/foo/</loc>');
    expect(xml).toContain('<loc>https://x.com/guides/a/</loc>');
    // Sorted output (guides/a before module/foo before the bare root? root '/'
    // sorts first lexicographically).
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([...locs].sort());
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
  });

  it('uses only the ORIGIN of siteUrl; basePath supplies the sub-path (no double-count)', () => {
    // A full URL whose path already equals basePath must NOT double the sub-path.
    const xml = buildSitemapXml('https://x.com/docs', '/docs/', ['module/foo'])!;
    expect(xml).toContain('<loc>https://x.com/docs/module/foo/</loc>');
    expect(xml).not.toContain('/docs/docs/');
  });

  it('de-duplicates identical URLs', () => {
    const xml = buildSitemapXml('https://x.com', '/', ['foo', 'foo'])!;
    expect([...xml.matchAll(/<loc>/g)]).toHaveLength(1);
  });

  it('XML-escapes the loc (query-ish chars in a slug)', () => {
    const xml = buildSitemapXml('https://x.com', '/', ['a&b'])!;
    expect(xml).toContain('<loc>https://x.com/a&amp;b/</loc>');
    expect(xml).not.toContain('a&b/</loc>');
  });

  it('returns null for an unparseable or non-http(s) site URL (no broken sitemap)', () => {
    expect(buildSitemapXml('not a url', '/', slugs)).toBeNull();
    expect(buildSitemapXml('', '/', slugs)).toBeNull();
    expect(buildSitemapXml('mailto:x@y.com', '/', slugs)).toBeNull();
    expect(buildSitemapXml('ftp://x.com', '/', slugs)).toBeNull();
  });

  it('accepts an http origin and a port', () => {
    const xml = buildSitemapXml('http://localhost:3000', '/', [''])!;
    expect(xml).toContain('<loc>http://localhost:3000/</loc>');
  });
});

describe('render() — sitemap.xml emission', () => {
  it('emits sitemap.xml with the non-hidden pages when siteUrl is set', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme, siteUrl: 'https://docs.example.com' });
    const sitemap = result.files.find((f) => f.path === 'sitemap.xml');
    expect(sitemap).toBeDefined();
    const xml = asString(sitemap!);
    expect(xml).toContain('<loc>https://docs.example.com/</loc>');
    expect(xml).toContain('<loc>https://docs.example.com/guide/intro/</loc>');
  });

  it('does NOT emit sitemap.xml without siteUrl (unchanged behavior)', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    expect(result.files.find((f) => f.path === 'sitemap.xml')).toBeUndefined();
  });

  it('excludes hidden pages (e.g. source-viewer pages)', async () => {
    const manifest = makeManifest();
    manifest.pages.push({
      slug: 'source/secret-js',
      frontmatter: { title: 'secret.js', kind: 'source', hidden: true },
      body: '',
    });
    const result = await render(manifest, { theme: minimalTheme, siteUrl: 'https://docs.example.com' });
    const xml = asString(result.files.find((f) => f.path === 'sitemap.xml')!);
    expect(xml).not.toContain('source/secret-js');
  });

  it('applies basePath to the sitemap URLs', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, {
      theme: { ...minimalTheme, basePath: '/api/' },
      siteUrl: 'https://example.com',
    });
    const xml = asString(result.files.find((f) => f.path === 'sitemap.xml')!);
    expect(xml).toContain('<loc>https://example.com/api/</loc>');
    expect(xml).toContain('<loc>https://example.com/api/guide/intro/</loc>');
  });
});
