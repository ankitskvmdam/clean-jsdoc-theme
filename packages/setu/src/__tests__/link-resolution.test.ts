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

describe('container merge — same-slug class doclets are merged, not dropped', () => {
  /**
   * A `@module` symbol JSDoc emits as two same-slug class doclets:
   *  - `module:queue/Queue~Queue`: classdesc + an instance method, no params.
   *  - `module:queue/Queue.Queue`: constructor params + a static method.
   * Plus a referrer page that `{@link}`s the `.Queue` longname, to exercise the
   * alias registration.
   */
  function mergeCollection(): TJSDocSaltyCollection<TDoclet> {
    return makeCollection([
      {
        kind: 'class',
        name: 'Queue',
        longname: 'module:queue/Queue~Queue',
        memberof: 'module:queue/Queue',
        scope: 'static',
        comment: '/** A FIFO queue. */',
        classdesc: 'A FIFO queue for jobs.',
      },
      {
        kind: 'function',
        name: 'push',
        longname: 'module:queue/Queue~Queue#push',
        memberof: 'module:queue/Queue~Queue',
        scope: 'instance',
        comment: '/** Push a job. */',
        description: 'Push a job onto the queue.',
      },
      {
        kind: 'class',
        name: 'Queue',
        longname: 'module:queue/Queue.Queue',
        memberof: 'module:queue/Queue',
        scope: 'static',
        comment: '/** @param {number} capacity Max size. */',
        params: [{ name: 'capacity', type: { names: ['number'] }, description: 'Max size.' }],
      },
      {
        kind: 'function',
        name: 'fromArray',
        longname: 'module:queue/Queue.Queue.fromArray',
        memberof: 'module:queue/Queue.Queue',
        scope: 'static',
        comment: '/** Build from array. */',
        description: 'Build a queue from an array.',
      },
      {
        kind: 'class',
        name: 'Worker',
        longname: 'Worker',
        scope: 'global',
        comment: '/** A worker. @see module:queue/Queue.Queue */',
        classdesc: 'A worker.',
        see: ['module:queue/Queue.Queue'],
      },
    ]);
  }

  // The surviving page is keyed by the first-seen (`~Queue`) longname.
  const QUEUE_LONGNAME = 'module:queue/Queue~Queue';
  const queuePage = (manifest: ReturnType<typeof generateSite>) =>
    manifest.pages.find((p) => p.frontmatter.longname === QUEUE_LONGNAME)!;

  it('emits exactly one page for the colliding slug', () => {
    const manifest = generateSite(mergeCollection());
    const page = queuePage(manifest);
    const slug = page.slug;
    const pages = manifest.pages.filter((p) => p.slug === slug);
    expect(pages).toHaveLength(1);
    // Only one nav entry references that slug.
    const occurrences = JSON.stringify(manifest.nav).split(`"${slug}"`).length - 1;
    expect(occurrences).toBe(1);
  });

  it('merged page carries classdesc, the Constructor section, AND members from both doclets', () => {
    const manifest = generateSite(mergeCollection());
    const body = queuePage(manifest).body;
    expect(body).toContain('A FIFO queue for jobs.'); // classdesc from `~Queue`
    expect(body).toContain('## Constructor'); // params from `.Queue`
    expect(body).toContain('capacity');
    expect(body).toContain('push'); // member from `~Queue`
    expect(body).toContain('fromArray'); // member from `.Queue`
  });

  it('the merged-away longname resolves to the surviving page (alias registration)', () => {
    const manifest = generateSite(mergeCollection());
    // Worker `@see module:queue/Queue.Queue` — the `.Queue` longname was merged
    // away; its alias must resolve to the surviving Queue page's slug.
    const slug = queuePage(manifest).slug;
    const workerBody = bodyOf(manifest, 'Worker');
    expect(workerBody).toContain(`(/${slug})`);
  });
});

describe('link resolution — type names link to the symbol they reference (v4 parity)', () => {
  /**
   * `Box` references the documented class `Widget` from every type-bearing slot:
   * a constructor param, a method param + return, an instance field's type, and
   * the `@augments` relation. Each must hyperlink to `Widget`'s page (`/widget`).
   * A built-in (`string`) type must NOT link — it has no registered symbol.
   */
  function typeRefCollection(): TJSDocSaltyCollection<TDoclet> {
    return makeCollection([
      {
        kind: 'class',
        name: 'Widget',
        longname: 'Widget',
        scope: 'global',
        comment: '/** A widget. */',
        classdesc: 'A widget.',
      },
      {
        kind: 'class',
        name: 'Box',
        longname: 'Box',
        scope: 'global',
        comment: '/** A box. @augments Widget @param {Widget} seed */',
        classdesc: 'A box.',
        augments: ['Widget'],
        params: [{ name: 'seed', type: { names: ['Widget'] }, description: 'Initial widget.' }],
      },
      {
        kind: 'member',
        name: 'current',
        longname: 'Box#current',
        memberof: 'Box',
        scope: 'instance',
        comment: '/** Current widget. */',
        description: 'Current widget.',
        type: { names: ['Widget'] },
      },
      {
        kind: 'function',
        name: 'wrap',
        longname: 'Box#wrap',
        memberof: 'Box',
        scope: 'instance',
        comment: '/** Wrap. */',
        description: 'Wrap a widget.',
        params: [
          { name: 'item', type: { names: ['Widget'] }, description: 'The widget.' },
          { name: 'label', type: { names: ['string'] }, description: 'A label.' },
        ],
        returns: [{ type: { names: ['Widget'] }, description: 'The wrapped widget.' }],
      },
    ]);
  }

  it('links a constructor param type (plain-text style) to the symbol page', () => {
    const body = bodyOf(generateSite(typeRefCollection()), 'Box');
    // The Parameters list renders the type as plain text, so the link has a
    // plain-text label.
    expect(body).toContain('[Widget](/widget)');
  });

  it('links a method param and return type (code style) to the symbol page', () => {
    const body = bodyOf(generateSite(typeRefCollection()), 'Box');
    // Returns/throws + a member field render the type as monospaced code, so the
    // link wraps an inline-code label.
    expect(body).toContain('[`Widget`](/widget)');
  });

  it('shows an instance field type in its heading signature (supersedes the Type field)', () => {
    const body = bodyOf(generateSite(typeRefCollection()), 'Box');
    // A field's type now rides in the member heading signature (shiki-highlighted
    // inline), so the separate "Type:" field is dropped — `current: Widget` shows
    // the type at a glance. Param / return / relation types still link in their
    // own tables (covered by the other cases here).
    expect(body).toContain('current: Widget');
    expect(body).not.toContain('**Type**');
    // The method return/param still contribute a code-style link to Widget.
    expect(body).toContain('[`Widget`](/widget)');
  });

  it('links the @augments relation to the base class', () => {
    const body = bodyOf(generateSite(typeRefCollection()), 'Box');
    expect(body).toContain('[`Widget`](/widget)');
    expect(body).toContain('Extends');
  });

  it('leaves a built-in type unlinked', () => {
    const body = bodyOf(generateSite(typeRefCollection()), 'Box');
    expect(body).not.toContain('[string]');
    expect(body).not.toContain('[`string`]');
  });
});
