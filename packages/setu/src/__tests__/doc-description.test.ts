import { describe, it, expect } from 'vitest';
import type { Root } from 'mdast';
import { DOC_DESCRIPTION_MAX, deriveDocDescription } from '../doc-description';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';

const md = (src: string): Root => ({ type: 'root', children: markdownToMdastBlocks(src) });
const html = (src: string): Root => ({ type: 'root', children: htmlToMdastBlocks(src) });

describe('deriveDocDescription (#370)', () => {
  it('uses the first plain paragraph', () => {
    expect(deriveDocDescription(md('Hello world.\n\nSecond paragraph.'))).toBe('Hello world.');
  });

  it('skips headings, code fences, lists and blockquotes to the first paragraph', () => {
    const tree = md(
      '# Title\n\n```js\nconst a = 1;\n```\n\n- item one\n- item two\n\n> a quote\n\nThe real intro.'
    );
    expect(deriveDocDescription(tree)).toBe('The real intro.');
  });

  it('skips a GitHub-style callout', () => {
    expect(deriveDocDescription(md('> [!NOTE]\n> Callout text.\n\nAfter the callout.'))).toBe(
      'After the callout.'
    );
  });

  it('skips Tabs / Steps components', () => {
    const tree = md('<Tabs>\n<Tab label="A">\n\nInside tab.\n\n</Tab>\n</Tabs>\n\nOutside.');
    expect(deriveDocDescription(tree)).toBe('Outside.');
    const steps = md('<Steps>\n<Step title="One">\n\nStep body.\n\n</Step>\n</Steps>\n\nAfter.');
    expect(deriveDocDescription(steps)).toBe('After.');
  });

  it('skips a badge-only / image-only paragraph (no alt text)', () => {
    const tree = md(
      '[![npm](https://img.shields.io/npm/v/x.svg)](https://npm.im/x) ![logo](logo.png)\n\nA clean theme.'
    );
    expect(deriveDocDescription(tree)).toBe('A clean theme.');
  });

  it('flattens emphasis, strong, links and inline code', () => {
    const tree = md('Use *very* **bold** [links](https://x.y) and `code()` here.');
    expect(deriveDocDescription(tree)).toBe('Use very bold links and code() here.');
  });

  it('decodes entities, strips raw tags, and turns <br> into a space', () => {
    expect(deriveDocDescription(md('Tom &amp; Jerry <b>bold</b> line<br>next'))).toBe(
      'Tom & Jerry bold line next'
    );
  });

  it('reduces raw inline tags to their label', () => {
    const d = deriveDocDescription(
      md(
        'See {@link Foo}, {@link Foo|bar}, {@link Foo baz qux}, [label]{@link Foo} and {@tutorial t}.'
      )
    );
    expect(d).toBe('See Foo, bar, baz qux, label and t.');
    expect(d).not.toContain('{@');
  });

  it('clips long text to the cap on a word boundary with an ellipsis', () => {
    const long = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');
    const d = deriveDocDescription(md(long))!;
    expect(d.length).toBeLessThanOrEqual(DOC_DESCRIPTION_MAX);
    expect(d.endsWith('…')).toBe(true);
    // The kept text ends on a whole word from the source.
    const kept = d.slice(0, -1);
    expect(long.startsWith(kept)).toBe(true);
    expect(long[kept.length]).toBe(' ');
  });

  it('clips text with no spaces to the cap', () => {
    const d = deriveDocDescription(md('x'.repeat(1000)))!;
    expect(d.length).toBe(DOC_DESCRIPTION_MAX);
    expect(d.endsWith('…')).toBe(true);
  });

  it('hard-cuts instead of using a space too early in the text', () => {
    const cjk = `clean-jsdoc-theme 是${'一个很长的句子'.repeat(60)}`;
    const d = deriveDocDescription(md(cjk))!;
    expect(d.length).toBe(DOC_DESCRIPTION_MAX);
    expect(d.startsWith('clean-jsdoc-theme 是一个')).toBe(true);
    const token = deriveDocDescription(md(`See ${'y'.repeat(400)}`))!;
    expect(token.length).toBe(DOC_DESCRIPTION_MAX);
    expect(token.startsWith('See yyy')).toBe(true);
  });

  it('cuts after CJK punctuation when it is far enough in', () => {
    const text = `${'这是一段说明'.repeat(40)}，${'更多内容'.repeat(40)}`;
    const d = deriveDocDescription(md(text))!;
    expect(d).toBe(`${'这是一段说明'.repeat(40)}…`);
  });

  it('trims trailing , : ; and an unclosed ( before the ellipsis', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const comma = deriveDocDescription(md(`${words}, ${'z'.repeat(400)}`))!;
    expect(comma).toBe(`${words}…`);
    const paren = deriveDocDescription(md(`${words} (see ${'z '.repeat(200)}`))!;
    expect(paren).toBe(`${words}…`);
  });

  it('reduces inline tags split by autolinks or inline markup', () => {
    expect(
      deriveDocDescription(
        md('See {@link https://example.com/a|Example} and {@link https://example.com}.')
      )
    ).toBe('See Example and https://example.com.');
    expect(deriveDocDescription(md('Use {@link *Foo*} or {@link Foo `x`}.'))).toBe('Use Foo or x.');
  });

  it('drops footnote reference markers', () => {
    expect(deriveDocDescription(md('A note[^1] here.\n\n[^1]: The note.'))).toBe('A note here.');
  });

  it('skips a paragraph made only of links', () => {
    const tree = md('[Docs](/d) | [API](/a) | [GitHub](https://g.h)\n\nThe intro.');
    expect(deriveDocDescription(tree)).toBe('The intro.');
    // A sentence with links in it is kept.
    expect(deriveDocDescription(md('Read [the docs](/d) or [the API](/a).'))).toBe(
      'Read the docs or the API.'
    );
  });

  it('returns undefined when there is no prose paragraph', () => {
    expect(deriveDocDescription(md('# Only a heading\n\n```js\nx();\n```'))).toBeUndefined();
    expect(deriveDocDescription({ type: 'root', children: [] })).toBeUndefined();
  });

  it('works on HTML input', () => {
    const tree = html('<h1>Advanced</h1><p>Deep dive with a <a href="https://x.y">link</a>.</p>');
    expect(deriveDocDescription(tree)).toBe('Deep dive with a link.');
  });

  it('stays fast on pathological inline-tag input', () => {
    const evil = '[{@link '.repeat(20000) + ']'.repeat(20000);
    const start = Date.now();
    deriveDocDescription({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: evil }] }],
    });
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
