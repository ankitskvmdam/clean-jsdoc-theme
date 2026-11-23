/**
 * #359: JSDoc's markdown plugin renders a fenced block as
 * `<pre class="prettyprint source lang-js"><code>…</code></pre>` — the language
 * on the `<pre>`, as a `lang-*` class. `hast-util-to-mdast` reads only a
 * `language-*` class on the `<code>`, so the fence lost its language (and its
 * highlighting). setu now reads the `lang-*` class too.
 */
import { describe, it, expect } from 'vitest';
import type { Code, Root, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';
import { buildReadmePage } from '../guide-view';
import { toMdx } from '../mdx';

/** Serialize converted blocks the way a page body is written. */
const mdx = (nodes: RootContent[]): string => toMdx({ type: 'root', children: nodes } as Root);

/** Body of the HTML fragment `html`, serialized. */
const body = (html: string): string => mdx(htmlToMdastBlocks(html));

/** Every node of `type` in `nodes`, depth first. */
function all<T>(nodes: unknown[], test: (n: Record<string, unknown>) => boolean): T[] {
  const out: T[] = [];
  const walk = (list: unknown[]): void => {
    for (const n of list as Record<string, unknown>[]) {
      if (test(n)) out.push(n as T);
      if (Array.isArray(n.children)) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

const codes = (nodes: unknown[]): Code[] => all<Code>(nodes, (n) => n.type === 'code');

/** The one code node `html` converts to. */
function codeOf(html: string): Code {
  const found = codes(htmlToMdastBlocks(html));
  expect(found).toHaveLength(1);
  return found[0];
}

const jsdocFence = (lang: string, text: string): string =>
  `<pre class="prettyprint source lang-${lang}"><code>${text}\n</code></pre>`;

describe('a JSDoc fenced block keeps its language (#359)', () => {
  it.each(['js', 'ts', 'bash', 'c++', 'objective-c', 'C#'])('lang-%s', (lang) => {
    const html = jsdocFence(lang, 'x');
    expect(codeOf(html).lang).toBe(lang);
    expect(body(html).startsWith('```' + lang + '\n')).toBe(true);
  });

  it('converts the issue example to a js fence', () => {
    expect(
      body(
        '<p>Plain:</p>\n<pre class="prettyprint source lang-js"><code>console.log(4);\n</code></pre>'
      )
    ).toBe('Plain:\n\n```js\nconsole.log(4);\n```\n');
  });

  it.each([
    ['prettyprint source', '<pre class="prettyprint source"><code>x\n</code></pre>'],
    ['source (```plain)', '<pre class="source"><code>x\n</code></pre>'],
    ['no class (indented)', '<pre><code>x\n</code></pre>'],
    ['empty lang-', '<pre class="prettyprint source lang-"><code>x\n</code></pre>'],
  ])('has no language with %s', (_, html) => {
    expect(codeOf(html).lang).toBeNull();
  });

  it('keeps the code text unescaped', () => {
    expect(codeOf(jsdocFence('html', '&lt;div class=&quot;a&quot;>')).value).toBe(
      '<div class="a">'
    );
  });

  it('takes the language from the class marked leaks a meta into, and makes no playground', () => {
    const blocks = htmlToMdastBlocks(
      '<pre class="prettyprint source lang-js playground"><code>run();\n</code></pre>'
    );
    const [node] = codes(blocks);
    expect(node.lang).toBe('js');
    expect(node.meta ?? null).toBeNull();
    expect(all(blocks, (n) => n.name === 'Playground')).toHaveLength(0);
  });

  it.each([
    [
      'language-* on <code> wins',
      '<pre class="lang-js"><code class="language-py">x</code></pre>',
      'py',
    ],
    ['lang-* on <code>', '<pre><code class="lang-rb">x</code></pre>', 'rb'],
    ['language-* on <pre>', '<pre class="language-go">x</pre>', 'go'],
  ])('%s', (_, html, lang) => {
    expect(codeOf(html).lang).toBe(lang);
  });

  it('leaves the Markdown paths as they were', () => {
    expect(codes(markdownToMdastBlocks('```js\na\n```'))[0].lang).toBe('js');
    expect(
      all(markdownToMdastBlocks('```js playground codepen\na\n```'), (n) => n.name === 'Playground')
    ).toHaveLength(1);
    expect(codeOf('<pre><code class="language-py">x</code></pre>').lang).toBe('py');
  });

  it('keeps the language inside a list item', () => {
    const html = `<ul><li><p>Item</p>${jsdocFence('js', 'a();')}</li></ul>`;
    expect(codeOf(html).lang).toBe('js');
    expect(body(html)).toContain('```js\n');
  });

  it('keeps the language inside <details> (#360)', () => {
    const out = body(`<details><summary>S</summary>\n${jsdocFence('js', 'a();')}\n</details>`);
    expect(out).toContain('<details>');
    expect(out).toContain('  ```js\n  a();\n  ```');
  });

  it('gives a <playground> container the language of its code', () => {
    const blocks = htmlToMdastBlocks(
      `<playground codepen>\n${jsdocFence('js', 'run();')}\n</playground>`
    );
    const [pg] = all<MdxJsxFlowElement>(blocks, (n) => n.name === 'Playground');
    expect(pg).toBeDefined();
    expect(codes(pg.children)[0].lang).toBe('js');
  });

  it('turns an iframe fence in the README into an Embed', () => {
    const page = buildReadmePage(jsdocFence('iframe', 'https://codepen.io/x/embed/abc height=400'));
    expect(page).not.toBeNull();
    expect(page!.body).toContain('<Embed');
    expect(page!.body).toContain('https://codepen.io/x/embed/abc');
    expect(page!.body).not.toContain('```');
  });
});
