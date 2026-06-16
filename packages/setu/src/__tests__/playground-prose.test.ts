import { describe, it, expect, vi, afterEach } from 'vitest';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { buildDocPages, type DocInput } from '../guide-view';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';

afterEach(() => {
  vi.restoreAllMocks();
});

const isPlayground = (node: unknown): node is MdxJsxFlowElement =>
  !!node &&
  (node as MdxJsxFlowElement).type === 'mdxJsxFlowElement' &&
  (node as MdxJsxFlowElement).name === 'Playground';

const attrOf = (node: MdxJsxFlowElement, name: string): string | undefined => {
  const attr = node.attributes.find((a) => a.type === 'mdxJsxAttribute' && a.name === name);
  return attr && typeof attr.value === 'string' ? attr.value : undefined;
};

describe('markdownToMdastBlocks — playground fence', () => {
  it('lowers a ```js playground … fence to a <Playground> wrapping the code', () => {
    const nodes = markdownToMdastBlocks(
      '```js playground codepen filename=resize.js highlight=1,4\nresize(img, 200);\n```\n'
    );
    const pg = nodes.find(isPlayground) as MdxJsxFlowElement;
    expect(pg).toBeTruthy();
    expect(attrOf(pg, 'providers')).toBe('codepen');
    expect(attrOf(pg, 'filename')).toBe('resize.js');
    expect(attrOf(pg, 'highlight')).toBe('1,4');
    const child = pg.children[0] as { type: string; lang?: string; value?: string };
    expect(child.type).toBe('code');
    expect(child.lang).toBe('js');
    expect(child.value).toBe('resize(img, 200);');
  });

  it('a bare ```js playground fence defaults to ALL providers', () => {
    const nodes = markdownToMdastBlocks('```js playground\nresize();\n```\n');
    const pg = nodes.find(isPlayground) as MdxJsxFlowElement;
    expect(attrOf(pg, 'providers')).toBe('codepen jsfiddle codesandbox');
  });

  it('leaves a normal ```js fence untouched', () => {
    const nodes = markdownToMdastBlocks('```js\nconst x = 1;\n```\n');
    expect(nodes.some(isPlayground)).toBe(false);
    expect((nodes[0] as { type: string }).type).toBe('code');
  });

  it('emits a bare code fence for ```js playground off (no wrapper)', () => {
    const nodes = markdownToMdastBlocks('```js playground off\nconst x = 1;\n```\n');
    expect(nodes.some(isPlayground)).toBe(false);
    expect((nodes[0] as { type: string }).type).toBe('code');
  });

  it('recognizes playground as the FIRST token (no language)', () => {
    const nodes = markdownToMdastBlocks('```playground codepen\nresize();\n```\n');
    const pg = nodes.find(isPlayground) as MdxJsxFlowElement;
    expect(pg).toBeTruthy();
    expect(attrOf(pg, 'providers')).toBe('codepen');
    const child = pg.children[0] as { type: string; lang: string | null };
    expect(child.type).toBe('code');
    // No language token was given, so the fence carries none.
    expect(child.lang).toBeNull();
  });

  it('lowers a ~~~-delimited playground fence', () => {
    const nodes = markdownToMdastBlocks('~~~js playground codepen\nresize();\n~~~\n');
    const pg = nodes.find(isPlayground) as MdxJsxFlowElement;
    expect(pg).toBeTruthy();
    expect(attrOf(pg, 'providers')).toBe('codepen');
    expect((pg.children[0] as { value: string }).value).toBe('resize();');
  });

  it('still recognizes an indented playground fence', () => {
    const nodes = markdownToMdastBlocks('  ```js playground codepen\n  resize();\n  ```\n');
    const pg = nodes.find(isPlayground) as MdxJsxFlowElement;
    expect(pg).toBeTruthy();
    expect(attrOf(pg, 'providers')).toBe('codepen');
    expect((pg.children[0] as { value: string }).value).toContain('resize();');
  });

  it('leaves an unterminated playground fence as plain text (no crash, no wrapper)', () => {
    const nodes = markdownToMdastBlocks('```js playground codepen\nresize();\n');
    expect(nodes.some(isPlayground)).toBe(false);
  });

  it('does NOT lower a playground fence merely DISPLAYED inside an outer fence', () => {
    // A 4-backtick ````md block on a docs page that shows the ```js playground
    // syntax literally. The inner fence must stay literal text, not be lowered —
    // otherwise the page renders two/nested code blocks.
    const md =
      '````markdown\n' +
      '```js playground codepen filename=demo.js highlight=2\n' +
      'const out = resize(img, 200);\n' +
      'render(out);\n' +
      '```\n' +
      '````\n';
    const nodes = markdownToMdastBlocks(md);
    expect(nodes.some(isPlayground)).toBe(false);
    // One code block (the outer fence), carrying the inner fence as literal text.
    const code = nodes.find((n) => (n as { type: string }).type === 'code') as {
      value: string;
    };
    expect(code).toBeTruthy();
    expect(code.value).toContain('```js playground codepen');
  });
});

