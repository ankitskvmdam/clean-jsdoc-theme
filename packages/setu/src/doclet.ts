import salty from '@jsdoc/salty';
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

/** Options for {@link pruneHiddenDoclets}. */
export interface PruneHiddenDocletsOptions {
  /**
   * Keep doclets with `access: 'private'` (JSDoc's `--private`, or `--access`
   * naming `private`/`all`). Default: false. `@ignore` doclets are always pruned.
   */
  includePrivate?: boolean;
}

/** Whether a doclet is hidden on its own account (`@ignore`, or private by policy). */
function isOwnHidden(d: TDoclet, includePrivate: boolean): boolean {
  if (d.ignore === true) return true;
  return !includePrivate && d.access === 'private';
}

/**
 * The site-wide visibility choke point: a NEW collection holding only the
 * doclets that may surface anywhere — pages, nav, link registry, type links,
 * search, `llms.txt` all read from it, so they can never disagree. JSDoc hands
 * templates the raw doclet set (its default template prunes via
 * `templateHelper.prune`); enumerating pages straight off that set is how a
 * `@private` typedef/class/namespace used to get its own page and sidebar entry
 * while `filterDoclets` only hid private *members*.
 *
 * Pruned:
 * - a doclet that is itself `@ignore`d, or `access: 'private'` unless
 *   `includePrivate` (JSDoc's `@private` and `@access private` both set it);
 * - an `undocumented` sibling of a hidden longname — the partial records JSDoc
 *   emits beside a documented container (e.g. a class's constructor
 *   `MethodDefinition`) would otherwise keep the container half-alive;
 * - everything under a hidden container (its `memberof` chain reaches a hidden
 *   longname). Hiding a module/namespace/class hides its whole subtree, nested
 *   containers included, so no page is left orphaned under a parent that has no
 *   page and no link points at one.
 *
 * A class whose only private part is its CONSTRUCTOR stays: JSDoc merges an ES6
 * `constructor` comment into the class doclet, so `/** @private *\/ constructor`
 * makes the whole class read `access: 'private'` (see {@link ctorOnlyPrivate}).
 * Its page and public members are kept; the copy that replaces the doclet drops
 * the borrowed `access` and hides the Constructor section instead.
 *
 * A longname is hidden only when EVERY documented doclet for it is hidden, so a
 * private overload never takes a public one down with it. Undocumented doclets
 * are otherwise kept (signature recovery and canonical-doclet fallback read
 * them); member-level undocumented filtering stays in {@link filterDoclets}.
 * Does not mutate: doclet objects are shared with the input collection.
 */
export function pruneHiddenDoclets(
  collection: TJSDocSaltyCollection<TDoclet>,
  options: PruneHiddenDocletsOptions = {}
): TJSDocSaltyCollection<TDoclet> {
  const includePrivate = options.includePrivate ?? false;
  const all = collection().get();
  const ctorOnly = includePrivate ? new Set<TDoclet>() : ctorOnlyPrivate(all);
  const hiddenSelf = (d: TDoclet) => isOwnHidden(d, includePrivate) && !ctorOnly.has(d);
  // Nothing to hide or rewrite → hand back the input untouched.
  if (ctorOnly.size === 0 && !all.some(hiddenSelf)) return collection;

  const hiddenCandidates = new Set<string>();
  const visibleDocumented = new Set<string>();
  // longname → memberof, for the ancestor walk. Documented doclets win: an
  // undocumented partial can carry a different (or self-referencing) memberof.
  const parentOf = new Map<string, string>();
  for (const d of all) {
    if (!d.longname) continue;
    if (d.memberof && (!d.undocumented || !parentOf.has(d.longname))) {
      parentOf.set(d.longname, d.memberof);
    }
    if (d.undocumented) continue;
    if (hiddenSelf(d)) hiddenCandidates.add(d.longname);
    else visibleDocumented.add(d.longname);
  }
  const hidden = new Set([...hiddenCandidates].filter((ln) => !visibleDocumented.has(ln)));

  const underHidden = (d: TDoclet): boolean => {
    const seen = new Set<string>();
    let owner = d.memberof;
    while (owner && !seen.has(owner)) {
      if (hidden.has(owner)) return true;
      seen.add(owner);
      owner = parentOf.get(owner);
    }
    return false;
  };

  const kept = all
    .filter((d) => {
      if (hiddenSelf(d)) return false;
      if (d.undocumented && d.longname && hidden.has(d.longname)) return false;
      return !underHidden(d);
    })
    .map((d) => (ctorOnly.has(d) ? withoutPrivateConstructor(d) : d));
  return salty.taffy<TDoclet>(kept);
}

/**
 * Documented class doclets whose `access: 'private'` came from a `@private`
 * ES6 constructor, not from the class comment. JSDoc's `-X` output for
 * `/** Foo. *\/ class Foo { /** @private *\/ constructor() {} }` is:
 * - `Foo` (documented): `access: 'private'`, `classdesc` from the class comment;
 * - `Foo#Foo` (undocumented `kind: 'class'`, the constructor record): `access: 'private'`;
 * - `Foo` (undocumented `kind: 'class'`, the class-comment record): NO `access`.
 *
 * When the class comment itself says `@private`, that last record carries
 * `access: 'private'` too — so that record is what tells the two apart.
 */
function ctorOnlyPrivate(all: readonly TDoclet[]): Set<TDoclet> {
  const privateUndocumentedClasses = new Set<string>();
  for (const d of all) {
    if (d.undocumented && d.kind === 'class' && d.access === 'private' && d.longname) {
      privateUndocumentedClasses.add(d.longname);
    }
  }
  const out = new Set<TDoclet>();
  for (const d of all) {
    if (d.undocumented || d.kind !== 'class' || d.access !== 'private') continue;
    if (!d.longname || !d.name) continue;
    if (!privateUndocumentedClasses.has(`${d.longname}#${d.name}`)) continue;
    if (privateUndocumentedClasses.has(d.longname)) continue; // the class itself is private
    out.add(d);
  }
  return out;
}

/**
 * A shallow copy of a class doclet whose constructor is private: drop the
 * borrowed `access` (the class is public), hide the Constructor section via
 * `hideconstructor`, and drop the constructor's own `params` and `description`
 * (JSDoc puts the constructor comment in `description`; the class comment is in
 * `classdesc`, and the body's `classdesc ?? description` fallback would
 * otherwise show the private text on a class with no comment of its own). The
 * input doclet is not mutated.
 */
function withoutPrivateConstructor(d: TDoclet): TDoclet {
  const copy: TDoclet = { ...d, hideconstructor: true };
  delete copy.access;
  delete copy.params;
  delete copy.description;
  return copy;
}

/**
 * All doclets whose `memberof` is `longname` — the members of a container
 * (class, interface, mixin, module, namespace, …). Kind-agnostic: callers are
 * expected to check the canonical container doclet exists first.
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
): TDoclet[] {
  return collection({ memberof: longname })
    .get()
    .filter((d) => d.longname !== longname);
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
