import { describe, it, expect } from 'vitest';
import { TDoclet } from '@clean-jsdoc-theme/utils';
import { getClassView } from '../class-view';
import { classViewToMdx } from '../mdx';
import {
  defaultDeprecationText,
  deprecationBlock,
  descriptionBlocks,
  docletBlocks,
  examplesBlocks,
  inheritedFromParagraph,
  paramsList,
  returnsList,
  typeExpressionInline,
  typeExpressionString,
} from '../mdast/doclet';
import { htmlToMdastBlocks, htmlToMdastInline } from '../mdast/from-html';
import {
  containerViewToMdast,
  memberBadges,
  memberBlocks,
  memberSignatureSuffix,
} from '../mdast/class-view';
import { extractHeadings } from '../generate-site';
import { root } from '../mdast/builders';
import type { ClassMember, ContainerView } from '../class-view';
import { getJSDocTaffyData } from './factory';

/** Minimal ContainerView for exercising containerViewToMdast directly. */
function makeContainerView(doclet: TDoclet, kind: ContainerView['kind'] = 'class'): ContainerView {
  return {
    doclet,
    kind,
    augments: doclet.augments ?? [],
    constructorParams: kind === 'class' ? (doclet.params ?? []) : [],
    instanceMethods: [],
    staticMethods: [],
    instanceFields: [],
    staticFields: [],
    enums: [],
    events: [],
    other: [],
  };
}

/** Concatenated text of an mdast tree, for presence assertions. */
function flatText(node: unknown): string {
  return JSON.stringify(node);
}

describe('htmlToMdastBlocks', () => {
  it('returns [] for empty/null/undefined input', () => {
    expect(htmlToMdastBlocks('')).toEqual([]);
    expect(htmlToMdastBlocks(null)).toEqual([]);
    expect(htmlToMdastBlocks(undefined)).toEqual([]);
  });

  it('converts simple HTML to mdast paragraph nodes', () => {
    const blocks = htmlToMdastBlocks('<p>Hello <strong>world</strong></p>');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
  });

  it('preserves JSDoc inline tags like {@link Foo} as literal text', () => {
    const blocks = htmlToMdastBlocks('<p>See {@link Foo} for details.</p>');
    // The raw `{@link Foo}` stays in the output — URL resolution is a later pass.
    const md = JSON.stringify(blocks);
    expect(md).toContain('{@link Foo}');
  });
});

describe('htmlToMdastInline', () => {
  it('flattens a single paragraph into inline content', () => {
    const inline = htmlToMdastInline('<p>The value</p>');
    expect(inline.length).toBeGreaterThan(0);
    // The text content is reachable directly — no wrapping paragraph node.
    expect(JSON.stringify(inline)).toContain('The value');
  });
});

describe('typeExpression helpers', () => {
  it('typeExpressionString joins names with " | "', () => {
    expect(typeExpressionString({ names: ['string', 'number'] })).toBe('string | number');
  });

  it('returns null for missing/empty type', () => {
    expect(typeExpressionString(undefined)).toBeNull();
    expect(typeExpressionInline(undefined)).toBeNull();
  });

  it('typeExpressionInline produces an inline-code paragraph', () => {
    const node = typeExpressionInline({ names: ['Promise.<number>'] })!;
    expect(node.type).toBe('paragraph');
  });
});

describe('paramsList', () => {
  it('returns null for empty/missing params', () => {
    expect(paramsList(undefined)).toBeNull();
    expect(paramsList([])).toBeNull();
  });

  it('renders flat params as a single list', () => {
    const list = paramsList([
      { name: 'a', type: { names: ['string'] }, description: '<p>first</p>' },
      { name: 'b', type: { names: ['number'] } },
    ])!;
    expect(list.type).toBe('list');
    expect(list.children).toHaveLength(2);
  });

  it('nests object-destructured params under their parent', () => {
    const list = paramsList([
      { name: 'options', type: { names: ['Object'] }, optional: true },
      { name: 'options.timeout', type: { names: ['number'] }, defaultvalue: 5000 },
      { name: 'options.retries', type: { names: ['number'] } },
    ])!;
    expect(list.children).toHaveLength(1); // just `options` at top level
    const optionsItem = list.children[0];
    const nestedList = optionsItem.children.find((c) => c.type === 'list');
    expect(nestedList).toBeDefined();
    expect((nestedList as { children: unknown[] }).children).toHaveLength(2);
  });
});

describe('returnsList', () => {
  it('renders type + description', () => {
    const list = returnsList([
      { type: { names: ['Promise.<number>'] }, description: '<p>count</p>' },
    ])!;
    expect(list.type).toBe('list');
    expect(list.children).toHaveLength(1);
  });
});

