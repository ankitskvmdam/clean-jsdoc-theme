import { PageKind, TDoclet, TDocletParam, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
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
  /**
   * Ordered constructor parameter names, for rendering the call signature when
   * the constructor is undocumented (no `@param` tags, so `constructorParams` is
   * empty). Recovered from the `meta.code.paramnames` of any doclet sharing the
   * longname, so `new Foo(a, b)` still shows. Empty for non-class kinds.
   */
  constructorParamNames: string[];
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

  const constructorParams = kind === 'class' ? (canonical.params ?? []) : [];

  // Signature fallback for an undocumented constructor (no `@param` tags, so
  // `constructorParams` is empty): the param NAMES still live on
  // `meta.code.paramnames`, often on a sibling doclet of the same longname (the
  // canonical/classdesc doclet may carry none). Recover them so the call
  // signature can show `new Foo(a, b)` rather than a bare `new Foo()`. Empty when
  // params are documented (the table-backed `constructorParams` is used instead).
  let constructorParamNames: string[] = [];
  if (kind === 'class' && constructorParams.length === 0) {
    for (const d of collection({ longname }).get()) {
      const names = d.meta?.code?.paramnames;
      if (names && names.length > 0) {
        constructorParamNames = [...names];
        break;
      }
    }
  }

  return {
    doclet: canonical,
    kind,
    augments: canonical.augments ?? [],
    constructorParams,
    constructorParamNames,
    ...bucketClassMembers([...own, ...inherited]),
  };
}

/** First non-empty array, base first; falls back to whichever is defined. */
function pickArr<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): T[] | undefined {
  if (a && a.length) return a as T[];
  if (b && b.length) return b as T[];
  return (a ?? b) as T[] | undefined;
}

/** First defined scalar, base first. */
function pickScalar<T>(a: T | undefined, b: T | undefined): T | undefined {
  return a ?? b;
}

/**
 * Union the seven member buckets of two view, base-first, deduped by
 * {@link shadowKey} so a member present in both sides (e.g. an inherited member
 * that both doclets surface) appears once, keeping the base occurrence.
 */
function mergeMemberBuckets(a: MemberBuckets, b: MemberBuckets): MemberBuckets {
  const keys: (keyof MemberBuckets)[] = [
    'instanceMethods',
    'staticMethods',
    'instanceFields',
    'staticFields',
    'enums',
    'events',
    'other',
  ];
  const out = {} as MemberBuckets;
  for (const k of keys) {
    const seen = new Set<string>();
    const merged: ClassMember[] = [];
    for (const m of [...a[k], ...b[k]]) {
      const key = shadowKey(m);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(m);
    }
    out[k] = merged;
  }
  return out;
}

/**
 * Merge two container views that collapsed onto the same page slug.
 *
 * A single `@module` symbol is frequently emitted by JSDoc as two `kind:'class'`
 * doclets that slugify identically — e.g. `module:queue/Queue~Queue` (carries the
 * `classdesc`, `@augments`/`@implements`/`@mixes`, metadata, and instance
 * members) and `module:queue/Queue.Queue` (carries the constructor `@param`s and
 * possibly other members). The dedup pass would otherwise keep one and drop the
 * other, silently losing whichever fields lived only on the dropped doclet — the
 * surviving page would be missing its Constructor/Parameters section AND any
 * members under the dropped longname. Merging recovers both so neither doclet's
 * classdesc, params, relations, nor members are lost.
 *
 * Deterministic: `base` is the first-seen view, `extra` the colliding one. `base`
 * wins for any field it actually carries; `extra` only fills gaps (empty/absent
 * scalars, empty/absent arrays). Members are unioned and deduped by
 * {@link shadowKey}.
 */
export function mergeContainerViews(base: ContainerView, extra: ContainerView): ContainerView {
  // Start from extra, let base override field-by-field, then patch the fields
  // where base may hold an empty value that extra can fill.
  const doclet: TDoclet = { ...extra.doclet, ...base.doclet };

  // Scalars: first defined, base first.
  doclet.classdesc = pickScalar(base.doclet.classdesc, extra.doclet.classdesc);
  doclet.description = pickScalar(base.doclet.description, extra.doclet.description);
  doclet.summary = pickScalar(base.doclet.summary, extra.doclet.summary);
  doclet.deprecated = pickScalar(base.doclet.deprecated, extra.doclet.deprecated);
  doclet.since = pickScalar(base.doclet.since, extra.doclet.since);
  doclet.version = pickScalar(base.doclet.version, extra.doclet.version);
  doclet.license = pickScalar(base.doclet.license, extra.doclet.license);
  doclet.copyright = pickScalar(base.doclet.copyright, extra.doclet.copyright);
  doclet.this = pickScalar(base.doclet.this, extra.doclet.this);
  doclet.alias = pickScalar(base.doclet.alias, extra.doclet.alias);

  // Arrays: first non-empty, base first. `params` is the critical one — the
  // classdesc doclet usually has none, the constructor doclet has them.
  doclet.params = pickArr(base.doclet.params, extra.doclet.params);
  doclet.augments = pickArr(base.doclet.augments, extra.doclet.augments);
  doclet.implements = pickArr(base.doclet.implements, extra.doclet.implements);
  doclet.mixes = pickArr(base.doclet.mixes, extra.doclet.mixes);
  doclet.examples = pickArr(base.doclet.examples, extra.doclet.examples);
  doclet.properties = pickArr(base.doclet.properties, extra.doclet.properties);
  doclet.fires = pickArr(base.doclet.fires, extra.doclet.fires);
  doclet.listens = pickArr(base.doclet.listens, extra.doclet.listens);
  doclet.see = pickArr(base.doclet.see, extra.doclet.see);
  doclet.todo = pickArr(base.doclet.todo, extra.doclet.todo);
  doclet.author = pickArr(base.doclet.author, extra.doclet.author);
  doclet.requires = pickArr(base.doclet.requires, extra.doclet.requires);
  doclet.tutorials = pickArr(base.doclet.tutorials, extra.doclet.tutorials);

  return {
    doclet,
    kind: base.kind,
    augments: pickArr(base.augments, extra.augments) ?? [],
    constructorParams: base.constructorParams.length
      ? base.constructorParams
      : extra.constructorParams,
    constructorParamNames: base.constructorParamNames.length
      ? base.constructorParamNames
      : extra.constructorParamNames,
    ...mergeMemberBuckets(base, extra),
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
