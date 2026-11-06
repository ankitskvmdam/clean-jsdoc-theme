import { describe, it, expect } from 'vitest';
import {
  fencedCodeRanges,
  htmlCommentRanges,
  htmlCommentRangesInHtml,
  maskHtmlComments,
  replaceHtmlComments,
} from '../site/markdown-scan';

/** Slice each range out of the source — easier to assert on. */
const slices = (src: string, ranges: { start: number; end: number }[]): string[] =>
  ranges.map((r) => src.slice(r.start, r.end));

/** The text of each closed comment {@link htmlCommentRanges} finds. */
const closed = (src: string): string[] =>
  slices(
    src,
    htmlCommentRanges(src).filter((c) => c.closed)
  );

describe('fencedCodeRanges', () => {
  it('finds backtick and tilde fences, opener line through closer line', () => {
    const src = 'a\n\n```js\nx\n```\n\nb\n\n~~~\ny\n~~~\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['```js\nx\n```', '~~~\ny\n~~~']);
  });

  it('closes a longer fence only on a run at least as long (setu emits ```` around ```)', () => {
    const src = '````md\n```html\n<!-- kept -->\n```\n````\nafter\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual([
      '````md\n```html\n<!-- kept -->\n```\n````',
    ]);
  });

  it('does not close a backtick fence on tildes, or on a closer with an info string', () => {
    const src = '```\n~~~\n```js\n```\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['```\n~~~\n```js\n```']);
  });

  it('runs an unclosed fence to the end of the input', () => {
    const src = 'a\n```js\nx\ny';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['```js\nx\ny']);
  });

  it('finds fences that are indented, in a list item, or in a blockquote', () => {
    const src = '  ```\na\n  ```\n- ```\nb\n  ```\n> ```\n> c\n> ```\n';
    expect(fencedCodeRanges(src)).toHaveLength(3);
  });

  it('reads ```x``` on one line as inline code, not a fence', () => {
    expect(fencedCodeRanges('Use ```x``` here.\n```x```\n')).toEqual([]);
  });

  it('ignores mid-line backtick runs and a CRLF line ending on the closer', () => {
    const src = 'a ``` b\n```\r\nx\r\n```\r\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['```\r\nx\r\n```\r']);
  });

  // Fence closers per CommonMark (checked against micromark): indented at most
  // three columns past the content column, at the opener's quote depth.
  it('does not close on a closer indented four or more columns (CommonMark: content)', () => {
    const src = '```js\n      ```\n<!-- c -->\n```\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['```js\n      ```\n<!-- c -->\n```']);
    expect(closed(src)).toEqual([]);
  });

  it('closes on a closer indented up to three columns', () => {
    const src = '```js\n   ```\nx\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['```js\n   ```']);
  });

  it('treats a fence line at a deeper quote depth as content', () => {
    const src = '> ```\n> > ```\n> <!-- c -->\n> ```\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['> ```\n> > ```\n> <!-- c -->\n> ```']);
  });

  it('closes a list-item fence on a closer up to three columns past the item content', () => {
    const src = '- ```js\n  x\n     ```\n<!-- c -->\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['- ```js\n  x\n     ```']);
  });

  it('reads a list-item closer four columns past the item content as content', () => {
    const src = '- ```js\n  x\n      ```\n<!-- c -->\n```\n';
    // The item ends at the unindented comment line (an HTML block); the last
    // ``` opens a new fence.
    expect(slices(src, fencedCodeRanges(src))).toEqual(['- ```js\n  x\n      ```', '```\n']);
  });

  it('ends a list-item fence on a less-indented line, which may open a new fence', () => {
    const src = '- ```js\n  x\n```\n<!-- c -->\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['- ```js\n  x', '```\n<!-- c -->\n']);
  });

  it('keeps a blank line inside a list-item fence', () => {
    const src = '- ```js\n\n  x\n  ```\n<!-- c -->\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['- ```js\n\n  x\n  ```']);
  });

  it('closes an indented top-level opener on an unindented closer', () => {
    const src = '  ```js\nx\n```\n<!-- c -->\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['  ```js\nx\n```']);
  });
});

