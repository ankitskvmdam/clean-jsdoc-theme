import salty from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';

/** `\r\n` and lone `\r` → `\n`. Returns the same string when there is no `\r`. */
export function normalizeLineEndings(text: string): string {
  return text.includes('\r') ? text.replace(/\r\n?/g, '\n') : text;
}

/**
 * Copy-on-write walk: strings are normalised; an array/object is copied only
 * when one of its children changed, otherwise the same reference comes back.
 * `seen` maps each visited object to its result. It is seeded with the original
 * before recursing, so shared references and cycles terminate (a cycle back
 * into a copied object points at the original — fine for doclet data, which
 * never cycles through a string that needs changing).
 */
function normalizeValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (typeof value === 'string') return normalizeLineEndings(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  seen.set(value, value);

  if (Array.isArray(value)) {
    let copy: unknown[] | undefined;
    value.forEach((item, i) => {
      const next = normalizeValue(item, seen);
      if (next !== item) (copy ??= value.slice())[i] = next;
    });
    if (!copy) return value;
    seen.set(value, copy);
    return copy;
  }

  let copy: Record<string, unknown> | undefined;
  for (const [key, item] of Object.entries(value)) {
    const next = normalizeValue(item, seen);
    if (next !== item) (copy ??= { ...value })[key] = next;
  }
  if (!copy) return value;
  seen.set(value, copy);
  return copy;
}

/**
 * The collection with every doclet string's `\r\n` / lone `\r` turned into `\n`.
 * JSDoc's `unwrap()` turns each `\r\n * ` of a CRLF source comment into a lone
 * `\r` (its `^` matches right after `\r`, so `\s*` eats the `\n`), and TypeDoc
 * keeps the `\r\n`; setu's Markdown/MDX handling only knows `\n` (#369).
 *
 * `meta` (positions, `meta.code`) is left alone. Does not mutate: a changed
 * doclet is a shallow copy, an unchanged one keeps its identity, and when no
 * doclet holds a `\r` the input collection itself is returned.
 */
export function normalizeDocletLineEndings(
  collection: TJSDocSaltyCollection<TDoclet>
): TJSDocSaltyCollection<TDoclet> {
  const all = collection().get();
  const seen = new WeakMap<object, unknown>();
  let changed = false;
  const normalised = all.map((doclet) => {
    let copy: TDoclet | undefined;
    for (const [key, item] of Object.entries(doclet)) {
      if (key === 'meta') continue;
      const next = normalizeValue(item, seen);
      if (next !== item) (copy ??= { ...doclet } as TDoclet)[key as keyof TDoclet] = next as never;
    }
    if (!copy) return doclet;
    changed = true;
    return copy;
  });
  return changed ? salty.taffy<TDoclet>(normalised) : collection;
}
