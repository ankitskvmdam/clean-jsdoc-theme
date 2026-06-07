import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import {
  bucketClassMembers,
  ClassMember,
  ContainerView,
  getClassView,
  getContainerView,
  getInheritedMembers,
  getOwnClassMembers,
  mergeContainerViews,
  shadowKey,
  walkAugmentsChain,
} from '../class-view';
import { getJSDocTaffyData } from './factory';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

// Minimal synthetic class hierarchy: GrandParent ← Parent ← Child.
// The real fixture has no `@augments` anywhere, so we build our own for the
// inheritance tests.
function makeInheritanceCollection(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    { kind: 'class', name: 'GrandParent', longname: 'GrandParent', scope: 'global' },
    {
      kind: 'function',
      name: 'fromGrandParent',
      longname: 'GrandParent#fromGrandParent',
      memberof: 'GrandParent',
      scope: 'instance',
    },
    {
      kind: 'function',
      name: 'shared',
      longname: 'GrandParent#shared',
      memberof: 'GrandParent',
      scope: 'instance',
    },

    {
      kind: 'class',
      name: 'Parent',
      longname: 'Parent',
      scope: 'global',
      augments: ['GrandParent'],
    },
    {
      kind: 'function',
      name: 'fromParent',
      longname: 'Parent#fromParent',
      memberof: 'Parent',
      scope: 'instance',
    },
    {
      kind: 'function',
      name: 'shared',
      longname: 'Parent#shared',
      memberof: 'Parent',
      scope: 'instance',
    },

    {
      kind: 'class',
      name: 'Child',
      longname: 'Child',
      scope: 'global',
      augments: ['Parent'],
    },
    {
      kind: 'function',
      name: 'fromChild',
      longname: 'Child#fromChild',
      memberof: 'Child',
      scope: 'instance',
    },
    {
      kind: 'function',
      name: 'fromParent', // child overrides parent
      longname: 'Child#fromParent',
      memberof: 'Child',
      scope: 'instance',
    },
  ]);
}

describe('shadowKey', () => {
  it('distinguishes members that differ in kind, scope, or name', () => {
    const a = { kind: 'function', scope: 'instance', name: 'foo' } as TDoclet;
    const b = { kind: 'function', scope: 'static', name: 'foo' } as TDoclet;
    const c = { kind: 'member', scope: 'instance', name: 'foo' } as TDoclet;
    const d = { kind: 'function', scope: 'instance', name: 'bar' } as TDoclet;

    const keys = [shadowKey(a), shadowKey(b), shadowKey(c), shadowKey(d)];
    expect(new Set(keys).size).toBe(4);
  });

  it('treats two members with same kind/scope/name as the same shadow surface', () => {
    const own = { kind: 'function', scope: 'instance', name: 'serialize' } as TDoclet;
    const parent = { kind: 'function', scope: 'instance', name: 'serialize' } as TDoclet;
    expect(shadowKey(own)).toBe(shadowKey(parent));
  });
});

