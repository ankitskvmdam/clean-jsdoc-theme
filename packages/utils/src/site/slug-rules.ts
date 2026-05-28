/**
 * Slugification rules shared between setu (sidebar / TOC generation) and dwar
 * (rendered heading anchors). Both sides MUST import from here so that anchor
 * IDs and sidebar links match. This addresses Risk R4.
 */

// Combining-marks category (covers U+0300..U+036F and beyond). Uses a Unicode
// property escape so the regex source is pure ASCII.
const DIACRITICS = /\p{M}+/gu;

/**
 * GitHub-style heading slugifier:
 *   - lowercase
 *   - strip combining diacritics (after NFKD normalization)
 *   - drop any character that isn't an alphanumeric, space, or hyphen
 *   - collapse runs of whitespace/hyphens into a single hyphen
 *   - trim leading/trailing hyphens
 *
 * When `registry` is provided, repeated slugs are deduped by appending `-1`,
 * `-2`, ... — the registry tracks how many times each base slug has been seen
 * so callers can reuse it across all headings on a page.
 *
 * @example
 *   const reg = new Map<string, number>();
 *   slugifyHeading('Hello World', reg); // 'hello-world'
 *   slugifyHeading('Hello World', reg); // 'hello-world-1'
 */
export function slugifyHeading(text: string, registry?: Map<string, number>): string {
  const base = String(text ?? '')
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, '') // drop punctuation
    .trim()
    .replace(/[\s-]+/g, '-') // collapse whitespace/hyphens
    .replace(/^-+|-+$/g, ''); // trim hyphens

  if (!registry) return base;

  const seen = registry.get(base) ?? 0;
  registry.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

/**
 * Path slug for URLs: lowercases each part, replaces any run of
 * non-alphanumeric characters with `-`, trims hyphens, drops empty parts, and
 * joins with `/`. Slashes between parts are preserved; slashes inside a part
 * are not — split before calling if you want sub-paths.
 *
 * @example
 *   slugifyPath(['Foo Bar', 'Baz!']); // 'foo-bar/baz'
 */
export function slugifyPath(parts: string[]): string {
  return parts
    .map((part) =>
      String(part ?? '')
        .normalize('NFKD')
        .replace(DIACRITICS, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter((part) => part.length > 0)
    .join('/');
}
