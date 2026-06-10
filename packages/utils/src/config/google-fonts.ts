/**
 * Google Fonts existence resolver — the ONLY networked piece of the config
 * surface, kept behind an injectable so `@clean-jsdoc-theme/utils` stays pure
 * and browser-safe. Nothing here imports `node:*` / `fs` / `Buffer`; it relies
 * only on the globals `fetch` and `AbortController` (present in Node 18+ and
 * every browser).
 *
 * The check is **fail-open**: a real `'missing'` answer needs a definitive
 * `400` from the CSS endpoint; anything ambiguous (network error, timeout, an
 * unexpected status) resolves to `'unknown'` so an offline build never breaks.
 */

/** The verdict for a single font family. */
export type FontExistence = 'exists' | 'missing' | 'unknown';

/** Minimal slice of the `fetch` contract the resolver depends on. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<{ status: number }>;

/** Options for {@link createGoogleFontResolver}. All are injectable for tests. */
export interface GoogleFontResolverOptions {
  /** `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Per-request timeout in milliseconds (via `AbortController`). Default `3000`. */
  timeoutMs?: number;
  /**
   * In-memory cache keyed by family name, so heading/body dedupe and repeat
   * builds within a process never refetch. Defaults to a fresh `Map`; inject
   * one to share or inspect it.
   */
  cache?: Map<string, FontExistence>;
}

/**
 * The Google Fonts CSS endpoint. A `GET` for an existing family returns `200`;
 * a non-existent family returns `400` (verified: `Roboto`/`Spline Sans` → 200,
 * `NotARealFontXyz123` → 400). Spaces are encoded as `+` per the endpoint's
 * query convention.
 */
const CSS_ENDPOINT = 'https://fonts.googleapis.com/css?family=';

/** Desktop UA — the endpoint is UA-tolerant, but be safe. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Build the CSS-endpoint URL for a family (`%20` → `+`). */
function fontUrl(family: string): string {
  return CSS_ENDPOINT + encodeURIComponent(family).replace(/%20/g, '+');
}

/**
 * Create a resolver `(family) => Promise<'exists'|'missing'|'unknown'>` backed
 * by the Google Fonts CSS endpoint. Results are cached per family for the life
 * of the resolver (one network round-trip per distinct family).
 *
 * Mapping: `200` → `'exists'`, `400` → `'missing'`, everything else (other
 * status, thrown error, abort/timeout) → `'unknown'` (**fail-open**).
 */
export function createGoogleFontResolver(
  options: GoogleFontResolverOptions = {},
): (family: string) => Promise<FontExistence> {
  const doFetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);
  const timeoutMs = options.timeoutMs ?? 3000;
  const cache = options.cache ?? new Map<string, FontExistence>();

  return async function resolve(family: string): Promise<FontExistence> {
    const name = family.trim();
    if (name.length === 0) return 'unknown';

    const cached = cache.get(name);
    if (cached !== undefined) return cached;

    // No fetch available (e.g. an old runtime) — fail open, but don't cache the
    // non-answer so a later environment with `fetch` can still try.
    if (typeof doFetch !== 'function') return 'unknown';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let verdict: FontExistence;
    try {
      const res = await doFetch(fontUrl(name), {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
      if (res.status === 200) verdict = 'exists';
      else if (res.status === 400) verdict = 'missing';
      else verdict = 'unknown';
    } catch {
      // Network error, abort, or timeout — fail open.
      verdict = 'unknown';
    } finally {
      clearTimeout(timer);
    }

    cache.set(name, verdict);
    return verdict;
  };
}
