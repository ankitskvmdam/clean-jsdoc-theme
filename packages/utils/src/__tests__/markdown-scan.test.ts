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
});
