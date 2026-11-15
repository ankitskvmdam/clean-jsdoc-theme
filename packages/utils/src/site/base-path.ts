/**
 * Base-path helpers — let the site be served from a sub-directory
 * (e.g. `https://example.com/doc/api`) by prefixing every emitted URL.
 *
 * Both functions are pure and browser-safe: utils is imported by rang in the
 * browser, so these use only the global `URL` (no node builtins) and never
 * throw — bad input fails safe to the root prefix `'/'`.
 */

/**
 * Normalize a developer-supplied base path into a canonical prefix:
 *  - `'/'` for the site root, or
 *  - `'/sub/dir'` — a leading slash, NO trailing slash — for a sub-directory.
 *
 * Accepts either a bare path (`'/doc/api/'`) or a full / protocol-relative URL
 * (`'https://example.com/doc/api'`, `'//host/doc/api'`); for a URL the pathname
 * is extracted. Empty / `undefined` / `'/'` → `'/'`. Fail-safe: anything that
 * can't be parsed sensibly returns `'/'` (never throws).
 *
 * @example
 * normalizeBasePath('/doc/api/');                  // '/doc/api'
 * normalizeBasePath('https://example.com/doc/api'); // '/doc/api'
 * normalizeBasePath('https://example.com');         // '/'
 * normalizeBasePath('');                            // '/'
 * normalizeBasePath(undefined);                     // '/'
 */
export function normalizeBasePath(input: unknown): string {
  if (typeof input !== 'string') return '/';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '/';

  let path = trimmed;
  // Full (`http(s)://host/path`) or protocol-relative (`//host/path`) URL:
  // pull out just the pathname. A bare path is left as-is.
  if (/^(https?:)?\/\//i.test(trimmed)) {
    try {
      // `//host/path` has no protocol; give `new URL` one so it parses.
      const withProtocol = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
      path = new URL(withProtocol).pathname;
    } catch {
      return '/';
    }
  }

  // Collapse to a clean prefix: ensure a single leading slash, strip any
  // trailing slash(es). An empty / root pathname → '/'.
  const cleaned = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
  return cleaned === '/' ? '/' : cleaned;
}

/**
 * Join a base-path prefix with a root-relative path, with no double slashes,
 * for any `basePath` value (`'/'`, `''`, or `'/doc/api'`).
 *
 * Backward compatible: `withBase('/', '/x')` returns `'/x'` unchanged, so with
 * the default root base every emitted URL is byte-identical to before.
 *
 * @example
 * withBase('/', '/x');         // '/x'
 * withBase('/doc/api', '/x');  // '/doc/api/x'
 * withBase('/doc/api', 'x');   // '/doc/api/x'
 */
export function withBase(basePath: string | undefined, path: string): string {
  const b = (basePath ?? '/').replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : '/' + path;
  return b + p;
}

/**
 * The root-relative URL of the page at `slug` (no leading slash; may carry a
 * `#anchor`), before `basePath` is applied.
 *
 * A page is written to `<slug>/index.html`, so `'/' + slug` reaches it through
 * the host's directory redirect. A slug whose last segment is `index` is the
 * exception: hosts that map `/x/index` to `x/index.html` (GitHub Pages does)
 * serve the parent page instead, so a class named `Index` linked as `/index`
 * opened the home page (issue #333). Such a slug gets a trailing slash, which
 * names its own directory; every other slug stays `'/' + slug`.
 *
 * @example
 * slugPath('');             // '/'
 * slugPath('baseentity');   // '/baseentity'
 * slugPath('index');        // '/index/'
 * slugPath('index#run');    // '/index/#run'
 * slugPath('module/index'); // '/module/index/'
 */
export function slugPath(slug: string): string {
  const hash = slug.indexOf('#');
  const path = hash === -1 ? slug : slug.slice(0, hash);
  const anchor = hash === -1 ? '' : slug.slice(hash);
  return '/' + path + (/(^|\/)index$/.test(path) ? '/' : '') + anchor;
}
