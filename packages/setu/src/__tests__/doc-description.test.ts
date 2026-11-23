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
