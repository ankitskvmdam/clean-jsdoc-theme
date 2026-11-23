import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import {
  filterDoclets,
  getAllMembersOfClass,
  getGlobalDoclets,
  getMembersOf,
  isNamedDoclet,
  rehomeAliasedMembers,
} from '../doclet';
import { getContainerView, getInheritedMembers } from '../class-view';
import { generateSite } from '../index';
import { getJSDocTaffyData } from './factory';
import {
  ALIAS_CJS_FILES_DOCLETS,
  ALIAS_COLLISION_DOCLETS,
  ALIAS_DOCLETS,
  ALIAS_MODULE_DOCLETS,
  ALIAS_REPLACEMENT_DOCLETS,
} from './alias-fixture';

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
function makeClassWithNamelessMember(extra: unknown[] = []): TJSDocSaltyCollection<TDoclet> {
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
    ...extra,
  ]);
}

describe('isNamedDoclet', () => {
  it('is true only for a non-empty string name', () => {
    expect(isNamedDoclet({ name: 'ok' } as TDoclet)).toBe(true);
    expect(isNamedDoclet({ name: '' } as TDoclet)).toBe(false);
    expect(isNamedDoclet({} as TDoclet)).toBe(false);
  });
});

describe('getMembersOf — nameless doclets', () => {
  it('drops the nameless member and keeps the named one', () => {
    const members = getMembersOf(makeClassWithNamelessMember(), 'Odd');
    expect(members.map((m) => m.longname)).toEqual(['Odd#visible']);
  });

  it('drops nameless members whatever the visibility options downstream', () => {
    // The drop happens at read time, before filterDoclets' visibility policy,
    // so even "include everything" can't bring a nameless doclet back.
    const members = filterDoclets(getMembersOf(makeClassWithNamelessMember(), 'Odd'), {
      includePrivate: true,
      includeUndocumented: true,
    });
    expect(members.map((m) => m.name)).toEqual(['visible']);
  });
});

describe('getGlobalDoclets — nameless doclets', () => {
  it('drops a nameless global-scope doclet and keeps named globals', () => {
    const collection = makeCollection([
      { kind: 'function', name: '', longname: '', scope: 'global' },
      { kind: 'function', name: 'util', longname: 'util', scope: 'global' },
    ]);
    expect(getGlobalDoclets(collection).map((d) => d.name)).toEqual(['util']);
  });
});