describe('bucketClassMembers', () => {
  it('routes each kind/scope/isEnum combination to its bucket', () => {
    const members: ClassMember[] = [
      { kind: 'function', scope: 'instance', name: 'a' },
      { kind: 'function', scope: 'static', name: 'b' },
      { kind: 'member', scope: 'instance', name: 'c' },
      { kind: 'member', scope: 'static', name: 'd' },
      { kind: 'member', scope: 'instance', name: 'e', isEnum: true },
      { kind: 'event', scope: 'instance', name: 'f' },
      { kind: 'typedef', scope: 'inner', name: 'g' },
    ];
    const b = bucketClassMembers(members);
    expect(b.instanceMethods.map((m) => m.name)).toEqual(['a']);
    expect(b.staticMethods.map((m) => m.name)).toEqual(['b']);
    expect(b.instanceFields.map((m) => m.name)).toEqual(['c']);
    expect(b.staticFields.map((m) => m.name)).toEqual(['d']);
    expect(b.enums.map((m) => m.name)).toEqual(['e']);
    expect(b.events.map((m) => m.name)).toEqual(['f']);
    expect(b.other.map((m) => m.name)).toEqual(['g']);
  });

  it('preserves insertion order within each bucket', () => {
    const members: ClassMember[] = [
      { kind: 'function', scope: 'instance', name: 'a' },
      { kind: 'function', scope: 'instance', name: 'b' },
      { kind: 'function', scope: 'instance', name: 'c' },
    ];
    expect(bucketClassMembers(members).instanceMethods.map((m) => m.name)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('walkAugmentsChain', () => {
  it('returns [] when the class has no augments', () => {
    const c = getJSDocTaffyData();
    expect(walkAugmentsChain(c, 'DataProcessor')).toEqual([]);
  });

  it('returns [] when the longname does not resolve to a class', () => {
    expect(walkAugmentsChain(makeInheritanceCollection(), 'NoSuchClass')).toEqual([]);
  });

  it('walks the augments chain breadth-first', () => {
    expect(walkAugmentsChain(makeInheritanceCollection(), 'Child')).toEqual([
      'Parent',
      'GrandParent',
    ]);
  });

  it('is cycle-safe', () => {
    const cyclic = makeCollection([
      { kind: 'class', name: 'A', longname: 'A', augments: ['B'] },
      { kind: 'class', name: 'B', longname: 'B', augments: ['A'] },
    ]);
    expect(walkAugmentsChain(cyclic, 'A')).toEqual(['B']);
  });
});

describe('getOwnClassMembers (filters)', () => {
  it('drops undocumented and private by default', () => {
    const c = getJSDocTaffyData();
    const names = getOwnClassMembers(c, 'DataProcessor').map((m) => m.name);
    // processCount is @private; timeout is undocumented (assigned in constructor).
    expect(names).not.toContain('processCount');
    expect(names).not.toContain('timeout');
    expect(names).toContain('process');
    expect(names).toContain('isValidId');
  });

  it('keeps private when includePrivate: true', () => {
    const c = getJSDocTaffyData();
    const names = getOwnClassMembers(c, 'DataProcessor', { includePrivate: true }).map(
      (m) => m.name
    );
    expect(names).toContain('processCount');
  });

  it('keeps undocumented when includeUndocumented: true', () => {
    const c = getJSDocTaffyData();
    const names = getOwnClassMembers(c, 'DataProcessor', { includeUndocumented: true }).map(
      (m) => m.name
    );
    expect(names).toContain('timeout');
  });
});

describe('getInheritedMembers', () => {
  it('returns [] for a class with no augments', () => {
    expect(getInheritedMembers(getJSDocTaffyData(), 'DataProcessor')).toEqual([]);
  });

  it('collects ancestor members and tags each with inheritedFrom', () => {
    const c = makeInheritanceCollection();
    const inherited = getInheritedMembers(c, 'Child');
    const byName = Object.fromEntries(inherited.map((m) => [m.name, m]));

    expect(byName.fromParent.inheritedFrom).toBe('Parent');
    expect(byName.fromGrandParent.inheritedFrom).toBe('GrandParent');
    // `shared` exists on both ancestors — closer (Parent) wins.
    expect(byName.shared.inheritedFrom).toBe('Parent');
  });

  it('skips ancestor members shadowed by the shadowedBy set', () => {
    const c = makeInheritanceCollection();
    const own = getOwnClassMembers(c, 'Child');
    const ownKeys = new Set(own.map(shadowKey));
    const inherited = getInheritedMembers(c, 'Child', {}, ownKeys);

    // Child overrides Parent#fromParent — must not appear as inherited.
    expect(inherited.find((m) => m.name === 'fromParent')).toBeUndefined();
  });
});

describe('getClassView', () => {
  it('returns null for a longname that does not resolve to a class', () => {
    expect(getClassView(getJSDocTaffyData(), 'NoSuchClass')).toBeNull();
  });

  it('picks the canonical class doclet (merged, not undocumented)', () => {
    const view = getClassView(getJSDocTaffyData(), 'DataProcessor');
    expect(view).not.toBeNull();
    expect(view!.doclet.undocumented).toBeUndefined();
    // The merged doclet carries both the description AND the constructor params.
    expect(view!.doclet.summary).toMatch(/Advanced data processing suite/);
    expect(view!.constructorParams.length).toBeGreaterThan(0);
  });

  it('buckets DataProcessor members correctly (default filters)', () => {
    const v = getClassView(getJSDocTaffyData(), 'DataProcessor')!;
    const names = (xs: ClassMember[]) => xs.map((m) => m.name);

    expect(names(v.instanceMethods)).toEqual(expect.arrayContaining(['process', 'idGenerator', 'serialize']));
    expect(names(v.staticMethods)).toEqual(['isValidId']);
    expect(names(v.events)).toEqual(['dataProcessed']);
    expect(names(v.enums)).toEqual(['States']);
    // processCount (@private) and timeout (undocumented) are dropped by default.
    expect(names(v.instanceFields)).not.toContain('processCount');
    expect(names(v.instanceFields)).not.toContain('timeout');
  });

  it('exposes inheritance: own + ancestor members, with child shadowing', () => {
    const v = getClassView(makeInheritanceCollection(), 'Child')!;
    const byName = Object.fromEntries(v.instanceMethods.map((m) => [m.name, m]));

    expect(byName.fromChild.inheritedFrom).toBeUndefined();
    expect(byName.fromParent.inheritedFrom).toBeUndefined(); // child's own override
    expect(byName.fromGrandParent.inheritedFrom).toBe('GrandParent');
    expect(byName.shared.inheritedFrom).toBe('Parent');
  });
});

describe('getContainerView (non-class kinds)', () => {
  const names = (xs: ClassMember[]) => xs.map((m) => m.name);

  it('returns null when no doclet of the kind matches', () => {
    expect(getContainerView(getJSDocTaffyData(), 'NoSuch', 'module')).toBeNull();
    // A real class longname queried as the wrong kind resolves to nothing.
    expect(getContainerView(getJSDocTaffyData(), 'DataProcessor', 'module')).toBeNull();
  });

  it('builds a module view with empty constructorParams and bucketed members', () => {
    const v = getContainerView(getJSDocTaffyData(), 'module:UserService', 'module')!;
    expect(v.kind).toBe('module');
    expect(v.constructorParams).toEqual([]);
    // The module exposes a factory function plus inner typedef/callback symbols.
    expect(names(v.instanceMethods)).toContain('createUser');
    expect(names(v.other)).toEqual(
      expect.arrayContaining(['CreateUserPayload', 'CreateUserCallback']),
    );
  });

  it('builds a namespace view with own members only and no constructorParams', () => {
    const v = getContainerView(getJSDocTaffyData(), 'Utils', 'namespace')!;
    expect(v.kind).toBe('namespace');
    expect(v.constructorParams).toEqual([]);
    // API_VERSION is a `kind: 'constant'`, which falls into the `other` bucket.
    expect(names(v.other)).toContain('API_VERSION');
  });

  it('builds an interface view; constructorParams empty, instance method bucketed', () => {
    const v = getContainerView(
      getJSDocTaffyData(),
      'module:CoreSchema~ISerializable',
      'interface',
    )!;
    expect(v.kind).toBe('interface');
    expect(v.constructorParams).toEqual([]);
    expect(names(v.instanceMethods)).toContain('serialize');
  });

  it('builds a mixin view; constructorParams empty, static method bucketed', () => {
    const v = getContainerView(getJSDocTaffyData(), 'LoggerMixin', 'mixin')!;
    expect(v.kind).toBe('mixin');
    expect(v.constructorParams).toEqual([]);
    expect(names(v.staticMethods)).toContain('log');
  });
});

describe('mergeContainerViews', () => {
  const emptyBuckets = () => ({
    instanceMethods: [] as ClassMember[],
    staticMethods: [] as ClassMember[],
    instanceFields: [] as ClassMember[],
    staticFields: [] as ClassMember[],
    enums: [] as ClassMember[],
    events: [] as ClassMember[],
    other: [] as ClassMember[],
  });

  // The `~Name` doclet: classdesc + implements + an instance method, no params.
  const baseView = (): ContainerView => ({
    doclet: {
      kind: 'class',
      name: 'Queue',
      longname: 'module:queue/Queue~Queue',
      classdesc: 'A FIFO queue.',
      implements: ['module:queue~IQueue'],
    },
    kind: 'class',
    augments: [],
    constructorParams: [],
    ...emptyBuckets(),
    instanceMethods: [
      { kind: 'function', scope: 'instance', name: 'push', longname: 'module:queue/Queue~Queue#push' },
    ],
  });

  // The `.Name` doclet: constructor params + a static member, no classdesc.
  const extraView = (): ContainerView => ({
    doclet: {
      kind: 'class',
      name: 'Queue',
      longname: 'module:queue/Queue.Queue',
      params: [{ name: 'capacity', type: { names: ['number'] } }],
    },
    kind: 'class',
    augments: [],
    constructorParams: [{ name: 'capacity', type: { names: ['number'] } }],
    ...emptyBuckets(),
    staticMethods: [
      { kind: 'function', scope: 'static', name: 'from', longname: 'module:queue/Queue.Queue.from' },
    ],
  });

  it('keeps base classdesc + implements and adopts extra constructor params', () => {
    const merged = mergeContainerViews(baseView(), extraView());
    expect(merged.doclet.classdesc).toBe('A FIFO queue.');
    expect(merged.doclet.implements).toEqual(['module:queue~IQueue']);
    expect(merged.constructorParams.length).toBeGreaterThan(0);
    expect(merged.doclet.params).toEqual([{ name: 'capacity', type: { names: ['number'] } }]);
    expect(merged.kind).toBe('class');
  });

  it('unions members from both views', () => {
    const merged = mergeContainerViews(baseView(), extraView());
    expect(merged.instanceMethods.map((m) => m.name)).toEqual(['push']);
    expect(merged.staticMethods.map((m) => m.name)).toEqual(['from']);
  });

  it('content survives even when it lives only on extra (order-independent completeness)', () => {
    // Swap roles: classdesc only on `extra`. The merged view must still carry it,
    // filling the gap base left empty.
    const base = baseView();
    base.doclet.classdesc = undefined;
    const extra = extraView();
    extra.doclet.classdesc = 'A FIFO queue.';
    const merged = mergeContainerViews(base, extra);
    expect(merged.doclet.classdesc).toBe('A FIFO queue.');
  });

  it('dedupes members present in both views by shadowKey (no dupes)', () => {
    const shared: ClassMember = {
      kind: 'function',
      scope: 'instance',
      name: 'push',
      longname: 'module:queue/Queue~Queue#push',
    };
    const a = baseView();
    a.instanceMethods = [shared];
    const b = extraView();
    b.instanceMethods = [{ ...shared }]; // same shadow surface
    const merged = mergeContainerViews(a, b);
    expect(merged.instanceMethods).toHaveLength(1);
    expect(merged.instanceMethods[0].name).toBe('push');
  });
});