describe('htmlCommentRanges', () => {
  it('finds inline and block comments', () => {
    expect(closed('<!-- a -->\n\nText <!-- b --> more.\n')).toEqual(['<!-- a -->', '<!-- b -->']);
  });

  it('runs a line-starting comment across blank lines and fences (commented-out section)', () => {
    const src = '<!--\n## Old\n\n```js\nx\n```\n-->\nafter\n';
    expect(closed(src)).toEqual(['<!--\n## Old\n\n```js\nx\n```\n-->']);
  });

  it('treats a comment after quote or list markers as line-starting', () => {
    expect(closed('> <!--\n>\n> -->\n- <!-- a\n\n  b -->\n')).toHaveLength(2);
  });

  it('does not let an inline comment cross a blank line or a fence', () => {
    const src = 'a <!-- b\n\n```html\n<!-- x -->\n```\n\nafter -->\n';
    const ranges = htmlCommentRanges(src);
    expect(ranges.map((r) => r.closed)).toEqual([false]);
    expect(src.slice(ranges[0].start, ranges[0].end)).toBe('<!--');
  });

  it('skips comments inside fenced code, keeping fence parity across an odd ``` count', () => {
    const src = '`````md\n```js\n`````\n\nText <!-- c --> after.\n\n```js\n<!-- y -->\n```\n';
    expect(closed(src)).toEqual(['<!-- c -->']);
  });

  it('skips comments inside inline code, tags and link destinations/titles', () => {
    const src = [
      'Write `<!-- x -->`.',
      '<Signature code="<!-- y -->" />',
      '[a](http://x/<!--y-->z) ![b](x.png "t <!-- c --> d")',
      '',
    ].join('\n');
    expect(htmlCommentRanges(src)).toEqual([]);
  });

  it('skips a backslash-escaped opener', () => {
    expect(htmlCommentRanges('Type \\<!-- here -->.')).toEqual([]);
  });

  it('accepts the empty forms <!--> and <!--->', () => {
    expect(closed('a<!-->b<!--->c<!---->d')).toEqual(['<!-->', '<!--->', '<!---->']);
  });

  it('reports an opener with no closer as unclosed, covering just the opener', () => {
    const src = 'x <!-- oops';
    expect(htmlCommentRanges(src)).toEqual([{ start: 2, end: 6, closed: false }]);
  });

  it('does not open a fence on a lone fence line inside a comment block', () => {
    const src = '<!--\n```js\n-->\n\nText <!-- c --> after.\n';
    expect(fencedCodeRanges(src)).toEqual([]);
    expect(closed(src)).toEqual(['<!--\n```js\n-->', '<!-- c -->']);
  });

  it('scans the rest of the line after a comment block closes', () => {
    expect(closed('<!-- a\nb --> mid <!-- c -->\n')).toEqual(['<!-- a\nb -->', '<!-- c -->']);
  });

  it('does not let an escaped \\] start a protected link tail', () => {
    expect(closed('\\[a\\](http://x/<!--y-->z) more')).toEqual(['<!--y-->']);
  });

  it.each([
    ['an ATX heading', 'text <!-- a\n# Heading\n-->\n'],
    ['a thematic break', 'text <!-- a\n***\n-->\n'],
    ['a list item', 'text <!-- a\n- item\n-->\n'],
    ['a blockquote', 'text <!-- a\n> quote\n-->\n'],
    ['a blank quote line', '> text <!-- a\n>\n> -->\n'],
  ])('stops an inline comment at %s (it ends the paragraph)', (_name, src) => {
    expect(htmlCommentRanges(src).map((c) => c.closed)).toEqual([false]);
  });

  it('closes a fence opened in a blockquote when the quote ends', () => {
    const src = '> ```\n> code\n\nText <!-- c --> after.\n\n```js\nx\n```\n';
    expect(slices(src, fencedCodeRanges(src))).toEqual(['> ```\n> code', '```js\nx\n```']);
    expect(closed(src)).toEqual(['<!-- c -->']);
  });

  // Whether a mid-paragraph comment may run onto the next line is CommonMark's
  // paragraph-interruption rule (checked against micromark): `true` = the
  // comment closes on the later line, `false` = the line ends the paragraph
  // first, so the opener is literal text.
  it.each([
    ['an ordered item not starting at 1', 'text <!-- a\n2. b -->\n', true],
    ['an ordered item starting at 1', 'text <!-- a\n1. b -->\n', false],
    ['a bullet item', 'text <!-- a\n- b -->\n', false],
    ['an empty bullet (setext underline)', 'text <!-- a\n-\n-->\n', false],
    ['a 4-space indented list marker', 'text <!-- a\n    - b -->\n', true],
    ['a 4-space indented fence line', 'text <!-- a\n    ```\n-->\n', true],
    ['a setext = underline', 'text <!-- a\n===\nb -->\n', false],
    ['an HTML block start (kind 6)', 'text <!-- a\n<div>\n-->\n', false],
    ['an inline tag (kind 7 cannot interrupt)', 'text <!-- a\n<span>\n-->\n', true],
    ['the line after an ATX heading', '# Head <!-- a\nb -->\n', false],
    ['list-item continuation text', '- item <!-- a\n  more -->\n', true],
    ['a lazy quote continuation', '> a <!-- x\nlazy -->\n', true],
    ['a nested list item in its item', '- a <!-- x\n  - b -->\n', false],
  ])('a line with %s', (_name, src, isComment) => {
    expect(htmlCommentRanges(src).map((c) => c.closed)).toEqual([isComment]);
  });

  it('does not open a fence on a 4-space indented line inside a paragraph', () => {
    expect(fencedCodeRanges('text\n    ```\nmore\n')).toEqual([]);
  });

  it('lets an inline comment in a quote continue on the next > line', () => {
    expect(closed('> text <!-- a\n> b -->\n')).toEqual(['<!-- a\n> b -->']);
  });

  // Inline syntax never spans blocks (checked against micromark): a line that
  // ends the paragraph also ends an unclosed span, tag or link before it.
  it.each([
    ['a blockquote', 'a `x\n> b <!-- c --> d` e\n'],
    ['an ATX heading', 'a `x\n# b <!-- c --> d` e\n'],
    ['a list item', 'a `x\n- b <!-- c --> d` e\n'],
  ])('does not let a code span cross a line starting %s (it ends the paragraph)', (_n, src) => {
    expect(closed(src)).toEqual(['<!-- c -->']);
  });

  it('lets a code span continue on a plain continuation line', () => {
    expect(htmlCommentRanges('a `x\nb <!-- c --> d` e\n')).toEqual([]);
  });

  it('does not let a tag attribute or a link title cross a line that ends the paragraph', () => {
    expect(closed('<Sig code="a\n> b" /> <!-- c -->\n')).toEqual(['<!-- c -->']);
    expect(closed('[a](u "t\n# h") <!-- c -->\n')).toEqual(['<!-- c -->']);
  });

  it('lets a tag attribute span tab-indented continuation lines (setu signatures)', () => {
    expect(htmlCommentRanges('<MemberHeading sig="fn(\n\ta: <!-- T\n): U" /> -->\n')).toEqual([]);
  });

  it('protects a single-quoted attribute value', () => {
    expect(htmlCommentRanges("<img src='x.png' alt='<!-- not a comment -->' />\n")).toEqual([]);
    expect(htmlCommentRanges("<img src='x.png' alt='<!-- oops' />\n")).toEqual([]);
  });

  it('reads an opener after an even run of backslashes as a comment (odd = escaped)', () => {
    expect(closed('a \\\\<!-- c --> b\n')).toEqual(['<!-- c -->']);
    expect(htmlCommentRanges('a \\<!-- c --> b\n')).toEqual([]);
    expect(htmlCommentRanges('a \\\\\\<!-- c --> b\n')).toEqual([]);
  });

  it('closes a code span on a backtick after a backslash (no escapes inside spans)', () => {
    expect(closed('`a\\` <!-- c --> `\n')).toEqual(['<!-- c -->']);
  });

  it('opens a code span on a backtick after an escaped backslash', () => {
    expect(htmlCommentRanges('x \\\\`a <!-- c --> `\n')).toEqual([]);
  });

  it('opens no code span on an escaped backtick', () => {
    expect(closed('x \\`a` <!-- c -->\n')).toEqual(['<!-- c -->']);
  });

  it('returns nothing, cheaply, for a body without an opener', () => {
    expect(htmlCommentRanges('```\n`\n')).toEqual([]);
  });
});

