/**
 * Site-wide visibility: `@private` / `@access private` / `@ignore` doclets — and
 * everything under a hidden container — must not surface on ANY output surface
 * (pages, nav, link registry → type links, Globals). Covers the
 * `pruneHiddenDoclets` choke point directly and end-to-end through
 * `generateSite`, plus the controls that must NOT change.
 */
import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import type { NavNode, TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { generateSite } from '../index';
import { pruneHiddenDoclets } from '../doclet';
import { getJSDocTaffyData } from './factory';
import {
  PRIVATE_CTOR_ANON_DOCLETS,
  PRIVATE_CTOR_CLASS_ACCESS_DOCLETS,
  PRIVATE_CTOR_DOCLETS,
  PRIVATE_CTOR_ES5_ES6_DOCLETS,
  PRIVATE_CTOR_SAME_NAME_DOCLETS,
} from './private-ctor-fixture';
import { ALIAS_DOCLETS } from './alias-fixture';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

const longnamesOf = (c: TJSDocSaltyCollection<TDoclet>) =>
  c()
    .get()
    .map((d) => d.longname);

function navSlugs(nodes: readonly NavNode[]): string[] {
  return nodes.flatMap((n) => [
    ...(n.slug !== undefined ? [n.slug] : []),
    ...navSlugs(n.children ?? []),
  ]);
}

/** The issue repro: a `@private` typedef beside a public function that uses it. */
function privateTypedefCollection(): TJSDocSaltyCollection<TDoclet> {
  return makeCollection([
    {
      kind: 'typedef',
      name: 'Hidden',
      longname: 'Hidden',
      scope: 'global',
      access: 'private',
      description: '<p>Secret shape.</p>',
      type: { names: ['Object'] },
      properties: [{ name: 'x', type: { names: ['string'] } }],
    },
    {
      kind: 'typedef',
      name: 'Shown',
      longname: 'Shown',
      scope: 'global',
      description: '<p>Public shape.</p>',
      type: { names: ['Object'] },
    },
    {
      kind: 'function',
      name: 'useHidden',
      longname: 'useHidden',
      scope: 'global',
      description: '<p>Uses both.</p>',
      params: [
        { name: 'h', type: { names: ['Hidden'] } },
        { name: 's', type: { names: ['Shown'] } },
      ],
    },
  ]);
}

describe('pruneHiddenDoclets', () => {
  it('drops @private and @ignore doclets, keeps the rest', () => {
    const c = makeCollection([
      { kind: 'function', name: 'pub', longname: 'pub', scope: 'global' },
      { kind: 'function', name: 'priv', longname: 'priv', scope: 'global', access: 'private' },
      { kind: 'function', name: 'ign', longname: 'ign', scope: 'global', ignore: true },
      { kind: 'function', name: 'prot', longname: 'prot', scope: 'global', access: 'protected' },
    ]);
    expect(longnamesOf(pruneHiddenDoclets(c))).toEqual(['pub', 'prot']);
  });

  it('keeps private (but never @ignore) doclets with includePrivate', () => {
    const c = makeCollection([
      { kind: 'function', name: 'priv', longname: 'priv', scope: 'global', access: 'private' },
      { kind: 'function', name: 'ign', longname: 'ign', scope: 'global', ignore: true },
    ]);
    expect(longnamesOf(pruneHiddenDoclets(c, { includePrivate: true }))).toEqual(['priv']);
  });

  it('hides the whole subtree of a hidden container, nested containers included', () => {
    const c = makeCollection([
      { kind: 'namespace', name: 'Ns', longname: 'Ns', scope: 'global', access: 'private' },
      { kind: 'class', name: 'Inner', longname: 'Ns.Inner', memberof: 'Ns', scope: 'static' },
      {
        kind: 'function',
        name: 'm',
        longname: 'Ns.Inner#m',
        memberof: 'Ns.Inner',
        scope: 'instance',
      },
      { kind: 'namespace', name: 'Pub', longname: 'Pub', scope: 'global' },
      { kind: 'function', name: 'f', longname: 'Pub.f', memberof: 'Pub', scope: 'static' },
    ]);
    expect(longnamesOf(pruneHiddenDoclets(c))).toEqual(['Pub', 'Pub.f']);
  });

  it("drops a hidden container's undocumented sibling records", () => {
    const c = makeCollection([
      { kind: 'class', name: 'Secret', longname: 'Secret', scope: 'global', access: 'private' },
      { kind: 'class', name: 'Secret', longname: 'Secret', scope: 'global', undocumented: true },
    ]);
    expect(longnamesOf(pruneHiddenDoclets(c))).toEqual([]);
  });

  it('a private overload does not take a public one (or its members) down with it', () => {
    const c = makeCollection([
      { kind: 'class', name: 'Dup', longname: 'Dup', scope: 'global', access: 'private' },
      { kind: 'class', name: 'Dup', longname: 'Dup', scope: 'global' },
      { kind: 'function', name: 'm', longname: 'Dup#m', memberof: 'Dup', scope: 'instance' },
    ]);
    const kept = pruneHiddenDoclets(c)().get();
    expect(kept.map((d) => d.longname)).toEqual(['Dup', 'Dup#m']);
    expect(kept[0].access).toBeUndefined();
  });

  it('control: returns the input collection untouched when nothing is hidden', () => {
    const c = makeCollection([{ kind: 'function', name: 'pub', longname: 'pub', scope: 'global' }]);
    expect(pruneHiddenDoclets(c)).toBe(c);
  });

  it('survives a memberof cycle', () => {
    const c = makeCollection([
      { kind: 'class', name: 'A', longname: 'A', memberof: 'B', scope: 'static' },
      { kind: 'class', name: 'B', longname: 'B', memberof: 'A', scope: 'static' },
      { kind: 'function', name: 'p', longname: 'p', scope: 'global', access: 'private' },
    ]);
    expect(longnamesOf(pruneHiddenDoclets(c))).toEqual(['A', 'B']);
  });
});

describe('generateSite — hidden symbols never surface', () => {
  it('a @private typedef gets no page, no nav entry, and no type link', () => {
    const manifest = generateSite(privateTypedefCollection());
    const slugs = manifest.pages.map((p) => p.slug);
    expect(slugs).not.toContain('hidden');
    expect(navSlugs(manifest.nav)).not.toContain('hidden');
    const globals = manifest.pages.find((p) => p.slug === 'global')!.body;
    // The param type renders as plain text, not a link to a page that is gone.
    expect(globals).toContain('- `h` (Hidden)');
    expect(globals).not.toContain('(/hidden)');
    // Control: the public typedef keeps its page, nav entry, and link.
    expect(slugs).toContain('shown');
    expect(navSlugs(manifest.nav)).toContain('shown');
    expect(globals).toContain('- `s` ([Shown](/shown))');
  });

  it('includePrivate restores the private typedef page and its link', () => {
    const manifest = generateSite(privateTypedefCollection(), { includePrivate: true });
    expect(manifest.pages.map((p) => p.slug)).toContain('hidden');
    expect(navSlugs(manifest.nav)).toContain('hidden');
    const globals = manifest.pages.find((p) => p.slug === 'global')!.body;
    expect(globals).toContain('- `h` ([Hidden](/hidden))');
  });

  it('includePrivate also shows private members (previously always hidden)', () => {
    const c = () =>
      makeCollection([
        { kind: 'class', name: 'K', longname: 'K', scope: 'global', classdesc: '<p>K.</p>' },
        {
          kind: 'function',
          name: 'secret',
          longname: 'K#secret',
          memberof: 'K',
          scope: 'instance',
          access: 'private',
          description: '<p>s</p>',
        },
      ]);
    const body = (m: ReturnType<typeof generateSite>) => m.pages.find((p) => p.slug === 'k')!.body;
    expect(body(generateSite(c()))).not.toContain('secret');
    expect(body(generateSite(c(), { includePrivate: true }))).toContain('name="secret"');
  });

  it.each([
    ['class', { kind: 'class', classdesc: '<p>x</p>' }],
    ['namespace', { kind: 'namespace' }],
    ['module', { kind: 'module' }],
    ['interface', { kind: 'interface' }],
    ['mixin', { kind: 'mixin' }],
  ])('a private %s gets no page, and neither does anything under it', (_kind, extra) => {
    const manifest = generateSite(
      makeCollection([
        { name: 'Sec', longname: 'Sec', scope: 'global', access: 'private', ...extra },
        { kind: 'class', name: 'Inner', longname: 'Sec.Inner', memberof: 'Sec', scope: 'static' },
        { kind: 'class', name: 'Pub', longname: 'Pub', scope: 'global', classdesc: '<p>p</p>' },
      ])
    );
    const slugs = manifest.pages.map((p) => p.slug);
    expect(slugs).not.toContain('sec');
    expect(slugs).not.toContain('sec/inner');
    expect(slugs).toContain('pub');
  });

  it('@ignore and private globals (functions, members, events, enums) leave the Globals page', () => {
    const manifest = generateSite(
      makeCollection([
        { kind: 'function', name: 'shown', longname: 'shown', scope: 'global' },
        { kind: 'function', name: 'ign', longname: 'ign', scope: 'global', ignore: true },
        { kind: 'member', name: 'pv', longname: 'pv', scope: 'global', access: 'private' },
        { kind: 'event', name: 'ev', longname: 'event:ev', scope: 'global', access: 'private' },
        { kind: 'member', name: 'En', longname: 'En', scope: 'global', isEnum: true, ignore: true },
      ])
    );
    const globals = manifest.pages.find((p) => p.slug === 'global')!.body;
    expect(globals).toContain('name="shown"');
    for (const name of ['ign', 'pv', 'ev', 'En']) expect(globals).not.toContain(`name="${name}"`);
  });

  it('control: the examples/basic fixture keeps every page', () => {
    // The fixture has private members but no private/ignored page-level
    // symbols, so its page set must be unchanged by the prune.
    const slugs = generateSite(getJSDocTaffyData()).pages.map((p) => p.slug);
    const withPrivate = generateSite(getJSDocTaffyData(), { includePrivate: true }).pages.map(
      (p) => p.slug
    );
    expect(slugs).toEqual(withPrivate);
  });
});

describe('generateSite — a @private ES6 constructor (real JSDoc output)', () => {
  const site = (opts?: { includePrivate?: boolean }) =>
    generateSite(makeCollection(PRIVATE_CTOR_DOCLETS), opts);
  const page = (m: ReturnType<typeof generateSite>, slug: string) =>
    m.pages.find((p) => p.slug === slug);

  // Every class shape whose ONLY private part is its constructor: exported
  // (`Exp#Exp` ctor record), plain and subclass (ctor record longname = class),
  // class expression, CommonJS class in a module; then the shapes whose ctor
  // record longname is neither the class's nor `<class>#<name>`: nested class
  // expressions (`Outer~Outer.Inner`, `Host~Host.Nested`) and an
  // `export default class` outside a @module (`module.exports#module.exports`);
  // plus `export default class` / `module.exports = class` inside a @module,
  // where the class IS the module; then `@alias Bar` / `@alias Ns.Bar` /
  // `@alias Baz` on a class `Foo`, whose ctor record keeps the name `Foo`.
  // A null member: JSDoc attaches no method to that page (it lands on Globals,
  // under the unaliased `Foo`, or nowhere).
  it.each([
    ['exp', 'Exported class desc.', 'pub', 'Exp ctor.'],
    ['ctorpriv', 'Plain class desc.', 'm', 'Plain ctor.'],
    ['subpriv', 'Sub desc.', 's', 'Sub ctor.'],
    ['exprcls', 'Expr desc.', 'e', 'Expr ctor.'],
    ['module/cjsmod/cjscls', 'Cjs class desc.', 'c', 'Cjs ctor.'],
    ['outer/inner', 'Inner class desc.', 'im', 'Inner ctor.'],
    ['host/nested', 'Nested class desc.', 'nm', 'Nested ctor.'],
    ['module/exports', 'Default class desc.', null, 'DefExp ctor.'],
    ['module/defmod', 'Default class desc.', 'd', 'DefExp ctor.'],
    ['module/anonmod', 'Anonymous class desc.', null, 'Anon ctor.'],
    ['bar', 'Aliased class desc.', 'm', 'Aliased ctor.'],
    ['ns/bar', 'Alias+memberof desc.', 'm', 'Alias+memberof ctor.'],
    ['baz', 'Exported aliased desc.', null, 'Exported aliased ctor.'],
  ])(
    '%s: keeps the class + public members, hides only the constructor',
    (slug, desc, member, ctor) => {
      const m = site();
      const body = page(m, slug)!.body;
      expect(navSlugs(m.nav)).toContain(slug);
      expect(body).toContain(desc);
      if (member) expect(body).toContain(`name="${member}"`);
      expect(body).not.toContain('**Modifiers:** `private`');
      expect(body).not.toContain('## Constructor');
      expect(body).not.toContain(ctor);
    }
  );

  it('none of the private constructor comment leaks onto the class page', () => {
    const body = page(site(), 'exp')!.body;
    // `@since` / `@see` / `@param` on the constructor comment.
    expect(body).not.toContain('9.9.9');
    expect(body).not.toContain('SecretSee');
    expect(body).not.toContain('the x');
    // Control: a genuinely private method on the same class stays hidden.
    expect(body).not.toContain('name="hid"');
  });

  it('the CommonJS module page lists the kept class', () => {
    expect(page(site(), 'module/cjsmod')!.body).toContain('CjsCls');
  });

  it('the namespace / host class pages list the kept nested class', () => {
    const m = site();
    expect(page(m, 'outer')!.body).toContain('name="Inner"');
    expect(page(m, 'host')!.body).toContain('name="Nested"');
  });

  it('controls: a @private class comment, or an ES5 @class/@constructor, stays hidden', () => {
    const m = site();
    // `outer/hiddeninner`: a nested class expression whose class comment is @private.
    for (const slug of ['sec', 'both', 'es5priv', 'es5ctor', 'outer/hiddeninner']) {
      expect(page(m, slug)).toBeUndefined();
      expect(navSlugs(m.nav)).not.toContain(slug);
    }
  });

  it('includePrivate shows the constructor again (unchanged from before)', () => {
    const body = page(site({ includePrivate: true }), 'exp')!.body;
    expect(body).toContain('## Constructor');
    expect(body).toContain('Exp ctor.');
    expect(body).toContain('9.9.9');
    expect(body).toContain('name="hid"');
    const inner = page(site({ includePrivate: true }), 'outer/inner')!.body;
    expect(inner).toContain('## Constructor');
    expect(inner).toContain('Inner ctor.');
  });

  it('does not mutate the input doclets', () => {
    const c = makeCollection(PRIVATE_CTOR_DOCLETS);
    generateSite(c);
    const exp = c({ longname: 'Exp', kind: 'class' })
      .get()
      .find((d) => !d.undocumented)!;
    expect(exp.access).toBe('private');
    expect(exp.since).toBe('9.9.9');
    expect(exp.hideconstructor).toBeUndefined();
  });
});

describe('generateSite — `module.exports = class` with a @private constructor, no @module', () => {
  // Its own fixture: the class shares the `module.exports` longname with the
  // `export default class` in PRIVATE_CTOR_DOCLETS.
  const site = (opts?: { includePrivate?: boolean }) =>
    generateSite(makeCollection(PRIVATE_CTOR_ANON_DOCLETS), opts);

  it('keeps the class + public members, hides only the constructor', () => {
    const m = site();
    const body = m.pages.find((p) => p.slug === 'module/exports')!.body;
    expect(navSlugs(m.nav)).toContain('module/exports');
    expect(body).toContain('Anonymous class desc.');
    expect(body).toContain('name="an"');
    expect(body).not.toContain('**Modifiers:** `private`');
    expect(body).not.toContain('## Constructor');
    expect(body).not.toContain('Anon ctor.');
  });

  it('includePrivate shows the constructor again', () => {
    const body = site({ includePrivate: true }).pages.find(
      (p) => p.slug === 'module/exports'
    )!.body;
    expect(body).toContain('## Constructor');
    expect(body).toContain('Anon ctor.');
  });
});

describe('generateSite — @alias on a nested class expression (real JSDoc output, #374)', () => {
  const site = (opts?: { includePrivate?: boolean }) =>
    generateSite(makeCollection(ALIAS_DOCLETS), opts);
  const page = (m: ReturnType<typeof generateSite>, slug: string) =>
    m.pages.find((p) => p.slug === slug);

  it('a @private constructor hides only the Constructor; the moved members stay', () => {
    const body = page(site(), 'pc')!.body;
    expect(body).toContain('Pc class.');
    expect(body).toContain('name="pcm"');
    expect(body).not.toContain('## Constructor');
    expect(body).not.toContain('Secret ctor.');
  });

  it('a @private aliased class takes its moved members with it', () => {
    const m = site();
    expect(page(m, 'hid')).toBeUndefined();
    expect(navSlugs(m.nav)).not.toContain('hid');
    for (const p of m.pages) expect(p.body).not.toContain('name="hm"');
  });

  it('includePrivate shows the private aliased class with its members', () => {
    const m = site({ includePrivate: true });
    expect(page(m, 'hid')!.body).toContain('name="hm"');
    expect(page(m, 'pc')!.body).toContain('## Constructor');
  });
});

describe('generateSite — @private constructors of classes JSDoc gives one longname', () => {
  const page = (doclets: unknown[], slug: string) =>
    generateSite(makeCollection(doclets)).pages.find((p) => p.slug === slug);

  it('each class sheds its own constructor comment, not the other one', () => {
    // A top-level and a function-scoped `class Foo`: one longname, one page.
    const body = page(PRIVATE_CTOR_SAME_NAME_DOCLETS, 'foo')!.body;
    expect(body).toContain('Top Foo desc.');
    expect(body).toContain('name="a"');
    expect(body).not.toContain('**Modifiers:** `private`');
    expect(body).not.toContain('## Constructor');
    // `@see` is on the top-level class's constructor, `@since` on the other's.
    for (const leak of ['Top Foo ctor.', 'TopSecretSee', 'Inner Foo ctor.', '7.7.7']) {
      expect(body).not.toContain(leak);
    }
  });

  it('an ES5 @private @class stays hidden beside a same-longname ES6 class', () => {
    // The `foo` page is the function-scoped ES6 class (only its constructor
    // is private), not the ES5 `@class @private function Foo`.
    const body = page(PRIVATE_CTOR_ES5_ES6_DOCLETS, 'foo')!.body;
    expect(body).toContain('Inner Foo desc.');
    expect(body).toContain('name="b"');
    expect(body).not.toContain('**Modifiers:** `private`');
    expect(body).not.toContain('## Constructor');
    // The unrelated ES6 class in the same file keeps its page too.
    const mixed = page(PRIVATE_CTOR_ES5_ES6_DOCLETS, 'mixed')!.body;
    expect(mixed).toContain('name="m"');
    expect(mixed).not.toContain('Mixed ctor.');
  });
});

describe('generateSite — a @private constructor on a class with an explicit access tag (#373)', () => {
  const site = (opts?: { includePrivate?: boolean }) =>
    generateSite(makeCollection(PRIVATE_CTOR_CLASS_ACCESS_DOCLETS), opts);
  const page = (m: ReturnType<typeof generateSite>, slug: string) =>
    m.pages.find((p) => p.slug === slug);

  // `@protected` / `@public` / `@package` / `@access protected` on the class
  // comment, a bare `/** @private */` constructor, and the `export class`,
  // class-expression, namespaced and `@alias`'d shapes.
  it.each([
    ['prot', 'Prot class desc.', 'protected', 'm', 'Prot ctor.'],
    ['pub', 'Pub class desc.', 'public', 'm', 'Pub ctor.'],
    ['pkg', 'Pkg class desc.', 'package', 'm', 'Pkg ctor.'],
    ['acctag', 'AccTag class desc.', 'protected', 'm', 'AccTag ctor.'],
    ['protnodesc', 'ProtNoDesc class desc.', 'protected', 'm', null],
    ['expprot', 'ExpProt class desc.', 'protected', 'm', 'ExpProt ctor.'],
    ['exprprot', 'ExprProt class desc.', 'protected', 'm', 'ExprProt ctor.'],
    ['ns/nsprot', 'NsProt class desc.', 'protected', 'm', 'NsProt ctor.'],
    ['other', 'Other class desc.', 'protected', 'am', 'Other ctor.'],
  ])(
    '%s: keeps the class, its access and members; hides only the constructor',
    (slug, desc, access, member, ctor) => {
      const m = site();
      const body = page(m, slug)!.body;
      expect(navSlugs(m.nav)).toContain(slug);
      expect(body).toContain(desc);
      expect(body).toContain(`**Modifiers:** \`${access}\``);
      expect(body).toContain(`name="${member}"`);
      expect(body).not.toContain('## Constructor');
      if (ctor) expect(body).not.toContain(ctor);
    }
  );

  it('none of the private constructor comment leaks onto the class page', () => {
    const body = page(site(), 'prot')!.body;
    expect(body).not.toContain('9.9.9');
    expect(body).not.toContain('SecretSee');
    expect(body).not.toContain('the x');
  });

  it('controls: a public or @protected constructor stays; a @private class stays hidden', () => {
    const m = site();
    const protPubCtor = page(m, 'protpubctor')!.body;
    expect(protPubCtor).toContain('## Constructor');
    expect(protPubCtor).toContain('ProtPubCtor ctor.');
    expect(protPubCtor).toContain('the y');
    const ctorProt = page(m, 'ctorprot')!.body;
    expect(ctorProt).toContain('## Constructor');
    expect(ctorProt).toContain('CtorProt ctor.');
    expect(page(m, 'privboth')).toBeUndefined();
    expect(navSlugs(m.nav)).not.toContain('privboth');
    const protHide = page(m, 'prothide')!.body;
    expect(protHide).toContain('**Modifiers:** `protected`');
    expect(protHide).not.toContain('## Constructor');
    expect(protHide).not.toContain('ProtHide ctor.');
    // `@since` on the private constructor of a `@hideconstructor` class.
    expect(protHide).not.toContain('7.7.7');
  });

  it("a same-named nested class's private constructor does not hide the outer one", () => {
    const m = site();
    const trap = page(m, 'trap')!.body;
    expect(trap).toContain('## Constructor');
    expect(trap).toContain('Trap public ctor.');
    expect(trap).toContain('the a');
    // The outer constructor has no comment, or the outer class has none.
    for (const slug of ['trap2', 'trap3']) {
      const body = page(m, slug)!.body;
      expect(body).toContain('## Constructor');
      expect(body).toContain('**Modifiers:** `protected`');
    }
  });

  it('includePrivate shows the constructor again', () => {
    const body = page(site({ includePrivate: true }), 'prot')!.body;
    expect(body).toContain('## Constructor');
    expect(body).toContain('Prot ctor.');
    expect(body).toContain('9.9.9');
    expect(body).toContain('the x');
  });

  it('does not mutate the input doclets', () => {
    const c = makeCollection(PRIVATE_CTOR_CLASS_ACCESS_DOCLETS);
    generateSite(c);
    const prot = c({ longname: 'Prot', kind: 'class' })
      .get()
      .find((d) => !d.undocumented)!;
    expect(prot.description).toBe('<p>Prot ctor.</p>');
    expect(prot.hideconstructor).toBeUndefined();
  });
});

describe('pruneHiddenDoclets — a @private constructor on a class with an access tag (#373)', () => {
  const documented = (c: TJSDocSaltyCollection<TDoclet>, longname: string, lineno?: number) =>
    c({ longname, kind: 'class' })
      .get()
      .find((d) => !d.undocumented && (lineno === undefined || d.meta?.lineno === lineno))!;

  it('strips the constructor comment and keeps the class access', () => {
    const pruned = documented(
      pruneHiddenDoclets(makeCollection(PRIVATE_CTOR_CLASS_ACCESS_DOCLETS)),
      'Prot'
    );
    expect(pruned.access).toBe('protected');
    expect(pruned.hideconstructor).toBe(true);
    expect(pruned.description).toBeUndefined();
    expect(pruned.classdesc).toBe('<p>Prot class desc.</p>');
    expect(pruned.params).toBeUndefined();
    expect(pruned.since).toBeUndefined();
  });

  it('leaves an outer class alone when a nested same-named class precedes its public constructor', () => {
    // Checked here, not on the page: the method-local inner Trap4 (private only
    // via its constructor) shares the outer longname, is emitted first, and so
    // owns the shared `trap4` page — pre-existing behaviour, not fixed here.
    const c = makeCollection(PRIVATE_CTOR_CLASS_ACCESS_DOCLETS);
    const outer = documented(c, 'Trap4', 42);
    const pruned = documented(pruneHiddenDoclets(c), 'Trap4', 42);
    expect(pruned).toBe(outer);
    expect(pruned.hideconstructor).toBeUndefined();
  });

  /** A hand-built class-comment record, merged doclet and constructor record. */
  const triple = (
    own: Partial<TDoclet> | null,
    merged: Partial<TDoclet>,
    ctor: Partial<TDoclet>
  ): unknown[] => {
    const meta = (lineno: number, columnno: number, type: string) => ({
      filename: 'x.js',
      path: '/src',
      lineno,
      columnno,
      code: { name: 'K', type },
    });
    const base = { name: 'K', longname: 'K', kind: 'class', scope: 'global' };
    return [
      ...(own
        ? [{ ...base, meta: meta(1, 0, 'ClassDeclaration'), undocumented: true, ...own }]
        : []),
      { ...base, meta: meta(3, 2, 'MethodDefinition'), undocumented: true, ...ctor },
      { ...base, meta: meta(1, 0, 'ClassDeclaration'), ...merged },
    ];
  };
  const privateCtor = { access: 'private', description: '<p>ctor</p>' } as Partial<TDoclet>;
  const merged = {
    access: 'protected',
    classdesc: '<p>K</p>',
    description: '<p>ctor</p>',
  } as Partial<TDoclet>;

  it('control: the hand-built triple is rewritten', () => {
    const c = makeCollection(
      triple({ access: 'protected', classdesc: '<p>K</p>' }, merged, privateCtor)
    );
    expect(documented(pruneHiddenDoclets(c), 'K').hideconstructor).toBe(true);
  });

  it.each([
    ['the class comment has no access tag', { classdesc: '<p>K</p>' }, privateCtor],
    ['no class-comment record at the merged position', null, privateCtor],
    [
      "the constructor's description is not the merged one",
      { access: 'protected', classdesc: '<p>K</p>' },
      { access: 'private', description: '<p>other</p>' },
    ],
  ] as [string, Partial<TDoclet> | null, Partial<TDoclet>][])(
    'leaves the class alone when %s',
    (_why, own, ctor) => {
      const c = makeCollection(triple(own, merged, ctor));
      const before = documented(c, 'K');
      expect(documented(pruneHiddenDoclets(c), 'K')).toBe(before);
    }
  );

  it('returns the input itself when no constructor record is private', () => {
    const c = makeCollection(
      triple({ access: 'protected', classdesc: '<p>K</p>' }, merged, { description: '<p>ctor</p>' })
    );
    expect(pruneHiddenDoclets(c)).toBe(c);
  });
});
