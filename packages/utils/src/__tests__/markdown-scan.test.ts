import { describe, it, expect } from 'vitest';
import { fencedCodeRanges, htmlCommentRanges } from '../site/markdown-scan';

/** Slice each range out of the source — easier to assert on. */
const slices = (src: string, ranges: { start: number; end: number }[]): string[] =>
  ranges.map((r) => src.slice(r.start, r.end));

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
});

describe('htmlCommentRanges', () => {
  const closed = (src: string): string[] =>
    slices(
      src,
      htmlCommentRanges(src).filter((c) => c.closed)
    );

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
    ['closers without openers', 'a --> '.repeat(MB / 6)],
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
    ['stray backticks of mixed lengths', '` a `` b ``` c '.repeat(MB / 15)],
    ['unterminated tag attributes', '<a b="x '.repeat(MB / 8)],
  ])('%s (1MB) scans in under a second', (_name, src) => {
    expect(time(src)).toBeLessThan(1000);
  });
});
