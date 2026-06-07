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
import { getJSDocTaffyData } from './factory';

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
      value: 'warning',
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
    expect(defaultDeprecationText({})).toBe(
      'This symbol is deprecated and should not be used.'
    );
  });

  it('renders the default sentence inside the callout for `deprecated: true`', () => {
    const block = deprecationBlock({ deprecated: true, kind: 'module' });
    expect(block).not.toBeNull();
    const json = JSON.stringify(block);
    expect(json).toContain('This module is deprecated and should not be used.');
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
