/**
 * #360: inline HTML with no Markdown form (`<sub>`, `<sup>`, `<abbr>`, …) must
 * keep its markup through setu's HTML → mdast lowering. It passes through as a
 * lowercase MDX JSX element with an allow-listed set of attributes; everything
 * with a Markdown form (`<b>`, `<code>`, `<a>`, …) lowers as before.
 */
import { describe, it, expect } from 'vitest';
import type { Root, RootContent } from 'mdast';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import {
  htmlToMdastBlocks,
  htmlToMdastInline,
  markdownToMdastBlocks,
  markdownToMdastInline,
} from '../mdast/from-html';
import { toMdx } from '../mdx';
import { generateSite } from '../index';

/** Serialize converted blocks the way a page body is written. */
const mdx = (nodes: RootContent[]): string => toMdx({ type: 'root', children: nodes } as Root);

/** Body of the HTML fragment `html`, serialized and trimmed. */
const body = (html: string): string => mdx(htmlToMdastBlocks(html)).trim();

const GUARD = '\u2060';

describe('inline HTML with no Markdown form passes through (#360)', () => {
  it('keeps <sub> and <sup> in a paragraph', () => {
    expect(mdx(htmlToMdastBlocks('<p>Water is H<sub>2</sub>O and E = mc<sup>2</sup>.</p>'))).toBe(
      'Water is H<sub>2</sub>O and E = mc<sup>2</sup>.\n'
    );
  });

  it('keeps them in a description with no <p> (no markdown plugin) as one paragraph', () => {
    const blocks = htmlToMdastBlocks('Water is H<sub>2</sub>O.');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(mdx(blocks)).toBe('Water is H<sub>2</sub>O.\n');
  });

  it('keeps the element in inline conversion', () => {
    const inline = htmlToMdastInline('x<sup>2</sup>');
    expect(inline.map((n) => n.type)).toEqual(['text', 'mdxJsxTextElement']);
    expect(inline[1]).toMatchObject({ name: 'sup', attributes: [] });
  });

  it('keeps it through the Markdown paths', () => {
    expect(mdx(markdownToMdastBlocks('H<sub>2</sub>O')).trim()).toBe('H<sub>2</sub>O');
    const inline = markdownToMdastInline('E = mc<sup>2</sup>');
    expect(inline.some((n) => n.type === 'mdxJsxTextElement')).toBe(true);
  });

  it.each([
    [
      'link label',
      '<p><a href="https://x.y">H<sub>2</sub>O</a></p>',
      '[H<sub>2</sub>O](https://x.y)',
    ],
    ['emphasis', '<p><em>H<sub>2</sub>O</em></p>', '_H<sub>2</sub>O_'],
    ['strong', '<p><strong>H<sub>2</sub>O</strong></p>', '**H<sub>2</sub>O**'],
    ['heading', '<h2>CO<sub>2</sub> levels</h2>', '## CO<sub>2</sub> levels'],
    ['list item', '<ul><li>H<sub>2</sub>O</li></ul>', '- H<sub>2</sub>O'],
    [
      'footnote-style link',
      '<p>See<sup><a href="#fn1">1</a></sup>.</p>',
      'See<sup>[1](#fn1)</sup>.',
    ],
  ])('nests inside a %s', (_label, html, want) => {
    expect(body(html)).toBe(want);
  });

  it('nests inside a table cell', () => {
    const out = body(
      '<table><thead><tr><th>Gas</th></tr></thead><tbody><tr><td>CO<sub>2</sub></td></tr></tbody></table>'
    );
    expect(out).toContain('| CO<sub>2</sub> |');
  });

  it('leaves the text of <code> as code', () => {
    expect(body('<p><code>x<sub>2</sub></code></p>')).toBe('`x2`');
  });

  it('no longer lowers <mark> and <u> to emphasis', () => {
    expect(body('<p>a <mark>hot</mark> and <u>key</u> word</p>')).toBe(
      'a <mark>hot</mark> and <u>key</u> word'
    );
  });

  it('still lowers <kbd>, <samp> and <var> to inline code', () => {
    expect(body('<p>Press <kbd>K</kbd>, <samp>out</samp>, <var>n</var>.</p>')).toBe(
      'Press `K`, `out`, `n`.'
    );
  });

  it.each(['abbr', 'small', 'ins', 'cite', 'dfn', 'time', 'data', 'bdi', 'bdo'])(
    'passes <%s> through',
    (tag) => {
      expect(body(`<p>a <${tag}>in</${tag}> z</p>`)).toBe(`a <${tag}>in</${tag}> z`);
    }
  );

  it('passes ruby annotation through', () => {
    expect(body('<p>a <ruby>漢<rp>(</rp><rt>kan</rt><rp>)</rp></ruby> z</p>')).toBe(
      'a <ruby>漢<rp>(</rp><rt>kan</rt><rp>)</rp></ruby> z'
    );
  });

  it('leaves a glued literal like Array<sub> with no closer as text', () => {
    expect(body('<p>An Array<sub> of things.</p>')).toBe('An Array\\<sub> of things.');
  });
});

