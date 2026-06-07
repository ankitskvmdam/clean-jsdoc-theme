import { describe, it, expect, vi } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { generateMdx, generateSite } from '../index';
import {
  buildClassPage,
  buildContainerPage,
  buildGlobalsPage,
  enumerateClassLongnames,
  enumerateLongnamesByKind,
  extractHeadings,
  splitLongnameForSlug,
} from '../generate-site';
import { classViewToMdast } from '../mdast/class-view';
import { getClassView } from '../class-view';
import { getJSDocTaffyData } from './factory';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

describe('splitLongnameForSlug', () => {
  it('splits on JSDoc separators', () => {
    expect(splitLongnameForSlug('module:CoreSchema~BaseEntity')).toEqual([
      'module',
      'CoreSchema',
      'BaseEntity',
    ]);
    expect(splitLongnameForSlug('Foo.Bar#baz')).toEqual(['Foo', 'Bar', 'baz']);
    expect(splitLongnameForSlug('DataProcessor')).toEqual(['DataProcessor']);
  });

  it('drops empty parts', () => {
    expect(splitLongnameForSlug('::Foo')).toEqual(['Foo']);
  });
});

describe('enumerateClassLongnames', () => {
  it('returns unique documented class longnames from the fixture', () => {
    const longnames = enumerateClassLongnames(getJSDocTaffyData());
    // ISerializable is modeled as `kind: 'interface'`; its only `kind: 'class'`
    // doclet in the fixture is undocumented, so it is correctly excluded.
    expect(longnames).toContain('DataProcessor');
    expect(longnames).toContain('User');
    expect(longnames).toContain('module:CoreSchema~BaseEntity');
    expect(new Set(longnames).size).toBe(longnames.length);
  });
});

describe('enumerateLongnamesByKind', () => {
  it('returns documented longnames for each container kind', () => {
    const c = getJSDocTaffyData();
    expect(enumerateLongnamesByKind(c, 'module')).toEqual(
      expect.arrayContaining(['module:CoreSchema', 'module:UserService']),
    );
    expect(enumerateLongnamesByKind(c, 'namespace')).toEqual(
      expect.arrayContaining(['Utils', 'MathUtils']),
    );
    expect(enumerateLongnamesByKind(c, 'interface')).toContain(
      'module:CoreSchema~ISerializable',
    );
    expect(enumerateLongnamesByKind(c, 'mixin')).toContain('LoggerMixin');
  });

  it('matches enumerateClassLongnames for kind: class', () => {
    const c = getJSDocTaffyData();
    expect(enumerateLongnamesByKind(c, 'class')).toEqual(enumerateClassLongnames(c));
  });
});

describe('buildContainerPage (non-class kinds)', () => {
  it('builds a module page with kind/slug/title', () => {
    const page = buildContainerPage(getJSDocTaffyData(), 'module:UserService', 'module')!;
    expect(page).not.toBeNull();
    expect(page.frontmatter.kind).toBe('module');
    expect(page.frontmatter.longname).toBe('module:UserService');
    expect(page.slug).toBe('module/userservice');
  });

  it('builds a namespace page', () => {
    const page = buildContainerPage(getJSDocTaffyData(), 'Utils', 'namespace')!;
    expect(page.frontmatter.kind).toBe('namespace');
    expect(page.slug).toBe('utils');
  });

  it('builds an interface page with module-scoped slug', () => {
    const page = buildContainerPage(
      getJSDocTaffyData(),
      'module:CoreSchema~ISerializable',
      'interface',
    )!;
    expect(page.frontmatter.kind).toBe('interface');
    expect(page.slug).toBe('module/coreschema/iserializable');
  });

  it('builds a mixin page', () => {
    const page = buildContainerPage(getJSDocTaffyData(), 'LoggerMixin', 'mixin')!;
    expect(page.frontmatter.kind).toBe('mixin');
    expect(page.slug).toBe('loggermixin');
  });

  it('returns null when no doclet of the kind matches', () => {
    expect(buildContainerPage(getJSDocTaffyData(), 'Nope', 'module')).toBeNull();
  });

  it('builds a record typedef page rendering its type and properties', () => {
    const page = buildContainerPage(
      getJSDocTaffyData(),
      'module:CoreSchema~Point',
      'typedef',
    )!;
    expect(page).not.toBeNull();
    expect(page.frontmatter.kind).toBe('typedef');
    expect(page.frontmatter.longname).toBe('module:CoreSchema~Point');
    expect(page.slug).toBe('module/coreschema/point');
    // `@type {Object}` and the `@property` list (x, y) render in the body.
    expect(page.body).toContain('**Type**');
    expect(page.body).toContain('**Properties**');
    expect(page.body).toContain('`x`');
    expect(page.body).toContain('`y`');
  });

  it('builds a function/callback typedef page rendering its params and returns', () => {
    const page = buildContainerPage(
      getJSDocTaffyData(),
      'module:CoreSchema~DataHandler',
      'typedef',
    )!;
    expect(page).not.toBeNull();
    expect(page.frontmatter.kind).toBe('typedef');
    expect(page.slug).toBe('module/coreschema/datahandler');
    // A function-signature typedef has no Constructor section, so its
    // params/returns must render in the body (unlike a class).
    expect(page.body).toContain('**Parameters**');
    expect(page.body).toContain('`chunk`');
    expect(page.body).toContain('`index`');
    expect(page.body).toContain('**Returns**');
  });
});

