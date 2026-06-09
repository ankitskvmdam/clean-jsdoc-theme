import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { resolveEmbedFences, buildDocPages, type DocInput } from '../guide-view';
import { code, p, text, root, h } from '../mdast/builders';

afterEach(() => {
  vi.restoreAllMocks();
});

const isEmbed = (node: unknown): node is MdxJsxFlowElement =>
  !!node &&
  (node as MdxJsxFlowElement).type === 'mdxJsxFlowElement' &&
  (node as MdxJsxFlowElement).name === 'Embed';

const attrOf = (node: MdxJsxFlowElement, name: string): string | undefined => {
  const attr = node.attributes.find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === name,
  );
  return attr && typeof attr.value === 'string' ? attr.value : undefined;
};

describe('resolveEmbedFences', () => {
  it('replaces a lang:"iframe" code node with an Embed JSX node carrying the parsed src', () => {
    const tree: Root = root(code('iframe', 'https://codepen.io/x/embed/abc height=400'));
    resolveEmbedFences(tree);

    expect(tree.children).toHaveLength(1);
    const node = tree.children[0];
    expect(isEmbed(node)).toBe(true);
    expect(attrOf(node as MdxJsxFlowElement, 'src')).toBe('https://codepen.io/x/embed/abc');
    expect(attrOf(node as MdxJsxFlowElement, 'height')).toBe('400');
  });

  it('leaves a normal ```js fence untouched (byte-identical node)', () => {
    const jsNode = code('js', 'const x = 1;');
    const tree: Root = root(jsNode);
    const before = JSON.parse(JSON.stringify(tree));
    resolveEmbedFences(tree);

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]).toBe(jsNode); // same reference, not rebuilt
    expect(tree).toEqual(before);
  });

  it('drops an invalid (non-https) iframe fence', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tree: Root = root(
      p(text('before')),
      code('iframe', 'http://insecure.example.com'),
      p(text('after')),
    );
    resolveEmbedFences(tree);

    expect(tree.children).toHaveLength(2);
    expect(tree.children.some(isEmbed)).toBe(false);
    expect((tree.children[0] as { type: string }).type).toBe('paragraph');
    expect((tree.children[1] as { type: string }).type).toBe('paragraph');
  });

  it('handles a multi-line fence body', () => {
    const tree: Root = root(
      code('iframe', 'https://example.com/embed\nheight=300\ntitle="Live demo"'),
    );
    resolveEmbedFences(tree);

    expect(tree.children).toHaveLength(1);
    const node = tree.children[0] as MdxJsxFlowElement;
    expect(isEmbed(node)).toBe(true);
    expect(attrOf(node, 'src')).toBe('https://example.com/embed');
    expect(attrOf(node, 'height')).toBe('300');
    expect(attrOf(node, 'title')).toBe('Live demo');
  });

  it('handles multiple iframe fences in one tree, preserving order and surrounding nodes', () => {
    const tree: Root = root(
      h(1, text('Title')),
      code('iframe', 'https://example.com/one'),
      code('js', 'noop();'),
      code('iframe', 'https://example.com/two'),
    );
    resolveEmbedFences(tree);

    expect(tree.children).toHaveLength(4);
    expect((tree.children[0] as { type: string }).type).toBe('heading');
    expect(isEmbed(tree.children[1])).toBe(true);
    expect(attrOf(tree.children[1] as MdxJsxFlowElement, 'src')).toBe('https://example.com/one');
    expect((tree.children[2] as { type: string }).type).toBe('code');
    expect(isEmbed(tree.children[3])).toBe(true);
    expect(attrOf(tree.children[3] as MdxJsxFlowElement, 'src')).toBe('https://example.com/two');
  });

  it('leaves a tree with no iframe fences unchanged (deep-equal)', () => {
    const tree: Root = root(
      h(2, text('Heading')),
      p(text('Some prose.')),
      code('ts', 'const y: number = 2;'),
    );
    const before = JSON.parse(JSON.stringify(tree));
    resolveEmbedFences(tree);
    expect(tree).toEqual(before);
  });
});

describe('buildDocPages — prose iframe fence end-to-end', () => {
  it('emits <Embed in the rendered MDX body for a markdown iframe fence', () => {
    const docs: DocInput[] = [
      {
        path: 'demo',
        type: 'markdown',
        content: '# Demo\n\n```iframe\nhttps://example.com/live height=400\n```\n',
      },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages).toHaveLength(1);
    expect(pages[0].body).toContain('<Embed');
    expect(pages[0].body).toContain('src="https://example.com/live"');
    // The raw fence must not survive into the body.
    expect(pages[0].body).not.toContain('```iframe');
  });

  it('drops an invalid prose iframe fence (no <Embed, no fence)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const docs: DocInput[] = [
      {
        path: 'bad',
        type: 'markdown',
        content: '# Bad\n\n```iframe\nhttp://insecure.example.com\n```\n',
      },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages).toHaveLength(1);
    expect(pages[0].body).not.toContain('<Embed');
    expect(pages[0].body).not.toContain('insecure.example.com');
  });

  it('leaves a normal ```js fence in prose untouched', () => {
    const docs: DocInput[] = [
      {
        path: 'code',
        type: 'markdown',
        content: '# Code\n\n```js\nconst x = 1;\n```\n',
      },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].body).not.toContain('<Embed');
    expect(pages[0].body).toContain('const x = 1;');
  });
});
