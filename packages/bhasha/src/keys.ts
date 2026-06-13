/**
 * API-slot key scheme + source-hash for staleness.
 *
 * Every translatable API string (a doclet description, a param description, an
 * example's prose) gets a stable key derived from the symbol's `longname` plus
 * the field path to that string. Keys are **opaque, deterministic identifiers**:
 * generated the same way on every build, compared by equality, never parsed
 * back — so the same symbol+field always lands on the same catalog entry, and a
 * rename produces a *different* key (caught as new/obsolete by aadesh's merge,
 * never silently re-pointed).
 *
 * Pure + browser-safe — no `node:crypto`; the hash is a plain FNV-1a.
 */

/** The API namespace prefix (sibling to `chrome.`). */
export const API_NAMESPACE = 'api';

/**
 * Build the catalog key for an API slot.
 *
 * Shape: `api.<longname>#<field.path>`. The field path is joined with `.`
 * (e.g. `params.0.description`) and is composed of identifiers and array
 * indices — **never a `#`**. Because the field is `#`-free, everything after the
 * *last* `#` is unambiguously the field, so the key is injective over
 * (longname, fieldPath) even when the `longname` itself contains JSDoc namepath
 * punctuation (`.`, `#`, `~`, `:`, `/`). This invariant is what keeps the same
 * symbol+field mapping to the same catalog entry on every build.
 *
 * @param longname - The doclet longname, e.g. `Foo#bar` or `module:x~Y`.
 * @param fieldPath - The (`#`-free) path to the string within the doclet, e.g.
 *   `'description'` or `['params', '0', 'description']`.
 */
export function apiSlotKey(longname: string, fieldPath: string | readonly string[]): string {
  const path = Array.isArray(fieldPath) ? fieldPath.join('.') : String(fieldPath);
  return `${API_NAMESPACE}.${longname}#${path}`;
}

/** `true` if `key` belongs to the `api.*` namespace. */
export function isApiKey(key: string): boolean {
  return key.startsWith(`${API_NAMESPACE}.`);
}

/** `true` if `key` belongs to the `chrome.*` namespace. */
export function isChromeKey(key: string): boolean {
  return key.startsWith('chrome.');
}

/**
 * A short, stable content hash of a source string, used to detect staleness: a
 * translation carries the hash of the source text it was made from; when the
 * source text changes, the hash changes and the translation is flagged stale.
 *
 * FNV-1a (32-bit) over UTF-16 code units → 8-char lowercase hex. Deterministic
 * and platform-independent (no `node:crypto`, so it runs in the browser too).
 * Not cryptographic — collisions are acceptable for staleness detection.
 */
export function sourceHash(input: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime 0x01000193, via Math.imul for correct 32-bit overflow.
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 coerces to unsigned 32-bit before hex.
  return (hash >>> 0).toString(16).padStart(8, '0');
}