describe('extractHeadings', () => {
  it('extracts h2-h6 with slugified ids and skips h1', () => {
    const view = getClassView(getJSDocTaffyData(), 'DataProcessor')!;
    const tree = classViewToMdast(view);
    const headings = extractHeadings(tree);
    expect(headings.length).toBeGreaterThan(0);
    for (const h of headings) {
      expect(h.depth).toBeGreaterThanOrEqual(2);
      expect(h.depth).toBeLessThanOrEqual(6);
      expect(h.id).toMatch(/^[a-z0-9-]+$/);
      expect(h.text.length).toBeGreaterThan(0);
    }
  });

  it('dedupes duplicate slugs within a page', () => {
    const tree = {
      type: 'root' as const,
      children: [
        { type: 'heading' as const, depth: 2 as const, children: [{ type: 'text' as const, value: 'foo' }] },
        { type: 'heading' as const, depth: 3 as const, children: [{ type: 'text' as const, value: 'foo' }] },
      ],
    };
    const headings = extractHeadings(tree);
    expect(headings.map((h) => h.id)).toEqual(['foo', 'foo-1']);
  });
});

describe('buildClassPage', () => {
  it('returns null for an unknown longname', () => {
    expect(buildClassPage(getJSDocTaffyData(), 'DoesNotExist')).toBeNull();
  });

  it('produces a page with body, frontmatter, slug, and headings', () => {
    const page = buildClassPage(getJSDocTaffyData(), 'DataProcessor')!;
    expect(page.slug).toBe('dataprocessor');
    expect(page.frontmatter.title).toBe('DataProcessor');
    expect(page.frontmatter.kind).toBe('class');
    expect(page.frontmatter.longname).toBe('DataProcessor');
    expect(page.body.length).toBeGreaterThan(0);
    expect(page.body).toMatch(/^---\n/);
    expect(page.headings && page.headings.length).toBeGreaterThan(0);
    expect(page.mdast?.type).toBe('root');
  });

  it('produces the module-scoped slug for nested classes', () => {
    const page = buildClassPage(getJSDocTaffyData(), 'module:CoreSchema~BaseEntity')!;
    expect(page.slug).toBe('module/coreschema/baseentity');
    expect(page.frontmatter.longname).toBe('module:CoreSchema~BaseEntity');
  });
});