describe('attribute policy (#360)', () => {
  it('keeps only allow-listed attributes, as plain strings', () => {
    const out = body(
      '<p>x <abbr title="Hyper {Text} &quot;ML&quot;" onclick="x()" style="color:red" class="c" id="i" data-x="1" aria-label="l">HTML</abbr></p>'
    );
    expect(out).toMatch(/^x <abbr title="Hyper \{Text\} &#x22;ML&#x22;">HTML<\/abbr>$/);
    for (const dropped of ['onclick', 'style', 'class', 'id=', 'data-x', 'aria-label']) {
      expect(out).not.toContain(dropped);
    }
    const [node] = (
      htmlToMdastBlocks('<p><abbr title="T">A</abbr></p>')[0] as { children: unknown[] }
    ).children as Array<{ attributes: Array<{ type: string; value: unknown }> }>;
    expect(node.attributes).toEqual([{ type: 'mdxJsxAttribute', name: 'title', value: 'T' }]);
  });

  it('keeps per-element attributes', () => {
    expect(body('<p>x <time datetime="2026-01-02">Jan 2</time></p>')).toBe(
      'x <time datetime="2026-01-02">Jan 2</time>'
    );
    expect(body('<p>x <data value="42">forty-two</data></p>')).toBe(
      'x <data value="42">forty-two</data>'
    );
    expect(body('<p>x <ins cite="https://x.y" datetime="2026">new</ins></p>')).toBe(
      'x <ins cite="https://x.y" datetime="2026">new</ins>'
    );
    // `datetime` is not allowed on <sup>.
    expect(body('<p>x <sup datetime="x">2</sup></p>')).toBe('x <sup>2</sup>');
  });

  it('normalises values: backtick to quote, whitespace collapsed, empty dropped', () => {
    expect(body('<p>x <abbr title="a `b`\n   c">x</abbr></p>')).toBe(
      `x <abbr title="a 'b' c">x</abbr>`
    );
    expect(body('<p>x <abbr title="   ">x</abbr></p>')).toBe('x <abbr>x</abbr>');
  });

  it('checks lang and dir', () => {
    expect(body('<p>x <bdo dir="rtl" lang="ar-EG">x</bdo></p>')).toBe(
      'x <bdo lang="ar-EG" dir="rtl">x</bdo>'
    );
    expect(body('<p>x <bdo dir="up" lang="a b">x</bdo></p>')).toBe('x <bdo>x</bdo>');
  });

  it('unwraps a <span> left with no attribute, keeps one with lang', () => {
    expect(body('<p>a <span>b</span> c</p>')).toBe('a b c');
    expect(body('<p>a <span class="k">b</span> c</p>')).toBe('a b c');
    expect(body('<p>a <span lang="fr">oui</span> c</p>')).toBe('a <span lang="fr">oui</span> c');
  });
});

describe('fallbacks (#360)', () => {
  it('emits nothing for an empty element', () => {
    expect(body('<p>x<sup></sup> y</p>')).toBe('x y');
  });

  it('unwraps an element that holds flow content', () => {
    const out = body('<ins><p>a</p></ins>');
    expect(out).toBe('a');
  });
});

