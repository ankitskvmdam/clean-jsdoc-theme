/**
 * Site-URL validation — the single place that decides whether a configured
 * public URL is usable for absolute-link output (`sitemap.xml`, `llms.txt`).
 *
 * Contract (unchanged from dwar's sitemap): only the URL's **origin** is used;
 * the deploy sub-path comes from `basePath`. A URL that carries a path while
 * `basePath` is unset is therefore silently losing that path — we warn, because
 * it produces wrong-but-plausible links.
 *
 * Pure + node-free.
 */
import type { DiagnosticBag } from './diagnostics';

/**
 * The absolute `http(s)` origin of `value`, or `null` when `value` isn't an
 * absolute http(s) URL. (`new URL('mailto:x').origin` yields the *string*
 * `'null'`, hence the explicit guard.)
 */
export function httpOrigin(value: string): string | null {
  let origin: string;
  try {
    origin = new URL(value).origin;
  } catch {
    return null;
  }
  if (!origin || origin === 'null' || !/^https?:\/\//i.test(origin)) return null;
  return origin;
}

/** `true` when `raw` is a meaningful (non-root) base path. */
function basePathIsSet(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  return trimmed !== '' && trimmed !== '/';
}

/**
 * Validate the `siteUrl` opt. Returns the trimmed URL when it's usable, else
 * `undefined` (with a `warning` — never fatal; `strict` escalates). `rawBasePath`
 * is the un-normalized `basePath` opt, used only to decide whether a dropped URL
 * path is worth warning about.
 */
export function validateSiteUrl(
  raw: unknown,
  rawBasePath: unknown,
  bag: DiagnosticBag
): string | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (typeof raw !== 'string' || raw.trim() === '') {
    bag.warning('site-url/invalid', 'siteUrl must be a non-empty string.', {
      hint: 'use an absolute URL, e.g. `https://example.com`.',
      path: 'siteUrl',
    });
    return undefined;
  }

  const trimmed = raw.trim();
  if (!httpOrigin(trimmed)) {
    bag.warning('site-url/invalid', `siteUrl "${trimmed}" is not an absolute http(s) URL.`, {
      hint: 'use an absolute URL, e.g. `https://example.com`.',
      path: 'siteUrl',
    });
    return undefined;
  }

  const { pathname } = new URL(trimmed);
  if (pathname !== '' && pathname !== '/' && !basePathIsSet(rawBasePath)) {
    const suggestion = pathname.replace(/\/+$/, '');
    bag.warning(
      'site-url/path-ignored',
      `siteUrl path "${pathname}" is ignored — the deploy sub-path comes from \`basePath\`.`,
      {
        hint: `set \`basePath: "${suggestion}"\` so emitted URLs include it.`,
        path: 'siteUrl',
      }
    );
  }

  return trimmed;
}