describe('buildGlobalsPage', () => {
  it('aggregates global-scope non-container symbols into one page', () => {
    const page = buildGlobalsPage(getJSDocTaffyData())!;
    expect(page).not.toBeNull();
    expect(page.slug).toBe('global');
    expect(page.frontmatter.kind).toBe('global');
    expect(page.frontmatter.title).toBe('Globals');
    expect(page.body).toMatch(/^---\n/);
    // Page H1 is "Globals".
    expect(page.body).toContain('# Globals');
    // Global functions and constants render as member sections.
    expect(page.body).toContain('`init`');
    expect(page.body).toContain('`sum`');
    expect(page.body).toContain('`MAX_USERS`');
    // The global enum constant renders too.
    expect(page.body).toContain('`Roles`');
  });

  it('does not pull global-scope container/typedef symbols into the globals page', () => {
    // The fixture has global-scope classes, a mixin, namespaces, and typedefs;
    // those get their own pages and must be excluded here. Build a collection
    // of one global class + one global typedef + one global function; only the
    // function should surface.
    const collection = makeCollection([
      {
        kind: 'class',
        name: 'GlobalWidget',
        longname: 'GlobalWidget',
        scope: 'global',
        comment: '/** cls */',
        classdesc: 'A class.',
      },
      {
        kind: 'typedef',
        name: 'GlobalAlias',
        longname: 'GlobalAlias',
        scope: 'global',
        comment: '/** td */',
        type: { names: ['string'] },
      },
      {
        kind: 'function',
        name: 'globalHelper',
        longname: 'globalHelper',
        scope: 'global',
        comment: '/** fn */',
        description: 'A helper.',
      },
    ]);
    const page = buildGlobalsPage(collection)!;
    expect(page).not.toBeNull();
    expect(page.body).toContain('`globalHelper`');
    expect(page.body).not.toContain('GlobalWidget');
    expect(page.body).not.toContain('GlobalAlias');
  });

  it('returns null when there are no qualifying globals', () => {
    const collection = makeCollection([
      {
        kind: 'class',
        name: 'OnlyClass',
        longname: 'OnlyClass',
        scope: 'global',
        comment: '/** cls */',
        classdesc: 'A class.',
      },
    ]);
    expect(buildGlobalsPage(collection)).toBeNull();
  });
});

