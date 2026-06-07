/**
 * Integration tests for the two-pass link-resolution build in `generateSite`.
 *
 * These assert against the EMITTED manifest — the serialized MDX `body` of real
 * pages — so they verify the whole pipeline: dedup → registry → resolver →
 * `resolveLinkTags`/`@see` rewrite → `toMdx`. The fixture (`getJSDocTaffyData`)
 * is the same `examples/basic` collection the rest of the suite uses.
 */
import { describe, it, expect } from 'vitest';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { generateSite } from '../index';
import { getJSDocTaffyData } from './factory';

function makeCollection(items: unknown[]): TJSDocSaltyCollection<TDoclet> {
  return salty.taffy(items) as unknown as TJSDocSaltyCollection<TDoclet>;
}

const bodyOf = (manifest: ReturnType<typeof generateSite>, longname: string) =>
  manifest.pages.find((p) => p.frontmatter.longname === longname)?.body ?? '';

/**
 * The MDX body sans the leading YAML frontmatter block. The frontmatter
 * `description` is `stripHtml` of the raw doclet text and is intentionally NOT
 * link-resolved, so prose-content assertions must look past it.
 */
const contentOf = (manifest: ReturnType<typeof generateSite>, longname: string) =>
  bodyOf(manifest, longname).replace(/^---\n[\s\S]*?\n---\n/, '');

describe('link resolution — fixture cross-references', () => {
  it('resolves an internal `@see` namepath to a real anchor', () => {
    // `module:UserService`'s `createUser` carries `@see User`. `User` is a class
    // enumerated AFTER the module in CONTAINER_KINDS order, so this also exercises
    // the registry-before-render guarantee (forward reference resolves).
    const manifest = generateSite(getJSDocTaffyData());
    const body = bodyOf(manifest, 'module:UserService');
    expect(body).toContain('[User](/user)');
  });

  it('resolves an external `{@link URL|label}` to an external link', () => {
    // `BaseEntity`'s `@see {@link https://…|Data Modeling}`.
    const manifest = generateSite(getJSDocTaffyData());
    const body = bodyOf(manifest, 'module:CoreSchema~BaseEntity');
    expect(body).toContain('[Data Modeling](https://en.wikipedia.org/wiki/Data_model)');
  });

  it('resolves a bare `{@link BaseEntity}` via the unique short-name fallback', () => {
    // `DataProcessor`'s description has `{@link BaseEntity}`. No registry key is
    // the bare `BaseEntity`; the only longname carrying that short name is
    // `module:CoreSchema~BaseEntity`, so the unique short-name fallback (Part A)
    // resolves it to that symbol's registered location.
    const manifest = generateSite(getJSDocTaffyData());
    // The frontmatter `description` keeps the raw `{@link BaseEntity}` text
    // (frontmatter is never link-resolved); assert against the page CONTENT.
    const content = contentOf(manifest, 'DataProcessor');
    // A real internal link (not a broken `](` empty href, not a leftover tag).
    expect(content).toContain('[BaseEntity](/module/coreschema');
    expect(content).not.toContain('{@link BaseEntity}');
    expect(content).not.toContain('](#)');
  });

  it('falls back to inline code for an unresolved `{@linkcode member}`', () => {
    // `{@linkcode DataProcessor#streamEngine}` — no such member is registered.
    const manifest = generateSite(getJSDocTaffyData());
    const body = bodyOf(manifest, 'DataProcessor');
    expect(body).toContain('`DataProcessor#streamEngine`');
    expect(body).not.toContain('[DataProcessor#streamEngine](');
  });
});

describe('link resolution — registry built before render (forward references)', () => {
  /**
   * A class that links to a module AND a module that links back to the class.
   * The module is enumerated first (CONTAINER_KINDS order), so the class→module
   * link is a backward reference and the module→class link is a forward
   * reference. Both must resolve, which is only possible if the registry is
   * fully populated before ANY body is rendered.
   */
  function crossRefCollection(): TJSDocSaltyCollection<TDoclet> {
    return makeCollection([
      {
        kind: 'module',
        name: 'shapes',
        longname: 'module:shapes',
        scope: 'global',
        comment: '/** Shapes module. @see Circle */',
        description: 'Shapes module.',
        // `@see Circle` — forward ref to a class enumerated after modules.
        see: ['Circle'],
      },
      {
        kind: 'class',
        name: 'Circle',
        longname: 'Circle',
        scope: 'global',
        comment: '/** A circle. @see module:shapes */',
        classdesc: 'A circle.',
        // `@see module:shapes` — backward ref to the module.
        see: ['module:shapes'],
      },
    ]);
  }

  it('resolves a module → class forward reference', () => {
    const manifest = generateSite(crossRefCollection());
    const moduleBody = bodyOf(manifest, 'module:shapes');
    // Circle's slug is `circle`.
    expect(moduleBody).toContain('[Circle](/circle)');
  });

  it('resolves a class → module backward reference', () => {
    const manifest = generateSite(crossRefCollection());
    const classBody = bodyOf(manifest, 'Circle');
    // module:shapes' slug is `module/shapes`.
    expect(classBody).toContain('[module:shapes](/module/shapes)');
  });
});

describe('link resolution — registry slugs match emitted pages after dedup', () => {
  it('does not register a slug for a page dropped by the dedup guard', () => {
    // A namespace and class that slug-collide on "widget"; the namespace wins.
    // The class page is dropped, so a link to the class longname must resolve to
    // the SAME surviving slug (the registry can never point at a non-existent
    // page). Here both longnames are "Widget", so the single `widget` slug is
    // shared — assert the manifest has exactly one `widget` page.
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
    expect(widgets).toHaveLength(1);
    expect(widgets[0].frontmatter.kind).toBe('namespace');
  });
});