describe('JSX-only paragraph guard (#360)', () => {
  it('ends a paragraph of only JSX elements and whitespace with U+2060', () => {
    expect(mdx(htmlToMdastBlocks('<p><mark>a</mark> <sub>b</sub></p>'))).toBe(
      `<mark>a</mark> <sub>b</sub>${GUARD}\n`
    );
  });

  it('guards a tight list item of only JSX', () => {
    expect(mdx(htmlToMdastBlocks('<ul><li><sub>a</sub></li></ul>'))).toBe(
      `- <sub>a</sub>${GUARD}\n`
    );
  });

  it('does not guard a paragraph with other text', () => {
    expect(mdx(htmlToMdastBlocks('<p>x <sub>b</sub></p>'))).not.toContain(GUARD);
  });

  it('keeps U+2060 out of the mdast', () => {
    const blocks = htmlToMdastBlocks('<p><mark>a</mark> <sub>b</sub></p>');
    expect(JSON.stringify(blocks)).not.toContain(GUARD);
  });
});

describe('frontmatter description (#360)', () => {
  it('joins the text of <sub>/<sup> without spaces', () => {
    const collection = salty.taffy([
      {
        kind: 'namespace',
        name: 'Chem',
        longname: 'Chem',
        scope: 'global',
        comment: '/** ns */',
        description: '<p>Water is H<sub>2</sub>O and E = mc<sup>2</sup>.</p>',
      },
    ]) as unknown as TJSDocSaltyCollection<TDoclet>;
    const page = generateSite(collection).pages.find((p) => p.slug === 'chem');
    expect(page?.frontmatter.description).toBe('Water is H2O and E = mc2.');
    expect(page?.body).toContain('Water is H<sub>2</sub>O and E = mc<sup>2</sup>.');
  });
});

describe('<details>/<summary> stay collapsible (#360)', () => {
  it('keeps <details> with its <summary> first and the body as flow', () => {
    const blocks = htmlToMdastBlocks(
      '<details><summary>More <sub>x</sub></summary><p>Body</p><p>Two</p></details>'
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'mdxJsxFlowElement',
      name: 'details',
      attributes: [],
      children: [
        { type: 'mdxJsxTextElement', name: 'summary' },
        { type: 'paragraph' },
        { type: 'paragraph' },
      ],
    });
    expect(mdx(blocks)).toBe(
      '<details>\n  <summary>More <sub>x</sub></summary>\n\n  Body\n\n  Two\n</details>\n'
    );
  });

  it('keeps the open attribute', () => {
    expect(body('<details open><summary>S</summary><p>B</p></details>')).toMatch(
      /^<details open>\n {2}<summary>S<\/summary>/
    );
  });

  it('wraps bare body text in a paragraph', () => {
    const blocks = htmlToMdastBlocks('<details><summary>S</summary>bare <b>text</b></details>');
    expect(
      (blocks[0] as { children: Array<{ type: string }> }).children.map((c) => c.type)
    ).toEqual(['mdxJsxTextElement', 'paragraph']);
  });

  it('keeps a <details> with no <summary>', () => {
    expect(body('<details><p>B</p></details>')).toBe('<details>\n  B\n</details>');
  });

  it('unwraps a stray <summary>', () => {
    const out = body('<summary>S</summary><p>B</p>');
    expect(out).not.toContain('<summary');
    expect(out).toContain('S');
    expect(out).toContain('B');
  });

  it('nests in a list item', () => {
    const out = body(
      '<ul><li><p>Item</p><details><summary>S</summary><p>B</p></details></li></ul>'
    );
    expect(out).toContain('<details>');
    expect(out).toContain('<summary>S</summary>');
  });

  it('flattens a <details> in a table cell to its text, as before', () => {
    const out = body(
      '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td><div><details><summary>S</summary><p>B</p></details></div></td></tr></tbody></table>'
    );
    expect(out).not.toContain('<details');
    expect(out.split('\n')).toHaveLength(3);
    expect(out).toContain('| SB |');
  });

  it('keeps a fenced code block inside', () => {
    const out = mdx(
      markdownToMdastBlocks(
        '<details>\n<summary>Code</summary>\n\n```js\nconst a = 1;\n```\n\n</details>'
      )
    );
    expect(out).toContain('<summary>Code</summary>');
    expect(out).toContain('```js\n  const a = 1;\n  ```');
  });

  it('keeps the text of <details> in inline conversion', () => {
    const inline = htmlToMdastInline('<details><summary>S</summary><p>B</p></details>');
    expect(JSON.stringify(inline)).toContain('"S"');
    expect(JSON.stringify(inline)).toContain('"B"');
  });
});

