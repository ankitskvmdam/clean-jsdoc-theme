/**
 * Whitespace collapsing for page text (dwar's search text and excerpt, setu's
 * descriptions), in one linear pass.
 */

/**
 * `\s` for one UTF-16 code unit: true for exactly the 25 code units `/\s/`
 * matches (ASCII tab to carriage return and space, U+00A0, U+1680,
 * U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, U+FEFF).
 */
export function isWhitespaceCode(c: number): boolean {
  if (c <= 0x20) return c === 0x20 || (c >= 0x09 && c <= 0x0d);
  if (c < 0xa0) return false;
  return (
    c === 0xa0 ||
    c === 0x1680 ||
    (c >= 0x2000 && c <= 0x200a) ||
    c === 0x2028 ||
    c === 0x2029 ||
    c === 0x202f ||
    c === 0x205f ||
    c === 0x3000 ||
    c === 0xfeff
  );
}

/** Code units per `String.fromCharCode` call (well under the argument limit). */
const CHUNK = 8192;

/**
 * `text.replace(/\s+/g, ' ').trim()`, and with `limit` that result's
 * `.slice(0, limit)`, built in one pass that stops once `limit` characters are
 * out.
 *
 * Why not the regex: on a page of several million characters one global
 * replace makes hundreds of thousands of matches, and past roughly 0.3M-1.3M
 * matches in one call V8 hits a garbage-collection cliff (about 150 ms at 4M
 * characters, 380 ms at 8M, far above linear), which is what made a large page's
 * search text superlinear (#383). This builds the result in fixed-size chunks
 * of code units instead.
 *
 * It works on UTF-16 code units, so a surrogate (paired or lone) passes through
 * untouched, exactly as with the regex. `limit` is a non-negative integer or
 * `Infinity`; a cut may split a surrogate pair, as `slice` would.
 */
export function collapseWhitespace(text: string, limit = Infinity): string {
  const n = text.length;
  const buf = new Uint16Array(Math.min(CHUNK, n));
  const cap = buf.length;
  let out = '';
  let k = 0; // filled part of buf
  let total = 0; // characters emitted so far
  let pending = false; // a whitespace run after the first emitted character
  const flush = (chunk: Uint16Array): void => {
    out += String.fromCharCode.apply(null, chunk as unknown as number[]);
    k = 0;
  };
  for (let i = 0; i < n && total < limit; i++) {
    const c = text.charCodeAt(i);
    if (isWhitespaceCode(c)) {
      pending = total > 0;
      continue;
    }
    if (pending) {
      if (k === cap) flush(buf);
      buf[k++] = 0x20;
      total++;
      pending = false;
      if (total >= limit) break;
    }
    if (k === cap) flush(buf);
    buf[k++] = c;
    total++;
  }
  if (k > 0) flush(k === cap ? buf : buf.subarray(0, k));
  return out;
}
