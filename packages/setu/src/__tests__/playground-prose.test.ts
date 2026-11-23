import { describe, it, expect, vi, afterEach } from 'vitest';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { buildDocPages, type DocInput } from '../guide-view';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';
import { toMdx } from '../mdx';

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

describe('playground fence inside containers (#362)', () => {
  const mdx = (md: string): string => toMdx({ type: 'root', children: markdownToMdastBlocks(md) });
  type Node = {
    type: string;
    name?: string;
    children?: Node[];
    value?: string;
    lang?: string | null;
  };
  /** Every node under `nodes`, depth first. */
  const walk = (nodes: readonly Node[]): Node[] =>
    nodes.flatMap((n) => [n, ...walk(n.children ?? [])]);
  const blocks = (md: string): Node[] => markdownToMdastBlocks(md) as unknown as Node[];

  it('keeps the top-level output unchanged', () => {
    expect(mdx('```js playground codepen filename=a.js\nrun();\n```\n')).toBe(
      '<Playground providers="codepen" filename="a.js">\n  ```js\n  run();\n  ```\n</Playground>\n'
    );
  });

  it('lowers a fence in a list item in place, keeping the list whole', () => {
    const md = '- first item\n\n  ```js playground codepen\n  run();\n  ```\n\n- second item\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('list');
    const items = nodes[0].children!;
    expect(items).toHaveLength(2);
    expect(items[0].children!.some(isPlayground)).toBe(true);
    expect(items[1].children!.some(isPlayground)).toBe(false);
    expect(mdx(md)).toBe(
      '- first item\n\n' +
        '  <Playground providers="codepen">\n    ```js\n    run();\n    ```\n  </Playground>\n\n' +
        '- second item\n'
    );
  });

  it('lowers a fence in a nested list item, keeping the parent list intact', () => {
    const md =
      '- outer\n\n  - inner\n\n    ```js playground codepen\n    run();\n    ```\n\n- outer two\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].children).toHaveLength(2);
    const inner = nodes[0].children![0].children!.find((n) => n.type === 'list')!;
    expect(walk(inner.children!).some(isPlayground)).toBe(true);
    expect(mdx(md)).toContain('\n    <Playground providers="codepen">\n');
  });

  it('lowers a fence directly after the text of a tight ordered item', () => {
    const md = '1. text\n   ```js playground codepen\n   run();\n   ```\n2. next\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].children).toHaveLength(2);
    expect(walk(nodes[0].children![0].children!).some(isPlayground)).toBe(true);
  });

  it('lowers a fence in a blockquote', () => {
    const md = '> quote\n>\n> ```js playground codepen\n> run();\n> ```\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('blockquote');
    expect(nodes[0].children!.some(isPlayground)).toBe(true);
    const out = mdx(md);
    expect(out).toContain('> <Playground providers="codepen">\n');
    expect(out).toContain('>   ```js\n');
  });

  it('lowers a fence in a blockquote inside a list item', () => {
    const md = '- item\n\n  > ```js playground codepen\n  > run();\n  > ```\n\n- next\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    const quote = nodes[0].children![0].children!.find((n) => n.type === 'blockquote')!;
    expect(quote.children!.some(isPlayground)).toBe(true);
  });

  it('lowers a fence in a list inside a blockquote', () => {
    const md = '> - item\n>\n>   ```js playground codepen\n>   run();\n>   ```\n>\n> - next\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    const list = nodes[0].children!.find((n) => n.type === 'list')!;
    expect(list.children).toHaveLength(2);
    expect(list.children![0].children!.some(isPlayground)).toBe(true);
  });

  it('lowers a fence inside an alert callout', () => {
    const md = '> [!TIP]\n> Try it:\n>\n> ```js playground codepen\n> run();\n> ```\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('Callout');
    expect(nodes[0].children!.some(isPlayground)).toBe(true);
    expect(mdx(md)).toContain('<Callout type="tip">');
  });

  it('lowers a fence inside <details>', () => {
    const md =
      '<details>\n<summary>More</summary>\n\n```js playground codepen\nrun();\n```\n\n</details>\n';
    const nodes = blocks(md);
    const details = walk(nodes).find((n) => n.name === 'details')!;
    expect(details).toBeTruthy();
    expect(details.children!.some(isPlayground)).toBe(true);
  });

  it('keeps a `js playground off` fence in its list item as bare code', () => {
    const md = '- item\n\n  ```js playground off\n  run();\n  ```\n\n- next\n';
    const nodes = blocks(md);
    expect(nodes).toHaveLength(1);
    expect(walk(nodes).some(isPlayground)).toBe(false);
    const code = nodes[0].children![0].children!.find((n) => n.type === 'code')!;
    expect(code.lang).toBe('js');
    expect(code.value).toBe('run();');
  });

  it('keeps inner indentation and blank lines of the code in a list item', () => {
    const md =
      '- item\n\n  ```js playground codepen\n  if (x) {\n    run();\n\n    again();\n  }\n  ```\n';
    const pg = walk(blocks(md)).find(isPlayground)!;
    expect(pg.children![0].value).toBe('if (x) {\n  run();\n\n  again();\n}');
  });

  it('lowers every fence of the issue repro in place (buildDocPages)', () => {
    const content =
      'Top level:\n\n```js playground\nconsole.log(1);\n```\n\n' +
      '- In a list item:\n\n  ```js playground\n  console.log(2);\n  ```\n\n' +
      '> In a quote:\n>\n> ```js playground\n> console.log(3);\n> ```\n';
    const { pages } = buildDocPages([{ path: 'pg', type: 'markdown', content }]);
    const body = pages[0].body;
    expect(body.match(/<Playground\b/g)).toHaveLength(3);
    expect(body).toContain('\n  <Playground');
    expect(body).toContain('\n> <Playground');
    expect(body).not.toMatch(/^<Playground[^\n]*>\n {2}```js\n {2}console\.log\(2\)/m);
  });

  it('does not let a raw data-setu-playground attribute spoof a playground', () => {
    const md =
      '<pre><code data-setu-playground="0">spoof();</code></pre>\n\n```js playground codepen\nrun();\n```\n';
    const out = mdx(md);
    expect(out.match(/<Playground\b/g)).toHaveLength(1);
    expect(out).toContain('spoof();');
    const pg = walk(blocks(md)).find(isPlayground)!;
    expect(pg.children![0].value).toBe('run();');
  });

  it('never makes a playground from the HTML path', () => {
    const nodes = htmlToMdastBlocks(
      '<pre><code class="language-js" data-setu-playground="0">run();</code></pre>'
    ) as unknown as Node[];
    expect(walk(nodes).some(isPlayground)).toBe(false);
  });
});
