import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { filterDoclets, getAllMembersOfClass, getMembersOf } from '../doclet';
import { getContainerView } from '../class-view';
import { generateSite } from '../index';
import { getJSDocTaffyData } from './factory';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

/**
 * Mirrors JSDoc's output for an ES6 class carrying both `@class` and an explicit
 * `@constructor` tag: the canonical class doclet ends up with
 * `memberof === longname` (a member of itself), alongside its real members.
 */
function makeSelfReferentialClass(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    // The culprit: canonical class doclet that JSDoc marked memberof: 'User'.
    {
      kind: 'class',
      name: 'User',
      longname: 'User',
      scope: 'global',
      memberof: 'User',
      classdesc: 'Represents a system user.',
      params: [
        { name: 'id', type: { names: ['string'] }, description: 'Unique identifier' },
        { name: 'name', type: { names: ['string'] }, description: 'Full name' },
      ],
      meta: { filename: 'Users.js', path: 'models', lineno: 5 },
    },
    {
      kind: 'function',
      name: 'getId',
      longname: 'User#getId',
      memberof: 'User',
      scope: 'instance',
    },
    {
      kind: 'function',
      name: 'updateName',
      longname: 'User#updateName',
      memberof: 'User',
      scope: 'instance',
    },
    {
      kind: 'member',
      name: 'name',
      longname: 'User#name',
      memberof: 'User',
      scope: 'instance',
    },
    {
      kind: 'member',
      name: 'createdAt',
      longname: 'User#createdAt',
      memberof: 'User',
      scope: 'instance',
    },
  ]);
}

describe('getAllMembersOfClass', () => {
  it('returns an empty array when the class does not exist', () => {
    const collection = getJSDocTaffyData();
    expect(getAllMembersOfClass(collection, 'NoSuchClass')).toEqual([]);
  });

  it('returns every JSDoc-declared member of the DataProcessor class', () => {
    const collection = getJSDocTaffyData();
    const members = getAllMembersOfClass(collection, 'DataProcessor');

    // All returned doclets belong to DataProcessor.
    for (const m of members) {
      expect(m.memberof).toBe('DataProcessor');
    }

    const names = members.map((m) => m.name);

    // Every JSDoc-commented member from DataProcessor.js.
    expect(names).toContain('processCount'); // @private field (#processCount)
    expect(names).toContain('States'); // @enum
    expect(names).toContain('process'); // async method
    expect(names).toContain('idGenerator'); // @generator
    expect(names).toContain('serialize'); // @override
    expect(names).toContain('isValidId'); // @static utility
    expect(names).toContain('dataProcessed'); // @event fired in process()
  });

  it('does not leak doclets that belong outside the class', () => {
    const collection = getJSDocTaffyData();
    const members = getAllMembersOfClass(collection, 'DataProcessor');

    // memberof must always point at DataProcessor — no other scope can sneak in.
    for (const m of members) {
      expect(m.memberof).toBe('DataProcessor');
    }

    // None of the top-level / sibling entities from DataProcessor.js should appear.
    const names = members.map((m) => m.name);
    expect(names).not.toContain('BaseEntity'); // parent class
    expect(names).not.toContain('LoggerMixin'); // sibling @mixin
    expect(names).not.toContain('log'); // method on LoggerMixin
    expect(names).not.toContain('Utils'); // sibling @namespace
    expect(names).not.toContain('API_VERSION'); // member of Utils, not DataProcessor

    // The DataProcessor class doclet itself is not a member of itself.
    const longnames = members.map((m) => m.longname);
    expect(longnames).not.toContain('DataProcessor');
  });
});

describe('getMembersOf — container self-reference', () => {
  it('excludes the container doclet whose memberof equals its own longname', () => {
    const collection = makeSelfReferentialClass();
    const members = getMembersOf(collection, 'User');

    // The leaked self-doclet (longname === 'User') must not appear as a member.
    expect(members.map((m) => m.longname)).not.toContain('User');

    // The real members are all still present.
    expect(members.map((m) => m.name).sort()).toEqual(['createdAt', 'getId', 'name', 'updateName']);
  });
});