describe('examplesBlocks', () => {
  it('emits a code block per example with the requested lang', () => {
    const doc: TDoclet = { examples: ['const x = 1;', 'const y = 2;'] };
    const blocks = examplesBlocks(doc, 'ts');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'code', lang: 'ts', value: 'const x = 1;' });
  });

  it('returns [] when no examples', () => {
    expect(examplesBlocks({})).toEqual([]);
  });

  it('unwraps an already-fenced example instead of double-fencing it', () => {
    // TypeDoc auto-wraps @example bodies in a ```ts fence; setu must not wrap
    // again (which would produce ````js around ```ts and leak/escape braces).
    const doc: TDoclet = { examples: ['```ts\nconst c = new Circle({ x: 0 }, 2);\n```'] };
    const blocks = examplesBlocks(doc, 'js');
    expect(blocks).toHaveLength(1);
    // The fence language wins over the default, and the body is the inner code
    // with its braces intact (no surviving ``` fence markers).
    expect(blocks[0]).toMatchObject({
      type: 'code',
      lang: 'ts',
      value: 'const c = new Circle({ x: 0 }, 2);',
    });
  });

  it('lets an explicit {@lang} override the unwrapped fence language', () => {
    const doc: TDoclet = { examples: ['{@lang tsx}\n```ts\n<App />;\n```'] };
    const blocks = examplesBlocks(doc, 'js');
    expect(blocks[0]).toMatchObject({ type: 'code', lang: 'tsx', value: '<App />;' });
  });
});

describe('inheritedFromParagraph', () => {
  it('returns null when not inherited', () => {
    expect(inheritedFromParagraph({})).toBeNull();
  });

  it('reads inheritedFrom set by getClassView', () => {
    const node = inheritedFromParagraph({ inheritedFrom: 'BaseEntity' })!;
    expect(node.type).toBe('paragraph');
    const md = JSON.stringify(node);
    expect(md).toContain('BaseEntity');
  });

  it('falls back to JSDoc-emitted inherited+inherits', () => {
    const node = inheritedFromParagraph({ inherited: true, inherits: 'Parent#foo' })!;
    expect(JSON.stringify(node)).toContain('Parent#foo');
  });
});

describe('descriptionBlocks', () => {
  it('prefers classdesc over description', () => {
    const a = descriptionBlocks({ classdesc: '<p>Class-level</p>', description: '<p>Other</p>' });
    expect(JSON.stringify(a)).toContain('Class-level');
    expect(JSON.stringify(a)).not.toContain('Other');
  });
});

describe('docletBlocks (per-member composer)', () => {
  it('includes description, params, returns, examples, and metadata', () => {
    const doc: TDoclet = {
      description: '<p>Does a thing.</p>',
      params: [{ name: 'x', type: { names: ['string'] } }],
      returns: [{ type: { names: ['number'] } }],
      examples: ['foo()'],
      since: '1.0.0',
    };
    const blocks = docletBlocks(doc);
    const json = JSON.stringify(blocks);
    expect(json).toContain('Does a thing');
    expect(json).toContain('Parameters');
    expect(json).toContain('Returns');
    expect(json).toContain('Example');
    expect(json).toContain('foo()');
    expect(json).toContain('Since');
  });

  it('emits the deprecation callout as a typed Callout JSX element', () => {
    const doc: TDoclet = { deprecated: 'use foo instead' };
    const blocks = docletBlocks(doc);
    const callout = blocks.find(
      (b): b is import('mdast-util-mdx-jsx').MdxJsxFlowElement =>
        b.type === 'mdxJsxFlowElement' && b.name === 'Callout'
    );
    expect(callout).toBeDefined();
    expect(callout?.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'type',
      value: 'error',
    });
    // The supplied reason wins over the kind-aware default.
    const json = JSON.stringify(callout);
    expect(json).toContain('use foo instead');
    expect(json).not.toContain('is deprecated and should not be used');
  });

  it('falls back to kind-aware default text when @deprecated has no reason', () => {
    expect(defaultDeprecationText({ kind: 'class' })).toBe(
      'This class is deprecated and should not be used.'
    );
    expect(defaultDeprecationText({ kind: 'function', memberof: 'Foo' })).toBe(
      'This method is deprecated and should not be used.'
    );
    expect(defaultDeprecationText({ kind: 'function' })).toBe(
      'This function is deprecated and should not be used.'
    );
    expect(defaultDeprecationText({ kind: 'member', memberof: 'Foo' })).toBe(
      'This property is deprecated and should not be used.'
    );
    expect(defaultDeprecationText({ kind: 'typedef' })).toBe(
      'This type definition is deprecated and should not be used.'
    );
    // Unknown / synthetic kind degrades to a neutral noun.
    expect(defaultDeprecationText({})).toBe('This symbol is deprecated and should not be used.');
  });

  it('renders the default sentence inside the callout for `deprecated: true`', () => {
    const block = deprecationBlock({ deprecated: true, kind: 'module' });
    expect(block).not.toBeNull();
    const json = JSON.stringify(block);
    expect(json).toContain('This module is deprecated and should not be used.');
  });
});