describe('filterDoclets', () => {
  const named = { kind: 'function', name: 'ok', longname: 'X#ok' } as TDoclet;

  it('applies the private/undocumented policy', () => {
    const priv = { ...named, name: 'p', longname: 'X#p', access: 'private' } as TDoclet;
    const undoc = { ...named, name: 'u', longname: 'X#u', undocumented: true } as TDoclet;
    expect(filterDoclets([named, priv, undoc])).toEqual([named]);
    expect(filterDoclets([named, priv, undoc], { includePrivate: true })).toEqual([named, priv]);
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

  it('are not inherited by a subclass; named inherited members are', () => {
    const collection = makeClassWithNamelessMember([
      {
        kind: 'class',
        name: 'Child',
        longname: 'Child',
        scope: 'global',
        augments: ['Odd'],
        classdesc: 'Subclass.',
        meta: { filename: 'child.js', path: 'src', lineno: 1 },
      },
    ]);
    const inherited = getInheritedMembers(collection, 'Child');
    expect(inherited.map((m) => m.name)).toEqual(['visible']);
    expect(inherited[0].inheritedFrom).toBe('Odd');

    const site = generateSite(collection);
    const child = site.pages.find((p) => p.slug === 'child');
    expect(child).toBeDefined();
    expect(child!.body).not.toContain('name=""');
    expect(child!.body).toContain('name="visible"');
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

describe('blank member names (TypeDoc keeps a literal single-space key)', () => {
  it('render with a fallback anchor under the typedoc flavor; empty names drop', () => {
    const collection = makeCollection([
      { kind: 'interface', name: 'Odd', longname: 'Odd', scope: 'global', description: 'Odd.' },
      {
        kind: 'member',
        name: ' ',
        longname: 'Odd. ',
        memberof: 'Odd',
        scope: 'instance',
        description: 'A single space.',
        type: { names: ['string'] },
      },
      {
        kind: 'member',
        name: '\u00a0',
        longname: 'Odd.\u00a0',
        memberof: 'Odd',
        scope: 'instance',
        description: 'A no-break space.',
        type: { names: ['string'] },
      },
      {
        kind: 'member',
        name: '\u200b',
        longname: 'Odd.\u200b',
        memberof: 'Odd',
        scope: 'instance',
        description: 'A zero-width space.',
        type: { names: ['string'] },
      },
      {
        kind: 'member',
        name: '',
        longname: 'Odd.',
        memberof: 'Odd',
        scope: 'instance',
        description: 'The empty string.',
      },
      {
        kind: 'member',
        name: 'normal',
        longname: 'Odd.normal',
        memberof: 'Odd',
        scope: 'instance',
        description: 'Normal.',
      },
    ]);
    const site = generateSite(collection, { flavor: 'typedoc' });
    const page = site.pages.find((p) => p.frontmatter.longname === 'Odd');
    expect(page).toBeDefined();
    expect(page!.body).toContain('id="member--20"');
    expect(page!.body).toContain('id="normal"');
    expect(page!.body).not.toContain('id=""');
    expect(page!.body).not.toContain('The empty string.');
    // The blank name is shown quoted, so its heading and TOC row aren't empty.
    expect(page!.body).toContain(`name="' '"`);
    expect(page!.body).toContain(`sig="' ': string"`);
    expect(page!.headings).toContainEqual(
      expect.objectContaining({ text: "' '", id: 'member--20' })
    );
    // Names with no visible character are shown as quoted escapes, never blank
    // and never alike; the anchors keep the code points.
    expect(page!.body).toContain('id="member--a0"');
    expect(page!.body).toContain('id="member--200b"');
    expect(page!.body).toContain(`name="'\\u00a0'"`);
    expect(page!.body).toContain(`sig="'\\u200b': string"`);
    expect(page!.headings).toContainEqual(
      expect.objectContaining({ text: "'\\u00a0'", id: 'member--a0' })
    );
    expect(page!.headings).toContainEqual(
      expect.objectContaining({ text: "'\\u200b'", id: 'member--200b' })
    );
    const texts = (page!.headings ?? []).map((h) => h.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe('rehomeAliasedMembers (real JSDoc output, #374)', () => {
  const docs = (c: TJSDocSaltyCollection<TDoclet>) => c().get();
  const find = (c: TJSDocSaltyCollection<TDoclet>, pred: (d: TDoclet) => boolean) =>
    docs(c).filter(pred);
  const fromFile = (items: unknown[], filename: string) =>
    items.filter((d) => (d as TDoclet).meta?.filename === filename);

  it('returns the input collection itself when no doclet has an alias', () => {
    const c = getJSDocTaffyData();
    const { collection, renamed } = rehomeAliasedMembers(c);
    expect(collection).toBe(c);
    expect(renamed.size).toBe(0);
  });

  it('returns the input collection itself for an aliased class declaration (not broken)', () => {
    const c = makeCollection(fromFile(ALIAS_DOCLETS, 'decl.js'));
    const { collection, renamed } = rehomeAliasedMembers(c);
    expect(collection).toBe(c);
    expect(renamed.size).toBe(0);
  });

  it('ignores a @constructs-style doclet (alias set, undotted code name)', () => {
    const c = makeCollection([
      {
        kind: 'class',
        name: 'K',
        longname: 'Ns.K',
        memberof: 'Ns',
        scope: 'static',
        alias: 'Ns.K',
        meta: {
          filename: 'k.js',
          path: '/src',
          lineno: 3,
          columnno: 2,
          code: { name: 'initialize' },
        },
      },
      {
        kind: 'function',
        name: 'x',
        longname: 'initialize.x',
        memberof: 'initialize',
        scope: 'static',
        meta: {
          filename: 'k.js',
          path: '/src',
          lineno: 5,
          columnno: 2,
          code: { name: 'initialize.x' },
        },
      },
    ]);
    expect(rehomeAliasedMembers(c).collection).toBe(c);
  });

  it('moves members left under the original name onto the alias, renaming them', () => {
    const { collection, renamed } = rehomeAliasedMembers(makeCollection(ALIAS_DOCLETS));
    const memberLongnames = (owner: string) =>
      find(collection, (d) => d.memberof === owner)
        .map((d) => d.longname)
        .sort();
    expect(memberLongnames('Other')).toEqual([
      'Other#event:ev',
      'Other#f',
      'Other#g',
      'Other#m',
      'Other.Opts',
      'Other.late',
      'Other.s',
    ]);
    expect(memberLongnames('Ns.Foo')).toEqual([]);
    expect(memberLongnames('Ns.Pub')).toEqual(['Ns.Pub#m', 'Ns.Pub.Inner']);
    expect(memberLongnames('Ns.Pub.Inner')).toEqual(['Ns.Pub.Inner#im']);
    expect(memberLongnames('Es')).toEqual(['Es#pm', 'Es#tp', 'Es.sm']);
    expect(memberLongnames('Pc')).toEqual(['Pc#pcm']);
    expect(memberLongnames('Hid')).toEqual(['Hid#hm']);
    // name / scope / meta are kept.
    const m = find(collection, (d) => d.longname === 'Other#m')[0]!;
    expect(m).toMatchObject({ name: 'm', scope: 'instance', meta: { code: { name: 'Ns.Foo#m' } } });
    expect(Object.fromEntries(renamed)).toEqual({
      'Ns.Foo': 'Other',
      'Ns.Foo#event:ev': 'Other#event:ev',
      'Ns.Foo#m': 'Other#m',
      'Ns.Foo.s': 'Other.s',
      'Ns.Foo#g': 'Other#g',
      'Ns.Foo.late': 'Other.late',
      'Ns.Foo.Opts': 'Other.Opts',
      'Ns.In.Foo': 'Ns.Pub',
      'Ns.In.Foo#m': 'Ns.Pub#m',
      'Ns.In.Foo.Inner': 'Ns.Pub.Inner',
      'Ns.In.Foo.Inner#im': 'Ns.Pub.Inner#im',
      'Ns.Old': 'Es',
      'Ns.Old#pm': 'Es#pm',
      'Ns.Old.sm': 'Es.sm',
      'Ns.Pv': 'Pc',
      'Ns.Pv#pcm': 'Pc#pcm',
      'Ns.Hd': 'Hid',
      'Ns.Hd#hm': 'Hid#hm',
    });
  });

  it('leaves the constructor record under the original name and drops the stale memberof', () => {
    const { collection } = rehomeAliasedMembers(makeCollection(ALIAS_DOCLETS));
    const ctor = find(
      collection,
      (d) => d.meta?.code?.type === 'MethodDefinition' && d.kind === 'class'
    );
    expect(ctor.map((d) => [d.longname, d.memberof])).toEqual([
      ['Ns.Foo', 'Ns'],
      ['Ns.Pv', 'Ns'],
    ]);
    for (const ln of ['Other', 'Pc']) {
      for (const d of find(collection, (x) => x.longname === ln)) {
        expect(d.memberof).toBeUndefined();
      }
    }
    // A static-scope alias keeps its (correct) memberof.
    expect(find(collection, (d) => d.longname === 'Ns.Pub')[0]!.memberof).toBe('Ns');
    // Doclet order is preserved.
    expect(docs(collection).map((d) => d.meta?.lineno)).toEqual(
      (ALIAS_DOCLETS as TDoclet[]).map((d) => d.meta?.lineno)
    );
  });

  it('does not mutate the input doclets', () => {
    const c = makeCollection(ALIAS_DOCLETS);
    const before = JSON.stringify(docs(c));
    rehomeAliasedMembers(c);
    expect(JSON.stringify(docs(c))).toBe(before);
  });

  it('attributes members by position when two classes claim one original name', () => {
    const { collection, renamed } = rehomeAliasedMembers(makeCollection(ALIAS_COLLISION_DOCLETS));
    const memberOf = (ln: string) => find(collection, (d) => d.longname === ln)[0]?.memberof;
    // collide.js: aliased `Ns.Foo` (→ Other), then a real `Ns.Foo`.
    expect(memberOf('Other#m')).toBe('Other');
    expect(memberOf('Ns.Foo#m2')).toBe('Ns.Foo');
    expect(memberOf('Ns.Foo#m')).toBeUndefined();
    // twice.js: `Ns.Dup` aliased as A, then again as B.
    expect(memberOf('A#am')).toBe('A');
    expect(memberOf('B#bm')).toBe('B');
    // An original name with a real claimant, or two aliases, is not re-pointed.
    expect(renamed.has('Ns.Foo')).toBe(false);
    expect(renamed.has('Ns.Dup')).toBe(false);
    expect(renamed.get('Ns.Foo#m')).toBe('Other#m');
  });

  it('maps exports.Foo onto the module for ESM and CommonJS', () => {
    const { collection, renamed } = rehomeAliasedMembers(makeCollection(ALIAS_MODULE_DOCLETS));
    const ln = (owner: string) =>
      find(collection, (d) => d.memberof === owner && d.kind === 'function').map((d) => d.longname);
    expect(ln('module:m.Bar')).toEqual(['module:m.Bar#m']);
    expect(ln('module:c.Baz')).toEqual(['module:c.Baz#cm']);
    expect(renamed.get('module:m.Foo')).toBe('module:m.Bar');
    expect(renamed.get('module:c.Foo')).toBe('module:c.Baz');
    // The undocumented ESM class record under the original name is left alone.
    expect(find(collection, (d) => d.longname === 'module:m.Foo')).toHaveLength(1);
  });

  it('never moves a member across files under a per-file original (module.exports)', () => {
    const { collection, renamed } = rehomeAliasedMembers(makeCollection(ALIAS_CJS_FILES_DOCLETS));
    const memberOf = (name: string) => find(collection, (d) => d.name === name)[0]!;
    // a.js: the aliased class's own method moves.
    expect(memberOf('m')).toMatchObject({ longname: 'A#m', memberof: 'A' });
    // d.js: an unrelated `module.exports` object keeps its member.
    expect(memberOf('dfn')).toMatchObject({
      longname: 'module.exports.dfn',
      memberof: 'module.exports',
    });
    expect(renamed.has('module.exports')).toBe(false);
    expect(renamed.has('module.exports.dfn')).toBe(false);
  });

  it('an uncommented reassignment of the original keeps the members after it', () => {
    const { collection } = rehomeAliasedMembers(makeCollection(ALIAS_REPLACEMENT_DOCLETS));
    const memberOf = (name: string) => find(collection, (d) => d.name === name)[0]?.memberof;
    // undocreal.js: `Ns.Foo = class` with no comment after the aliased one.
    expect(memberOf('m')).toBe('Other');
    expect(memberOf('m2')).toBe('Ns.Foo');
    // fnrepl.js: the same with ES5 functions.
    expect(memberOf('om')).toBe('Other');
    expect(memberOf('nm')).toBe('Ns.Foo');
  });

  it('leaves an original longname two owners map differently out of renamed', () => {
    const at = (lineno: number, code: string) => ({
      filename: 'dup.js',
      path: '/src',
      lineno,
      columnno: 0,
      code: { name: code },
    });
    const owner = (name: string, lineno: number) => ({
      kind: 'class',
      name,
      longname: name,
      scope: 'global',
      alias: name,
      meta: at(lineno, 'Ns.Dup'),
    });
    const m = (lineno: number) => ({
      kind: 'function',
      name: 'm',
      longname: 'Ns.Dup#m',
      memberof: 'Ns.Dup',
      scope: 'instance',
      meta: at(lineno, 'Ns.Dup#m'),
    });
    const { collection, renamed } = rehomeAliasedMembers(
      makeCollection([owner('A', 1), m(3), owner('B', 6), m(8)])
    );
    expect(find(collection, (d) => d.name === 'm').map((d) => d.longname)).toEqual(['A#m', 'B#m']);
    expect(renamed.has('Ns.Dup#m')).toBe(false);
    expect(renamed.has('Ns.Dup')).toBe(false);
  });

  describe('a member in another file', () => {
    const owner = {
      kind: 'class',
      name: 'Other',
      longname: 'Other',
      scope: 'global',
      alias: 'Other',
      meta: { filename: 'a.js', path: '/src', lineno: 5, columnno: 0, code: { name: 'Ns.Foo' } },
    };
    const member = {
      kind: 'function',
      name: 'x',
      longname: 'Ns.Foo#x',
      memberof: 'Ns.Foo',
      scope: 'instance',
      meta: { filename: 'c.js', path: '/src', lineno: 1, columnno: 0, code: { name: 'Ns.Foo#x' } },
    };
    const real = {
      kind: 'class',
      name: 'Foo',
      longname: 'Ns.Foo',
      memberof: 'Ns',
      scope: 'static',
      meta: { filename: 'b.js', path: '/src', lineno: 5, columnno: 0, code: { name: 'Ns.Foo' } },
    };

    it('moves to the only aliased owner when no real class claims the name', () => {
      const { collection } = rehomeAliasedMembers(makeCollection([owner, member]));
      expect(find(collection, (d) => d.name === 'x')[0]!.longname).toBe('Other#x');
    });

    it('stays put when a real class elsewhere has the original name', () => {
      const { collection } = rehomeAliasedMembers(makeCollection([owner, real, member]));
      expect(find(collection, (d) => d.name === 'x')[0]!.longname).toBe('Ns.Foo#x');
    });
  });
});
