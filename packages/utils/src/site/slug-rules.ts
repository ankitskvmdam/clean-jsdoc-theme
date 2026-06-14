/**
 * Slugification rules shared between setu (sidebar / TOC generation) and dwar
 * (rendered heading anchors). Both sides MUST import from here so that anchor
 * IDs and sidebar links match. This addresses Risk R4.
 */

// Latin combining diacritical marks block (U+0300..U+036F): the accents NFKD
// peels off Latin letters (é → e + U+0301). Scoped to this block on purpose —
// matching every `\p{M}` would also strip Devanagari vowel signs (matras) and
// the Japanese voiced-sound mark, mangling non-Latin headings into degenerate
// slugs. Those marks are kept by the character classes below and recomposed by
// the final NFC pass. The `\u` escapes keep the regex source pure ASCII.
const DIACRITICS = /[\u0300-\u036f]+/g;

// Anything that is not a letter, number, combining mark, whitespace, or hyphen
// is punctuation to drop. The `u` flag makes `\p{L}`/`\p{N}` cover every script
// (Devanagari, Kana, CJK, …), not just ASCII; `\p{M}` keeps the marks the NFC
// pass needs to recompose. Latin diacritics are already gone via DIACRITICS.
const NON_SLUG_HEADING = /[^\p{L}\p{N}\p{M}\s-]+/gu;
const NON_SLUG_PATH = /[^\p{L}\p{N}\p{M}]+/gu;

/**
 * GitHub-style heading slugifier:
 *   - lowercase
 *   - strip combining diacritics (after NFKD normalization)
 *   - drop any character that isn't a letter, number, mark, space, or hyphen
 *   - collapse runs of whitespace/hyphens into a single hyphen
 *   - trim leading/trailing hyphens
 *   - recompose to NFC so non-Latin slugs match what authors type in
 *     `#fragment` links
 *
 * Letters/numbers/marks are matched per-script (Unicode-aware), so Devanagari
 * and Japanese headings produce meaningful, non-empty slugs — not the empty or
 * Latin-only degenerate slugs an ASCII-only class would yield.
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
    .replace(NON_SLUG_HEADING, '') // drop punctuation
    .trim()
    .replace(/[\s-]+/g, '-') // collapse whitespace/hyphens
    .replace(/^-+|-+$/g, '') // trim hyphens
    .normalize('NFC'); // recompose marks split apart by NFKD

  if (!registry) return base;

  const seen = registry.get(base) ?? 0;
  registry.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

/**
 * Path slug for URLs: lowercases each part, replaces any run of
 * non-alphanumeric characters with `-`, trims hyphens, drops empty parts, and
 * joins with `/`. Slashes between parts are preserved; slashes inside a part
 * are not — split before calling if you want sub-paths. Unicode-aware, so
 * non-Latin path parts survive instead of collapsing to empty.
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
        .replace(NON_SLUG_PATH, '-')
        .replace(/^-+|-+$/g, '')
        .normalize('NFC')
    )
    .filter((part) => part.length > 0)
    .join('/');
}

/**
 * Slug for a project-relative source file path. Used BOTH for the source
 * viewer page slug and the in-doc "Source: file:line" link target so the two
 * always agree. Normalizes backslashes to `/`, then per segment lowercases and
 * replaces any run of non-alphanumeric characters (including dots) with `-`,
 * trimming hyphens; empty segments are dropped. The extension is folded into
 * the segment (not stripped) so `foo.js` and `foo.ts` stay distinct.
 *
 * @example
 *   slugifySourcePath('src/Foo.js');        // 'src/foo-js'
 *   slugifySourcePath('lib\\util\\index.ts'); // 'lib/util/index-ts'
 */
export function slugifySourcePath(relPath: string): string {
  return String(relPath ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) =>
      segment
        .toLowerCase()
        .replace(NON_SLUG_PATH, '-')
        .replace(/^-+|-+$/g, '')
    )
    .filter((segment) => segment.length > 0)
    .join('/');
}