describe('memberSignatureSuffix', () => {
  it('builds (paramNames) -> ReturnType for a function (names only, no types)', () => {
    const m = {
      kind: 'function',
      name: 'process',
      params: [
        { name: 'data', type: { names: ['string[]'] } },
        { name: 'data.flag', type: { names: ['boolean'] } },
      ],
      returns: [{ type: { names: ['Promise.<number>'] } }],
    } as unknown as ClassMember;
    // Nested object-param entries (data.flag) are folded out of the signature.
    expect(memberSignatureSuffix(m)).toBe('(data) -> Promise.<number>');
  });

  it('omits the arrow when there is no return type', () => {
    const m = { kind: 'function', name: 'reset', params: [] } as unknown as ClassMember;
    expect(memberSignatureSuffix(m)).toBe('()');
  });

  it('returns undefined for non-functions (fields keep a bare name)', () => {
    const m = {
      kind: 'member',
      name: 'size',
      type: { names: ['number'] },
    } as unknown as ClassMember;
    expect(memberSignatureSuffix(m)).toBeUndefined();
  });
});

describe('memberBadges', () => {
  it('collects scope, async, and deprecated flags', () => {
    const m = {
      kind: 'function',
      name: 'process',
      scope: 'static',
      async: true,
      deprecated: 'use x',
    } as unknown as ClassMember;
    expect(memberBadges(m)).toEqual(['static', 'async', 'deprecated']);
  });

  it('drops the redundant public access', () => {
    const m = { kind: 'member', name: 'x', access: 'public' } as unknown as ClassMember;
    expect(memberBadges(m)).toEqual([]);
  });
});

describe('memberBlocks', () => {
  it('emits a MemberHeading (single-code signature) + a MemberMeta row (no Modifiers paragraph)', () => {
    const m = {
      kind: 'function',
      name: 'process',
      scope: 'static',
      async: true,
      params: [{ name: 'items', type: { names: ['string[]'] } }],
      returns: [{ type: { names: ['void'] } }],
    } as unknown as ClassMember;
    const blocks = memberBlocks(m, {
      sourceLink: () => ({ href: '/source/x/#L1', label: 'x.js:1' }),
    });
    // The heading is a MemberHeading JSX node carrying the full signature in one
    // `sig` attribute, an explicit `id`, and the clean `name` for the TOC.
    const heading = blocks[0] as {
      type: string;
      name?: string;
      attributes: { name: string; value: string }[];
    };
    expect(heading.type).toBe('mdxJsxFlowElement');
    expect(heading.name).toBe('MemberHeading');
    const hattrs = Object.fromEntries(heading.attributes.map((a) => [a.name, a.value]));
    expect(hattrs.id).toBe('process');
    expect(hattrs.name).toBe('process');
    expect(hattrs.depth).toBe('3');
    expect(hattrs.sig).toBe('process(items) -> void');
    // CRITICAL invariant: extractHeadings reads the explicit id + clean name, so
    // the anchor stays `#process` despite the displayed signature — TOC / search
    // / {@link} are unchanged.
    const headings = extractHeadings(root(...blocks));
    expect(headings[0]).toMatchObject({ depth: 3, text: 'process', id: 'process' });
    // One MemberMeta row carries both the chips and the source (same container).
    const meta = blocks.find(
      (b) => b.type === 'mdxJsxFlowElement' && (b as { name?: string }).name === 'MemberMeta'
    ) as { attributes: { name: string; value: string }[] } | undefined;
    expect(meta).toBeDefined();
    const attrs = Object.fromEntries(meta!.attributes.map((a) => [a.name, a.value]));
    expect(attrs.badges).toBe('static,async');
    expect(attrs.sourceHref).toBe('/source/x/#L1');
    expect(attrs.sourceLabel).toBe('x.js:1');
    // No separate SourceLink for the member, and the old "Modifiers:" paragraph is gone.
    expect(JSON.stringify(blocks)).not.toContain('SourceLink');
    expect(JSON.stringify(blocks)).not.toContain('Modifiers');
  });

  it('still emits a MemberMeta row (badges only) when source is opted out', () => {
    const m = { kind: 'function', name: 'process', async: true } as unknown as ClassMember;
    const blocks = memberBlocks(m); // no sourceLink resolver
    const meta = blocks.find(
      (b) => b.type === 'mdxJsxFlowElement' && (b as { name?: string }).name === 'MemberMeta'
    ) as { attributes: { name: string; value: string }[] } | undefined;
    expect(meta).toBeDefined();
    const attrs = Object.fromEntries(meta!.attributes.map((a) => [a.name, a.value]));
    expect(attrs.badges).toBe('async');
    expect(attrs.sourceHref).toBeUndefined();
  });
});

