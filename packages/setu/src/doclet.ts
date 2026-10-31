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

/** A doclet with a non-empty `name`: the only kind that can become a member. */
export type NamedDoclet = TDoclet & { name: string };

/**
 * True for a doclet whose name is not the empty string. Applied by the two readers that turn
 * doclets into headed symbols — {@link getMembersOf} (every container's own and
 * inherited members) and {@link getGlobalDoclets} (the Globals page) — so no
 * nameless doclet reaches a member list, heading, TOC entry, search entry or
 * link-registry key. Containers are already safe: they are enumerated by a
 * non-empty longname. The `NamedDoclet` return type carries the guarantee to
 * every consumer (`ClassMember.name` is a `string`).
 *
 * Where empty names come from, in both flavors:
 * - JSDoc 4 can't name an ES private method, instance or static, so a
 *   documented `#secret() {}` arrives as `name: ''`, `longname: ''` (still
 *   `memberof` its class, with no `scope` or `access`). Private fields
 *   (`#f = 1`) are unaffected: they keep their name and `access: 'private'`.
 * - TypeDoc names reflections after their source key, so a TS property
 *   declared as `'': number` arrives with `name: ''`.
 *
 * Either way there is nothing to title a heading with or link to, so the doclet
 * is dropped for both flavors. This is not a visibility rule, so it applies
 * whatever the options (even `includePrivate`). Dropped silently: there's no
 * name to report, and the author can't fix it short of renaming. A blank but
 * non-empty name (TypeDoc keeps `' '`) is a real member and is kept; its
 * heading gets a fallback anchor (see utils' `memberAnchor`).
 */
export function isNamedDoclet<T extends TDoclet>(d: T): d is T & { name: string } {
  return typeof d.name === 'string' && d.name !== '';
}

/**
 * All named doclets whose `memberof` is `longname` — the members of a container
 * (class, interface, mixin, module, namespace, …). Kind-agnostic: callers are
 * expected to check the canonical container doclet exists first. Nameless
 * doclets are dropped (see {@link isNamedDoclet}).
 *
 * Excludes the container's own doclet: JSDoc can emit a container whose
 * `memberof` equals its own `longname` (an ES6 class with an explicit
 * `@constructor`/`@class` tag is the common trigger), which would otherwise
 * render as a duplicate member heading (the class name) under "Other". A real
 * member's longname is always `<container><sep><name>`, never the container
 * longname itself, so dropping `d.longname === longname` is always safe.
 */
export function getMembersOf(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): NamedDoclet[] {
  return collection({ memberof: longname })
    .get()
    .filter(isNamedDoclet)
    .filter((d) => d.longname !== longname);
}

/**
 * All named global-scope doclets — the candidates for the Globals page. Nameless
 * doclets are dropped (see {@link isNamedDoclet}).
 */
export function getGlobalDoclets(collection: TJSDocSaltyCollection<TDoclet>): NamedDoclet[] {
  return collection({ scope: 'global' }).get().filter(isNamedDoclet);
}

/** Alias for {@link getMembersOf} retained for existing class-path callers. */
export function getAllMembersOfClass(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): NamedDoclet[] {
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
