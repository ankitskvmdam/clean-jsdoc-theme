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
import { PRIVATE_CTOR_DOCLETS } from './private-ctor-fixture';

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

  it('keeps the class and its public members, hides only the constructor', () => {
    const m = site();
    const foo = page(m, 'foo')!.body;
    expect(navSlugs(m.nav)).toContain('foo');
    expect(foo).toContain('Foo class desc.');
    expect(foo).toContain('name="bar"');
    // The constructor's privacy is not the class's: no class-level badge…
    expect(foo).not.toContain('**Modifiers:** `private`');
    // …and the constructor section (signature, private description, params) is gone.
    expect(foo).not.toContain('## Constructor');
    expect(foo).not.toContain('Ctor desc.');
    expect(foo).not.toContain('the x');
    // Control: a genuinely private method on the same class stays hidden.
    expect(foo).not.toContain('name="baz"');
  });

  it('control: a class whose own comment is @private is still hidden', () => {
    const m = site();
    for (const slug of ['sec', 'both']) {
      expect(page(m, slug)).toBeUndefined();
      expect(navSlugs(m.nav)).not.toContain(slug);
    }
  });

  it('includePrivate shows the constructor again (unchanged from before)', () => {
    const foo = page(site({ includePrivate: true }), 'foo')!.body;
    expect(foo).toContain('## Constructor');
    expect(foo).toContain('Ctor desc.');
    expect(foo).toContain('name="baz"');
  });

  it('does not mutate the input doclets', () => {
    const c = makeCollection(PRIVATE_CTOR_DOCLETS);
    generateSite(c);
    const foo = c({ longname: 'Foo', kind: 'class' })
      .get()
      .find((d) => !d.undocumented)!;
    expect(foo.access).toBe('private');
    expect(foo.hideconstructor).toBeUndefined();
  });
});
