/**
 * sitemap.xml generation. Pure string building — `render()` already knows every
 * page it emits, so the sitemap is just a projection of the non-hidden page
 * slugs onto canonical absolute URLs.
 *
 * The sitemap protocol requires fully-qualified `<loc>` URLs, so this needs the
 * site's public base URL (`RenderOptions.siteUrl`). Only its ORIGIN is used; the
 * deploy sub-path comes from `theme.basePath`, so the two never double-count —
 * a bare origin (`https://x.com`) and a full URL whose path already equals the
 * basePath (`https://x.com/docs`) both yield the same, correct result.
 */
import { withBase } from '@clean-jsdoc-theme/utils';

/** XML-escape a value for safe inclusion in an element body / attribute. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Canonical public URL for a page `slug` under `origin` + `basePath`, in the
 * pretty trailing-slash directory form (`module/foo` → `…/module/foo/`, the home
 * slug `''` → `…/`). `basePath` is joined via {@link withBase}, so a sub-path
 * deploy is reflected exactly once.
 */
export function pageUrl(origin: string, basePath: string, slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  const pathPart = clean === '' ? '/' : `/${clean}/`;
  return origin + withBase(basePath, pathPart);
}

/**
 * Build a `sitemap.xml` document from page slugs, or `null` when `siteUrl` can't
 * be parsed (so the caller emits no sitemap rather than a broken one). URLs are
 * de-duplicated and sorted for stable, diff-friendly output. Lastmod/changefreq/
 * priority are intentionally omitted — all optional, and a bare URL set is the
 * cleanest valid sitemap.
 */
export function buildSitemapXml(
  siteUrl: string,
  basePath: string,
  slugs: readonly string[]
): string | null {
  let origin: string;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return null;
  }
  // `new URL('mailto:x').origin` and the like yield 'null'; reject non-http(s).
  if (!origin || origin === 'null' || !/^https?:\/\//i.test(origin)) return null;

  const locs = [...new Set(slugs.map((slug) => pageUrl(origin, basePath, slug)))].sort();
  const urls = locs.map((loc) => `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n  </url>`).join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    '\n</urlset>\n'
  );
}
