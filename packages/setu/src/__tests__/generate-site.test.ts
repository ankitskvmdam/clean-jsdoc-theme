import { describe, it, expect } from 'vitest';
import { generateMdx, generateSite } from '../index';
import {
  buildClassPage,
  enumerateClassLongnames,
  extractHeadings,
  splitLongnameForSlug,
} from '../generate-site';
import { classViewToMdast } from '../mdast/class-view';
import { getClassView } from '../class-view';
import { getJSDocTaffyData } from './factory';

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

  it('produces nav with one entry per page, sorted alphabetically by label', () => {
    const manifest = generateSite(getJSDocTaffyData());
    expect(manifest.nav.length).toBe(manifest.pages.length);
    const labels = manifest.nav.map((n) => n.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
    // Every nav slug matches a page slug.
    const slugSet = new Set(manifest.pages.map((p) => p.slug));
    for (const node of manifest.nav) {
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