describe('<playground> container — works on HTML (README) too', () => {
  it('wraps the inner fenced code in a <Playground> from an HTML source', () => {
    const html = '<playground codepen filename="x.js"><pre><code class="language-js">resize();</code></pre></playground>';
    const nodes = htmlToMdastBlocks(html);
    const pg = nodes.find(isPlayground) as MdxJsxFlowElement;
    expect(pg).toBeTruthy();
    expect(attrOf(pg, 'providers')).toBe('codepen');
    expect(attrOf(pg, 'filename')).toBe('x.js');
    expect((pg.children[0] as { type: string }).type).toBe('code');
  });

  it('passes a <playground off> container through unwrapped (code preserved)', () => {
    const md = '<playground off>\n\n```js\nconst x = 1;\n```\n\n</playground>';
    const nodes = markdownToMdastBlocks(md);
    expect(nodes.some(isPlayground)).toBe(false);
    expect(nodes.some((n) => (n as { type: string }).type === 'code')).toBe(true);
  });

  it('wraps a <playground> nested inside <steps> (recursion)', () => {
    const md =
      '<steps>\n<step label="One">\n\n<playground codepen>\n\n```js\nresize();\n```\n\n</playground>\n\n</step>\n</steps>';
    const nodes = markdownToMdastBlocks(md);
    const steps = nodes.find(
      (n) => (n as MdxJsxFlowElement).type === 'mdxJsxFlowElement' && (n as MdxJsxFlowElement).name === 'Steps'
    ) as MdxJsxFlowElement;
    expect(steps).toBeTruthy();
    // A <Playground> should appear somewhere within the steps subtree.
    const json = JSON.stringify(steps);
    expect(json).toContain('"name":"Playground"');
  });

  it('warns and wraps only the first fence when a <playground> holds several', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const md =
      '<playground codepen>\n\n```js\nfirst();\n```\n\n```js\nsecond();\n```\n\n</playground>';
    const nodes = markdownToMdastBlocks(md);
    expect(nodes.filter(isPlayground)).toHaveLength(1);
    // The second fence is preserved as a bare code node.
    expect(nodes.filter((n) => (n as { type: string }).type === 'code')).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('only the first code block'));
  });
});

describe('buildDocPages — playground fence end-to-end', () => {
  it('emits <Playground in the rendered MDX body and drops the raw fence meta', () => {
    const docs: DocInput[] = [
      {
        path: 'demo',
        type: 'markdown',
        content: '# Demo\n\n```js playground codepen\nresize(img, 200);\n```\n',
      },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages).toHaveLength(1);
    expect(pages[0].body).toContain('<Playground');
    expect(pages[0].body).toContain('providers="codepen"');
    expect(pages[0].body).toContain('resize(img, 200);');
    expect(pages[0].body).not.toContain('playground codepen\n');
  });

  it('leaves a normal ```js fence in prose untouched', () => {
    const docs: DocInput[] = [
      { path: 'code', type: 'markdown', content: '# Code\n\n```js\nconst x = 1;\n```\n' },
    ];
    const { pages } = buildDocPages(docs);
    expect(pages[0].body).not.toContain('<Playground');
    expect(pages[0].body).toContain('const x = 1;');
  });
});
