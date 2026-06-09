import { describe, it, expect, vi, afterEach } from 'vitest';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { TDoclet } from '@clean-jsdoc-theme/utils';
import { embedBlocks, docletBlocks } from '../mdast/doclet';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Build a minimal doclet carrying the given `@iframe`/other tags. */
function docletWithTags(tags: TDoclet['tags']): TDoclet {
  return { kind: 'function', name: 'demo', tags } as TDoclet;
}

const isEmbed = (node: unknown): node is MdxJsxFlowElement =>
  !!node && (node as MdxJsxFlowElement).type === 'mdxJsxFlowElement' && (node as MdxJsxFlowElement).name === 'Embed';

const srcOf = (node: MdxJsxFlowElement): string | undefined => {
  const attr = node.attributes.find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === 'src'
  );
  return attr && typeof attr.value === 'string' ? attr.value : undefined;
};

describe('embedBlocks', () => {
  it('returns an Embed JSX node for a single @iframe tag', () => {
    const doclet = docletWithTags([
      { title: 'iframe', text: 'https://codepen.io/x/embed/abc height=400', value: 'https://codepen.io/x/embed/abc height=400' },
    ]);
    const blocks = embedBlocks(doclet);
    expect(blocks).toHaveLength(1);
    expect(isEmbed(blocks[0])).toBe(true);
    expect(srcOf(blocks[0] as MdxJsxFlowElement)).toBe('https://codepen.io/x/embed/abc');
  });

  it('returns one Embed node per @iframe tag, in order', () => {
    const doclet = docletWithTags([
      { title: 'iframe', value: 'https://example.com/one' },
      { title: 'iframe', value: 'https://example.com/two' },
    ]);
    const blocks = embedBlocks(doclet);
    expect(blocks).toHaveLength(2);
    expect(blocks.every(isEmbed)).toBe(true);
    expect((blocks as MdxJsxFlowElement[]).map(srcOf)).toEqual([
      'https://example.com/one',
      'https://example.com/two',
    ]);
  });

  it('ignores non-iframe tags', () => {
    const doclet = docletWithTags([
      { title: 'author', value: 'Jane' },
      { title: 'iframe', value: 'https://example.com/ok' },
      { title: 'see', value: 'https://example.com/elsewhere' },
    ]);
    const blocks = embedBlocks(doclet);
    expect(blocks).toHaveLength(1);
    expect(srcOf(blocks[0] as MdxJsxFlowElement)).toBe('https://example.com/ok');
  });

  it('returns [] when there are no iframe tags', () => {
    expect(embedBlocks(docletWithTags([{ title: 'author', value: 'Jane' }]))).toEqual([]);
    expect(embedBlocks(docletWithTags([]))).toEqual([]);
    expect(embedBlocks(docletWithTags(undefined))).toEqual([]);
  });

  it('drops invalid (non-https / empty) iframe configs', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doclet = docletWithTags([
      { title: 'iframe', value: 'http://insecure.example.com' }, // not https
      { title: 'iframe', value: '' }, // empty
      { title: 'iframe', value: 'ftp://nope.example.com' }, // wrong protocol
      { title: 'iframe', value: 'https://example.com/good' }, // valid → kept
    ]);
    const blocks = embedBlocks(doclet);
    expect(blocks).toHaveLength(1);
    expect(srcOf(blocks[0] as MdxJsxFlowElement)).toBe('https://example.com/good');
  });

  it('falls back to tag.text when value is absent', () => {
    const doclet = docletWithTags([{ title: 'iframe', text: 'https://example.com/from-text' }]);
    const blocks = embedBlocks(doclet);
    expect(blocks).toHaveLength(1);
    expect(srcOf(blocks[0] as MdxJsxFlowElement)).toBe('https://example.com/from-text');
  });
});

describe('docletBlocks — iframes section', () => {
  const docletWithExampleAndIframe = (): TDoclet =>
    ({
      kind: 'function',
      name: 'demo',
      examples: ['doStuff();'],
      tags: [{ title: 'iframe', value: 'https://example.com/live' }],
    }) as TDoclet;

  it('renders the iframes section after examples', () => {
    const blocks = docletBlocks(docletWithExampleAndIframe());

    const embedIdx = blocks.findIndex(isEmbed);
    const exampleCodeIdx = blocks.findIndex((b) => b.type === 'code');

    expect(embedIdx).toBeGreaterThanOrEqual(0);
    expect(exampleCodeIdx).toBeGreaterThanOrEqual(0);
    expect(embedIdx).toBeGreaterThan(exampleCodeIdx);
  });

  it('omits the iframes section when skipped', () => {
    const blocks = docletBlocks(docletWithExampleAndIframe(), { skip: ['iframes'] });
    expect(blocks.some(isEmbed)).toBe(false);
    // examples must still render — skip is scoped to iframes only.
    expect(blocks.some((b) => b.type === 'code')).toBe(true);
  });
});
