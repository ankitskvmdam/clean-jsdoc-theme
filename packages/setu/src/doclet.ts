import { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';

export interface FilterDocletsOptions {
  /** Keep doclets marked `undocumented: true`. Default: false. */
  includeUndocumented?: boolean;
  /** Keep doclets with `access: 'private'`. Default: false. */
  includePrivate?: boolean;
}

/**
 * Visibility/policy filter shared across consumers (class view, sidebar, …).
 * Does not mutate; returns a new array.
 */
export function filterDoclets<T extends TDoclet>(
  doclets: readonly T[],
  options: FilterDocletsOptions = {}
): T[] {
  const includeUndocumented = options.includeUndocumented ?? false;
  const includePrivate = options.includePrivate ?? false;
  return doclets.filter((d) => {
    if (!includeUndocumented && d.undocumented) return false;
    if (!includePrivate && d.access === 'private') return false;
    return true;
  });
}

export function getAllMembersOfClass(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): TDoclet[] {
  const cls = collection({ kind: 'class', longname }).get();
  if (!Array.isArray(cls) || cls.length === 0) return [];

  return collection({ memberof: longname }).get();
}

/**
 * A class often appears as multiple doclets sharing one `longname` (the `@class`
 * comment, the constructor `MethodDefinition`, and a merged record). JSDoc/salty
 * marks the partial ones with `undocumented: true`; the merged record is the
 * one without that flag. Pick it. If all candidates are flagged, fall back to
 * the one with the most fields populated.
 */
export function getCanonicalClassDoclet(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): TDoclet | null {
  const matches = collection({ kind: 'class', longname }).get();
  if (matches.length === 0) return null;

  const documented = matches.find((d) => !d.undocumented);
  if (documented) return documented;

  return matches.reduce((best, cur) =>
    Object.keys(cur).length > Object.keys(best).length ? cur : best
  );
}