describe('review follow-ups (#360)', () => {
  /** The `<summary>` line of a converted `<details>`. */
  const summaryLine = (html: string): string =>
    body(`<details><summary>${html}</summary><p>b</p></details>`).split('\n')[1].trim();

  it.each([
    [
      'a literal <',
      'Generic Array&lt;T&gt; and a &lt; b',
      '<summary>Generic Array\\<T> and a \\< b</summary>',
    ],
    [
      'an escaped script tag',
      '&lt;script&gt;alert(2)&lt;/script&gt;',
      '<summary>\\<script>alert(2)\\</script></summary>',
    ],
    // Braces are left to dwar's stray-brace pass, as in any paragraph.
    ['braces', '1 {two} three }', '<summary>1 {two} three }</summary>'],
    ['entities', '&#123;x&#125; &amp;lt;', '<summary>{x} \\&lt;</summary>'],
    [
      'a component name',
      '&lt;Callout type="danger"&gt;x&lt;/Callout&gt;',
      '<summary>\\<Callout type="danger">x\\</Callout></summary>',
    ],
    [
      'markup nested in strong and sub',
      '<b>{y} &lt;b&gt;</b> <sub>&lt;T&gt;</sub>',
      '<summary>**{y} \\<b>** <sub>\\<T></sub></summary>',
    ],
  ])('escapes %s in a <summary>', (_label, html, want) => {
    expect(summaryLine(html)).toBe(want);
    // Escaped exactly as the same content in a paragraph.
    expect(want).toBe(`<summary>${body(`<p>${html}</p>`)}</summary>`);
  });

  it('writes | in an attribute value as a character reference', () => {
    expect(body('<p>x <abbr title="p | q">y</abbr></p>')).toBe(
      'x <abbr title="p &#124; q">y</abbr>'
    );
    const table = body(
      '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td><abbr title="p | q">y</abbr></td></tr></tbody></table>'
    );
    expect(table.split('\n')[2]).toMatch(/^\| <abbr title="p &#124; q">y<\/abbr> +\|$/);
  });

  it('writes & in an attribute value as a character reference', () => {
    expect(body('<p>x <abbr title="a &amp;lt; b">y</abbr></p>')).toBe(
      'x <abbr title="a &#38;lt; b">y</abbr>'
    );
  });

  it.each([
    ['in a heading', '<h2><details><summary>s</summary>x</details></h2>'],
    ['in a span in a heading', '<h2>a <span><details><summary>s</summary>x</details></span></h2>'],
    ['in a link', '<a href="u">a <details><summary>s</summary>x</details></a>'],
  ])('flattens a <details> %s to its text', (_label, html) => {
    const out = body(html);
    expect(out).not.toContain('<details');
    expect(out).toContain('s');
    expect(out).toContain('x');
  });

  it('drops an <ins cite> that is not http(s) or relative', () => {
    expect(body('<p>x <ins cite="javascript:alert(1)">i</ins></p>')).toBe('x <ins>i</ins>');
    expect(body('<p>x <ins cite="JavaScript:x">i</ins></p>')).toBe('x <ins>i</ins>');
    expect(body('<p>x <ins cite="/changes/1">i</ins></p>')).toBe(
      'x <ins cite="/changes/1">i</ins>'
    );
    expect(body('<p>x <ins cite="a/b:c">i</ins></p>')).toBe('x <ins cite="a/b:c">i</ins>');
  });

  it('keeps a space where a late <summary> stood', () => {
    expect(body('<details>before <summary>late</summary> after</details>')).toBe(
      '<details>\n  <summary>late</summary>\n\n  before after\n</details>'
    );
  });
});
