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

/**
 * All doclets whose `memberof` is `longname` — the members of a container
 * (class, interface, mixin, module, namespace, …). Kind-agnostic: callers are
 * expected to check the canonical container doclet exists first.
 */
export function getMembersOf(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): TDoclet[] {
  return collection({ memberof: longname }).get();
}

/** Alias for {@link getMembersOf} retained for existing class-path callers. */
export function getAllMembersOfClass(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): TDoclet[] {
  return getMembersOf(collection, longname);
}

/**
 * A container often appears as multiple doclets sharing one `longname` (e.g. a
 * class's `@class` comment, the constructor `MethodDefinition`, and a merged
 * record). JSDoc/salty marks the partial ones with `undocumented: true`; the
 * merged record is the one without that flag. Pick it. If all candidates are
 * flagged, fall back to the one with the most fields populated. When `kind` is
 * given, the query is narrowed to that kind.
 */
export function getCanonicalDoclet(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  kind?: string
): TDoclet | null {
  const matches = collection(kind ? { kind, longname } : { longname }).get();
  if (matches.length === 0) return null;

  const documented = matches.find((d) => !d.undocumented);
  if (documented) return documented;

  return matches.reduce((best, cur) =>
    Object.keys(cur).length > Object.keys(best).length ? cur : best
  );
}

/**
 * Alias for {@link getCanonicalDoclet} narrowed to `kind: 'class'`. Retained
 * for existing class-path callers (e.g. {@link walkAugmentsChain}).
 */
export function getCanonicalClassDoclet(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): TDoclet | null {
  return getCanonicalDoclet(collection, longname, 'class');
}
