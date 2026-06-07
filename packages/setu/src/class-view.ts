import {
  PageKind,
  TDoclet,
  TDocletParam,
  TJSDocSaltyCollection,
} from '@clean-jsdoc-theme/utils';
import {
  FilterDocletsOptions,
  filterDoclets,
  getAllMembersOfClass,
  getCanonicalClassDoclet,
  getCanonicalDoclet,
} from './doclet';

export type GetClassViewOptions = FilterDocletsOptions;

export interface ClassMember extends TDoclet {
  /** Longname of the ancestor this member was inherited from. Absent on own members. */
  inheritedFrom?: string;
}

export interface MemberBuckets {
  instanceMethods: ClassMember[];
  staticMethods: ClassMember[];
  instanceFields: ClassMember[];
  staticFields: ClassMember[];
  enums: ClassMember[];
  events: ClassMember[];
  /** Anything that did not match a bucket above (e.g. typedef nested under a class). */
  other: ClassMember[];
}

export interface ClassView extends MemberBuckets {
  /** Canonical class doclet — see {@link getCanonicalClassDoclet}. */
  doclet: TDoclet;
  /** Parent class longnames in declaration order. Empty if this class extends nothing. */
  augments: string[];
  /** Constructor params, surfaced for convenience. Also present on `doclet.params`. */
  constructorParams: TDocletParam[];
}

/**
 * Kind-parametric superset of {@link ClassView}: the same shape plus the page
 * `kind`. Covers any container (class/interface/mixin/module/namespace). A
 * {@link ClassView} is just a `ContainerView` with `kind: 'class'`.
 */
export interface ContainerView extends MemberBuckets {
  /** Canonical container doclet — see {@link getCanonicalDoclet}. */
  doclet: TDoclet;
  /** The page kind this container renders as. */
  kind: PageKind;
  /** Parent longnames in declaration order. Empty if this container extends nothing. */
  augments: string[];
  /** Constructor params, surfaced for convenience. Empty for non-class kinds. */
  constructorParams: TDocletParam[];
}

/**
 * Stable key used to detect when one member shadows another. Two members on
 * different scopes (instance vs static) with the same name are distinct
 * surfaces, so scope is part of the key.
 */
export function shadowKey(d: TDoclet): string {
  return `${d.kind ?? ''}:${d.scope ?? ''}:${d.name ?? ''}`;
}

/**
 * Pure: bucket a flat list of members into roles (instance/static, methods/
 * fields, enums, events). Order within each bucket is preserved.
 */
export function bucketClassMembers(members: readonly ClassMember[]): MemberBuckets {
  const buckets: MemberBuckets = {
    instanceMethods: [],
    staticMethods: [],
    instanceFields: [],
    staticFields: [],
    enums: [],
    events: [],
    other: [],
  };

  for (const m of members) {
    if (m.kind === 'event') {
      buckets.events.push(m);
    } else if (m.isEnum) {
      buckets.enums.push(m);
    } else if (m.kind === 'function') {
      (m.scope === 'static' ? buckets.staticMethods : buckets.instanceMethods).push(m);
    } else if (m.kind === 'member') {
      (m.scope === 'static' ? buckets.staticFields : buckets.instanceFields).push(m);
    } else {
      buckets.other.push(m);
    }
  }

  return buckets;
}

/**
 * Returns ancestor class longnames reachable from `longname` via `augments`,
 * in BFS order. Excludes `longname` itself. Safe against cycles and missing
 * ancestors (chain stops where the parent doclet is not found).
 */
export function walkAugmentsChain(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string
): string[] {
  const result: string[] = [];
  const visited = new Set<string>([longname]);
  const start = getCanonicalClassDoclet(collection, longname);
  const queue: string[] = [...(start?.augments ?? [])];

  while (queue.length > 0) {
    const parent = queue.shift() as string;
    if (visited.has(parent)) continue;
    visited.add(parent);
    result.push(parent);

    const parentDoclet = getCanonicalClassDoclet(collection, parent);
    if (parentDoclet?.augments) queue.push(...parentDoclet.augments);
  }

  return result;
}

/**
 * Members inherited from `longname`'s ancestors, with `inheritedFrom` set to
 * the ancestor's longname. Walks via {@link walkAugmentsChain} so closer
 * ancestors win shadow conflicts over distant ones. Does NOT shadow against
 * the class's own members — pass own-member shadow keys via `shadowedBy` for
 * that, or let {@link getClassView} compose it for you.
 */
export function getInheritedMembers(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  options: GetClassViewOptions = {},
  shadowedBy: ReadonlySet<string> = new Set()
): ClassMember[] {
  const taken = new Set<string>(shadowedBy);
  const inherited: ClassMember[] = [];

  for (const ancestor of walkAugmentsChain(collection, longname)) {
    const members = filterDoclets(getAllMembersOfClass(collection, ancestor), options);
    for (const m of members) {
      const key = shadowKey(m);
      if (taken.has(key)) continue;
      taken.add(key);
      inherited.push({ ...m, inheritedFrom: ancestor });
    }
  }

  return inherited;
}

/**
 * Returns the class's own members, filtered by `options`, with `inheritedFrom`
 * set on any doclets that JSDoc itself marked as inherited (via `inherited` +
 * `inherits` fields — distinct from the `augments` walk we do separately).
 */
export function getOwnClassMembers(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  options: GetClassViewOptions = {}
): ClassMember[] {
  return filterDoclets(getAllMembersOfClass(collection, longname), options).map((d) =>
    d.inherited && d.inherits ? { ...d, inheritedFrom: d.inherits } : { ...d }
  );
}

/**
 * Composes the building blocks into a container view ready for the renderer.
 * Returns `null` if no doclet of `kind` matches `longname`.
 *
 * - Own members are kind-agnostic (via {@link getOwnClassMembers}).
 * - The inheritance walk ({@link getInheritedMembers}) runs only for `class`
 *   and `interface` — the kinds that `@augments`/`@extends`. Other containers
 *   use own members only.
 * - `constructorParams` is populated only for `class` (`canonical.params`);
 *   empty for every other kind.
 */
export function getContainerView(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  kind: PageKind,
  options: GetClassViewOptions = {}
): ContainerView | null {
  const canonical = getCanonicalDoclet(collection, longname, kind);
  if (!canonical) return null;

  const own = getOwnClassMembers(collection, longname, options);

  const walksInheritance = kind === 'class' || kind === 'interface';
  let inherited: ClassMember[] = [];
  if (walksInheritance) {
    const ownKeys = new Set(own.map(shadowKey));
    inherited = getInheritedMembers(collection, longname, options, ownKeys);
  }

  const constructorParams = kind === 'class' ? canonical.params ?? [] : [];

  return {
    doclet: canonical,
    kind,
    augments: canonical.augments ?? [],
    constructorParams,
    ...bucketClassMembers([...own, ...inherited]),
  };
}

/**
 * Composes the building blocks into a class view ready for the renderer.
 * Returns `null` if no class doclet matches `longname`. Thin alias over
 * {@link getContainerView} with `kind: 'class'`.
 */
export function getClassView(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  options: GetClassViewOptions = {}
): ClassView | null {
  return getContainerView(collection, longname, 'class', options);
}