describe('HTML-format comments and the replace/mask helpers', () => {
  it('htmlCommentRangesInHtml finds every literal comment, code included', () => {
    const src = 'a <!-- x --> <code>&lt;!-- y --&gt;</code> `<!-- z -->` <!--> <!---> <!---->';
    expect(slices(src, htmlCommentRangesInHtml(src))).toEqual([
      '<!-- x -->',
      '<!-- z -->',
      '<!-->',
      '<!--->',
      '<!---->',
    ]);
  });

  it('htmlCommentRangesInHtml ends a comment at the first --> (a nested opener is text)', () => {
    const src = '<!-- a <!-- b --> c';
    expect(slices(src, htmlCommentRangesInHtml(src))).toEqual(['<!-- a <!-- b -->']);
  });

  it('htmlCommentRangesInHtml reports every unclosed opener and keeps going', () => {
    expect(htmlCommentRangesInHtml('<!-- a --> b <!-- c <!-- d')).toEqual([
      { start: 0, end: 10, closed: true },
      { start: 13, end: 17, closed: false },
      { start: 20, end: 24, closed: false },
    ]);
  });

  it('replaceHtmlComments hands each range and its text to the replacer', () => {
    const src = 'a <!-- x --> b <!-- y';
    const seen: string[] = [];
    const out = replaceHtmlComments(src, htmlCommentRangesInHtml(src), (c, t) => {
      seen.push(`${c.closed}:${t}`);
      return c.closed ? '_' : '?';
    });
    expect(out).toBe('a _ b ? y');
    expect(seen).toEqual(['true:<!-- x -->', 'false:<!--']);
  });

  it('replaceHtmlComments returns the same string when there is nothing to replace', () => {
    const src = 'plain';
    expect(replaceHtmlComments(src, [], () => '')).toBe(src);
  });

  it('maskHtmlComments keeps length, line breaks and unclosed openers', () => {
    const src = 'a <!-- x\ny --> b <!-- z';
    const masked = maskHtmlComments(src, htmlCommentRanges(src));
    expect(masked).toBe('a       \n      b <!-- z');
    expect(masked.length).toBe(src.length);
    expect(maskHtmlComments(src, htmlCommentRanges(src), '#')).toBe('a ######\n##### b <!-- z');
  });
});