describe('getContainerView — self-referential class', () => {
  it('does not surface the class name as a duplicate "Other" member', () => {
    const collection = makeSelfReferentialClass();
    const view = getContainerView(collection, 'User', 'class');
    expect(view).not.toBeNull();

    // No leaked self-doclet anywhere in the buckets — "Other" stays empty.
    expect(view!.other).toHaveLength(0);
    const allLongnames = [
      ...view!.instanceMethods,
      ...view!.instanceFields,
      ...view!.staticMethods,
      ...view!.staticFields,
      ...view!.other,
    ].map((m) => m.longname);
    expect(allLongnames).not.toContain('User');

    // Real members land in their correct buckets.
    expect(view!.instanceMethods.map((m) => m.name).sort()).toEqual(['getId', 'updateName']);
    expect(view!.instanceFields.map((m) => m.name).sort()).toEqual(['createdAt', 'name']);

    // The Constructor section is unaffected.
    expect(view!.constructorParams.map((p) => p.name)).toEqual(['id', 'name']);
  });
});

/**
 * Mirrors JSDoc 4's output for a documented ES private method (`#secret() {}`):
 * the parser can't name it, so the doclet arrives with `name: ''` and
 * `longname: ''`, yet still `memberof` its class, next to a normal member.
 */
function makeClassWithNamelessMember(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    {
      kind: 'class',
      name: 'Odd',
      longname: 'Odd',
      scope: 'global',
      classdesc: 'Holder.',
      meta: { filename: 'odd.js', path: 'src', lineno: 1 },
    },
    {
      kind: 'function',
      name: '',
      longname: '',
      memberof: 'Odd',
      description: 'Private-ish.',
      params: [],
      meta: { filename: 'odd.js', path: 'src', lineno: 3, code: { name: 'Odd#' } },
    },
    {
      kind: 'function',
      name: 'visible',
      longname: 'Odd#visible',
      memberof: 'Odd',
      scope: 'instance',
      description: 'Visible.',
      meta: { filename: 'odd.js', path: 'src', lineno: 5 },
    },
  ]);
}

describe('filterDoclets', () => {
  const named = { kind: 'function', name: 'ok', longname: 'X#ok' } as TDoclet;

  it('drops nameless doclets', () => {
    const nameless = { kind: 'function', name: '', longname: '' } as TDoclet;
    expect(filterDoclets([nameless, named])).toEqual([named]);
  });

  it('drops nameless doclets even when every include option is on', () => {
    const nameless = { kind: 'function', name: '', longname: '', undocumented: true } as TDoclet;
    expect(filterDoclets([nameless], { includePrivate: true, includeUndocumented: true })).toEqual(
      []
    );
  });

  it('keeps named doclets and still applies the private/undocumented policy', () => {
    const priv = { ...named, name: 'p', longname: 'X#p', access: 'private' } as TDoclet;
    const undoc = { ...named, name: 'u', longname: 'X#u', undocumented: true } as TDoclet;
    expect(filterDoclets([named, priv, undoc])).toEqual([named]);
  });
});

describe('nameless members (JSDoc ES #private)', () => {
  it('are left out of the container view; named members are kept', () => {
    const view = getContainerView(makeClassWithNamelessMember(), 'Odd', 'class');
    expect(view).not.toBeNull();
    const all = [
      ...view!.instanceMethods,
      ...view!.instanceFields,
      ...view!.staticMethods,
      ...view!.staticFields,
      ...view!.other,
    ];
    expect(all.map((m) => m.name)).toEqual(['visible']);
  });

  it('emit no blank member heading or anchor on the class page', () => {
    const site = generateSite(makeClassWithNamelessMember());
    const page = site.pages.find((p) => p.slug === 'odd');
    expect(page).toBeDefined();
    expect(page!.body).not.toContain('name=""');
    expect(page!.body).not.toContain('id=""');
    expect(page!.body).toContain('name="visible"');
    const headingIds = (page!.headings ?? []).map((h) => h.id);
    expect(headingIds).not.toContain('');
    expect(headingIds).toContain('visible');
  });
});