describe('generateSite', () => {
  it('returns a SiteManifest with at least one page', () => {
    const manifest = generateSite(getJSDocTaffyData());
    expect(manifest.pages.length).toBeGreaterThanOrEqual(1);
  });

  it('every page has a slug, body, and title', () => {
    const manifest = generateSite(getJSDocTaffyData());
    for (const page of manifest.pages) {
      expect(page.slug).toBeTruthy();
      expect(page.body).toBeTruthy();
      expect(page.frontmatter.title).toBeTruthy();
    }
  });

  it('all page slugs are unique', () => {
    const manifest = generateSite(getJSDocTaffyData());
    const slugs = manifest.pages.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('produces nav with one entry per page, grouped by kind then alphabetical', () => {
    const manifest = generateSite(getJSDocTaffyData());
    expect(manifest.nav.length).toBe(manifest.pages.length);
    // Nav is ordered by group display order (Modules, Namespaces, …) and then
    // alphabetically by label within each group. Assert that ordering: for each
    // adjacent pair the (order, label) tuple is non-decreasing.
    const nav = manifest.nav;
    for (let i = 1; i < nav.length; i++) {
      const prev = nav[i - 1];
      const cur = nav[i];
      const po = prev.order ?? 0;
      const co = cur.order ?? 0;
      expect(po).toBeLessThanOrEqual(co);
      if (po === co) {
        expect(prev.label.localeCompare(cur.label)).toBeLessThanOrEqual(0);
      }
    }
    // Every nav slug matches a page slug.
    const slugSet = new Set(manifest.pages.map((p) => p.slug));
    for (const node of nav) {
      expect(node.slug).toBeDefined();
      expect(slugSet.has(node.slug!)).toBe(true);
    }
  });

  it('buildId is non-empty and its hash suffix is stable across calls', () => {
    const a = generateSite(getJSDocTaffyData());
    const b = generateSite(getJSDocTaffyData());
    expect(a.buildId).toBeTruthy();
    const hashA = a.buildId.split('-').pop();
    const hashB = b.buildId.split('-').pop();
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{8}$/);
  });

  it('surfaces pkg metadata when provided', () => {
    const manifest = generateSite(getJSDocTaffyData(), {
      pkg: { name: 'foo', version: '1.0.0' },
    });
    expect(manifest.pkg).toEqual({ name: 'foo', version: '1.0.0' });
  });

  it('omits pkg when not provided', () => {
    const manifest = generateSite(getJSDocTaffyData());
    expect(manifest.pkg).toBeUndefined();
  });

  it('emits container pages for module/namespace/interface/mixin with correct kind + slug', () => {
    const manifest = generateSite(getJSDocTaffyData());
    const byKind = (k: string) =>
      manifest.pages.filter((p) => p.frontmatter.kind === k);

    const modules = byKind('module');
    expect(modules.map((p) => p.frontmatter.longname)).toEqual(
      expect.arrayContaining(['module:CoreSchema', 'module:UserService']),
    );
    for (const p of modules) expect(p.slug.startsWith('module/')).toBe(true);

    const namespaces = byKind('namespace');
    expect(namespaces.map((p) => p.frontmatter.longname)).toEqual(
      expect.arrayContaining(['Utils', 'MathUtils']),
    );

    const interfaces = byKind('interface');
    expect(interfaces.map((p) => p.frontmatter.longname)).toContain(
      'module:CoreSchema~ISerializable',
    );

    const mixins = byKind('mixin');
    expect(mixins.map((p) => p.frontmatter.longname)).toContain('LoggerMixin');

    // Classes still render.
    expect(byKind('class').map((p) => p.frontmatter.longname)).toContain('DataProcessor');

    // Typedef pages render with kind:'typedef'; module-scoped typedefs slug
    // under module/.
    const typedefs = byKind('typedef');
    expect(typedefs.map((p) => p.frontmatter.longname)).toEqual(
      expect.arrayContaining([
        'module:CoreSchema~Point',
        'module:CoreSchema~DataHandler',
      ]),
    );
    const point = typedefs.find((p) => p.frontmatter.longname === 'module:CoreSchema~Point')!;
    expect(point.slug).toBe('module/coreschema/point');
  });

  it('includes the aggregated globals page + a nav entry under the Globals group', () => {
    const manifest = generateSite(getJSDocTaffyData());
    const globalPage = manifest.pages.find((p) => p.slug === 'global');
    expect(globalPage).toBeDefined();
    expect(globalPage!.frontmatter.kind).toBe('global');
    expect(globalPage!.frontmatter.title).toBe('Globals');

    const globalNav = manifest.nav.find((n) => n.slug === 'global');
    expect(globalNav).toBeDefined();
    expect(globalNav!.group).toBe('Globals');
  });

  it('merges pages that collide on slug, keeping the first kind and recovering both bodies (no warning)', () => {
    // Synthesize a collision: a `namespace` and a `class` whose longnames slug
    // identically ("Widget"). namespace is iterated before class, so it is the
    // merge base — its kind wins, but the class's body merges in (no drop).
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const collection = makeCollection([
      {
        kind: 'namespace',
        name: 'Widget',
        longname: 'Widget',
        scope: 'global',
        comment: '/** ns */',
        description: 'A widget namespace.',
      },
      {
        kind: 'class',
        name: 'Widget',
        longname: 'Widget',
        scope: 'global',
        comment: '/** cls */',
        classdesc: 'A widget class.',
      },
    ]);

    const manifest = generateSite(collection);
    const widgets = manifest.pages.filter((p) => p.slug === 'widget');
    expect(widgets.length).toBe(1);
    expect(widgets[0].frontmatter.kind).toBe('namespace');
    // Merge, not skip: no "skipping duplicate page slug" warning is emitted.
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('skipping duplicate page slug'),
    );
    // No duplicate slugs across the whole manifest.
    const slugs = manifest.pages.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    warn.mockRestore();
  });

  it('headings on at least one page are non-empty with slug-cased ids', () => {
    const manifest = generateSite(getJSDocTaffyData());
    const pageWithHeadings = manifest.pages.find((p) => (p.headings?.length ?? 0) > 0);
    expect(pageWithHeadings).toBeDefined();
    for (const h of pageWithHeadings!.headings!) {
      expect(h.text.length).toBeGreaterThan(0);
      expect(h.id).toMatch(/^[a-z0-9-]+$/);
      expect(h.id).not.toMatch(/\s/);
    }
  });
});

describe('generateMdx (legacy wrapper)', () => {
  it('returns one body string per page, matching generateSite', () => {
    const collection = getJSDocTaffyData();
    const manifest = generateSite(collection);
    const bodies = generateMdx(collection);
    expect(bodies.length).toBe(manifest.pages.length);
    for (let i = 0; i < bodies.length; i++) {
      expect(bodies[i]).toBe(manifest.pages[i].body);
    }
  });
});