// Every page body goes through these scanners several times per build, so a
// pathological one must not stall it. Bounds are generous (the inputs take a few
// tens of ms); the quadratic versions took seconds to minutes.
describe('markdown-scan performance', () => {
  const MB = 1_000_000;
  const time = (src: string): number => {
    const t = performance.now();
    htmlCommentRanges(src);
    return performance.now() - t;
  };

  it.each([
    ['unclosed inline openers on one line', 'a <!-- '.repeat(MB / 7)],
    ['unclosed inline openers on many lines', 'a <!-- b\n'.repeat(MB / 9)],
    ['unclosed line-start openers', '<!-- x\n'.repeat(MB / 7)],
    // A body without `<!--` short-circuits; the trailing opener keeps the
    // tokenizer running over these.
    ['closers without openers', 'a --> '.repeat(MB / 6) + '<!--'],
    ['closed inline comments across lines', 'a <!-- b\nc --> d\n'.repeat(MB / 17)],
    [
      'fences with spans and comments',
      '```js\nx\n```\n\nSee `a` <!-- c --> [l](u).\n\n'.repeat(MB / 45),
    ],
    ['one opener then a long paragraph', 'a <!-- ' + 'word '.repeat(MB / 5)],
    [
      'paragraph-crossing openers with one closer at the end',
      'a <!-- b\n\n'.repeat(MB / 10) + '-->',
    ],
    ['stray backticks of mixed lengths', '` a `` b ``` c '.repeat(MB / 15) + '<!--'],
    ['unterminated tag attributes', '<a b="x '.repeat(MB / 8) + '<!--'],
  ])('%s (1MB) scans in under a second', (_name, src) => {
    expect(time(src)).toBeLessThan(1000);
  });
});