describe('containerViewToMdast — Constructor section (description)', () => {
  it('renders the constructor description in the two-block case (classdesc + description)', () => {
    // Issue 1: a class doc comment (classdesc) AND a separate constructor doc
    // comment (description). The classdesc shows in the body; the constructor
    // description must show in the Constructor section.
    const view = makeContainerView({
      kind: 'class',
      name: 'Gadget',
      classdesc: '<p>A gadget. (class-level comment)</p>',
      description: '<p>Build a gadget from a spec.</p>',
      params: [{ name: 'spec', type: { names: ['object'] }, description: '<p>The spec.</p>' }],
    });
    const json = flatText(containerViewToMdast(view));
    expect(json).toContain('A gadget. (class-level comment)');
    expect(json).toContain('Build a gadget from a spec.');
  });

  it('does not duplicate the description for a single-comment class', () => {
    // Only a class-level comment → JSDoc puts it in classdesc, description is
    // undefined. The Constructor section must not repeat it.
    const view = makeContainerView({
      kind: 'class',
      name: 'Solo',
      classdesc: '<p>Just one comment.</p>',
      params: [{ name: 'id', type: { names: ['string'] } }],
    });
    const json = flatText(containerViewToMdast(view));
    expect(json.split('Just one comment.').length - 1).toBe(1);
  });

  it('still shows a constructor-only comment (no classdesc) exactly once', () => {
    // Only a constructor comment → classdesc undefined, description set. The
    // body fallback (classdesc ?? description) shows it; the Constructor section
    // must not add a second copy.
    const view = makeContainerView({
      kind: 'class',
      name: 'CtorOnly',
      description: '<p>Built from a constructor comment.</p>',
      params: [{ name: 'id', type: { names: ['string'] } }],
    });
    const json = flatText(containerViewToMdast(view));
    expect(json.split('Built from a constructor comment.').length - 1).toBe(1);
  });
});

describe('classViewToMdx (end-to-end on DataProcessor)', () => {
  it('produces a non-empty mdx string with title and key sections', () => {
    const view = getClassView(getJSDocTaffyData(), 'DataProcessor')!;
    const mdx = classViewToMdx(view);

    // Frontmatter
    expect(mdx).toMatch(/^---\n[\s\S]*?\n---/);
    expect(mdx).toMatch(/title: DataProcessor/);
    expect(mdx).toMatch(/kind: class/);

    // Title
    expect(mdx).toMatch(/^# DataProcessor/m);

    // Sections that should exist for DataProcessor (default filters drop
    // private/undocumented, so processCount and timeout don't appear).
    expect(mdx).toContain('Instance Methods');
    expect(mdx).toContain('Static Methods');
    expect(mdx).toContain('Events');
    expect(mdx).toContain('Enums');

    // Members appear by name.
    expect(mdx).toContain('process');
    expect(mdx).toContain('isValidId');
    expect(mdx).toContain('dataProcessed');
    expect(mdx).toContain('States');

    // Constructor section appears because the class has params.
    expect(mdx).toMatch(/## Constructor/);

    // Private (`processCount`) is dropped by default. `timeout` may appear
    // as a constructor param (`options.timeout`) but not as an instance field.
    expect(mdx).not.toMatch(/\bprocessCount\b/);
    const instanceFieldsSection = mdx.split('## Instance Fields')[1]?.split(/\n## /)[0] ?? '';
    expect(instanceFieldsSection).not.toMatch(/\btimeout\b/);
  });

  it('respects custom frontmatter', () => {
    const view = getClassView(getJSDocTaffyData(), 'DataProcessor')!;
    const mdx = classViewToMdx(view, {
      frontmatter: { title: 'Custom Title', slug: 'custom-slug' },
    });
    expect(mdx).toMatch(/title: Custom Title/);
    expect(mdx).toMatch(/slug: custom-slug/);
    expect(mdx).not.toMatch(/kind: class/);
  });
});
