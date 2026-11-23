import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  fencedCodeRanges,
  htmlCommentRanges,
  htmlCommentRangesInHtml,
  inlineCodeSpans,
  maskHtmlComments,
  mdxCodeRanges,
  replaceHtmlComments,
} from '../site/markdown-scan';
import { expectLinearScaling, PERF_TEST_TIMEOUT } from './linear-scaling';

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

  // dwar drops the comment, and MDX reads the text after it as a paragraph
  // line, so the paragraph rules apply to the lines below.
  it('reads the text after a line-starting comment as a paragraph line', () => {
    const states = (src: string): boolean[] => htmlCommentRanges(src).map((c) => c.closed);
    // A delimiter row below makes the text a table's header row; an inline
    // comment can't span two body rows.
    expect(states('<!-- note --> Name | Version\n--- | ---\n| x <!--\n--> |\n')).toEqual([
      true,
      false,
    ]);
    // A deeper blockquote ends the paragraph…
    expect(states('<!-- a --> text <!-- b\n> c --> d\n')).toEqual([true, false]);
    // …and a code span with it, so the comment after it is not in a span.
    expect(closed('<!-- a -->x`l\n>> b <!-- c -->\nm`\n')).toEqual(['<!-- a -->', '<!-- c -->']);
    // In a list item, after a `-->` on a later line, and after an opener
    // left unclosed (literal text).
    expect(states('- <!-- a --> text <!-- b\n  > c --> d\n')).toEqual([true, false]);
    expect(states('<!-- a\nb --> h | i\n-|-\n| x <!--\n--> |\n')).toEqual([true, false]);
    expect(
      slices('<!-- x`l\n>> b <!-- c\nm`\n', htmlCommentRanges('<!-- x`l\n>> b <!-- c\nm`\n'))
    ).toEqual(['<!--', '<!--']);
    // A comment alone on its line still opens nothing: the text below starts
    // a paragraph of its own, which a later line may continue.
    expect(closed('<!-- a -->\ntext <!-- b\nc -->\n')).toEqual(['<!-- a -->', '<!-- b\nc -->']);
  });

  // MDX reads `{/**/} text` and `\<!-- text` (what dwar leaves) as text, which
  // continues the paragraph above; and it rejects a raw `<!` starting a line
  // even inside a code span, so such a comment is always reported.
  it('reads a line-starting comment with text after it as a continuation line', () => {
    // The paragraph goes on, so an inline comment above may close below…
    expect(closed('a <!-- x\n<!-- y --> b -->\n')).toEqual(['<!-- x\n<!-- y -->']);
    // …a code span may run across it (a backtick inside it does not count)…
    expect(closed('`l\n<!-- ` --> m` <!-- c -->\n')).toEqual(['<!-- ` -->', '<!-- c -->']);
    // …and it is reported even inside that span, closed or not.
    expect(closed('`l\n<!-->`<!--`g\n')).toEqual(['<!-->']);
    expect(slices('m`\n<!--\n`<!--`\n', htmlCommentRanges('m`\n<!--\n`<!--`\n'))).toEqual([
      '<!--',
      '<!--',
    ]);
    // In a table it is a row.
    expect(htmlCommentRanges('| h |\n|---|\n<!-- x --> a <!--\n| b --> |\n')[1].closed).toBe(false);
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
    ['a setext underline in its list item', '- a <!--\n  --\nc -->\n', false],
    ['a setext underline in its blockquote', '> a <!--\n> --\nc -->\n', false],
    ['a lazy -- after a list item (no setext)', '- a <!--\nb\n--\nc -->\n', true],
    ['a lazy -- after a blockquote (no setext)', '> a <!--\n--\nc -->\n', true],
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
    // The comment INSIDE the would-be attribute/title, on the line that ends
    // the paragraph, is a comment (micromark: blockquote/heading holding html).
    expect(closed('<Sig code="a\n> b <!-- c --> d" />\n')).toEqual(['<!-- c -->']);
    expect(closed('[a](u "t\n# h <!-- c --> x")\n')).toEqual(['<!-- c -->']);
  });

  it('lets a tag attribute span tab-indented continuation lines (setu signatures)', () => {
    expect(htmlCommentRanges('<MemberHeading sig="fn(\n\ta: <!-- T\n): U" /> -->\n')).toEqual([]);
  });

  it('protects a single-quoted attribute value', () => {
    expect(htmlCommentRanges("<img src='x.png' alt='<!-- not a comment -->' />\n")).toEqual([]);
    expect(htmlCommentRanges("<img src='x.png' alt='<!-- oops' />\n")).toEqual([]);
  });

  it('protects attribute values of dashed, namespaced and member tag names', () => {
    expect(
      htmlCommentRanges('<my-element title="<!-- not a comment -->">x</my-element>\n')
    ).toEqual([]);
    expect(htmlCommentRanges('a <svg:use xlink:href="#<!-- x -->" /> b\n')).toEqual([]);
    expect(htmlCommentRanges('a <Tabs.Item label="<!-- x -->" /> b\n')).toEqual([]);
    expect(closed('a <my-element /> <!-- c --> b\n')).toEqual(['<!-- c -->']);
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

  it('opens a code span on the rest of a run after an escaped backtick', () => {
    // micromark: the escaped backtick is text; the one after it opens a span.
    expect(htmlCommentRanges('x \\``a <!-- c --> `\n')).toEqual([]);
  });

  it('reads a backtick run with no equal-length closer as literal, never a shorter run', () => {
    // micromark: the `` has no closer, so all of it is text; it is not retried
    // as a single backtick that the lone one after it would close.
    expect(closed('`` <!-- c --> ` x `\n')).toEqual(['<!-- c -->']);
    expect(htmlCommentRanges('`` a ` <!-- c --> `\n')).toEqual([]);
    expect(closed('a ``` b `` <!-- c --> d ``` e <!-- f -->\n')).toEqual(['<!-- f -->']);
  });

  it('does not let a code span cross a blank line or a line that ends the paragraph', () => {
    expect(closed('x `a\n\ny <!-- c --> `\n')).toEqual(['<!-- c -->']);
    expect(closed('x `a\n# h <!-- c --> `\n')).toEqual(['<!-- c -->']);
    expect(closed('x `a\n> q <!-- c --> `\n')).toEqual(['<!-- c -->']);
  });

  it('does not let an inline comment span two rows of a GFM table', () => {
    // GFM: each row is its own block, so the opener is literal text.
    const unclosed = (src: string): boolean =>
      htmlCommentRanges(src).every((c) => !c.closed) && htmlCommentRanges(src).length > 0;
    expect(unclosed('| h |\n|---|\n| a <!--\nb\n--> c |\n')).toBe(true);
    expect(unclosed('a | b\n--- | :-:\nc <!-- x\n--> d | e\n')).toBe(true);
    // The header row, and the delimiter row below it, are rows too.
    expect(unclosed('a | b <!--\n-|-\n--> c\n')).toBe(true);
    // The header row interrupts the paragraph above it.
    expect(unclosed('p <!--\na|b\n-|-\n-->\n')).toBe(true);
    // In a blockquote and in a list item.
    expect(unclosed('> a|b\n> -|-\n> x <!--\n> -->\n')).toBe(true);
    expect(unclosed('- a|b\n  -|-\n  x <!--\n  -->\n')).toBe(true);
    // A comment within one cell is still a comment.
    expect(closed('| h |\n|---|\n| a <!-- x --> c |\n')).toEqual(['<!-- x -->']);
  });

  it('ends a GFM table where MDX does', () => {
    // A blank line, a list item, a lazy line in a list item or quote: the
    // paragraph after it may hold a multi-line comment again.
    expect(closed('a|b\n-|-\nx\n\np <!--\n-->\n')).toEqual(['<!--\n-->']);
    expect(closed('a|b\n-|-\nx\n- p <!--\n  -->\n')).toEqual(['<!--\n  -->']);
    expect(closed('- a|b\n  -|-\n  x\np <!--\n-->\n')).toEqual(['<!--\n-->']);
    expect(closed('> a|b\n> -|-\n> x\np <!--\n-->\n')).toEqual(['<!--\n-->']);
    // MDX has no indented code: a row indented four or more columns (past a
    // list item's content, too) is still a row, where GFM would end the table.
    expect(htmlCommentRanges('| h |\n|---|\n    | a <!--\n| b --> |\n')[0].closed).toBe(false);
    expect(htmlCommentRanges('- | h |\n  |---|\n       | a <!--\n  | b --> |\n')[0].closed).toBe(
      false
    );
  });

  it('reads no table without a matching delimiter row', () => {
    // Cell counts differ, a setext underline, a list item: no table, so the
    // comment spans the lines as in any paragraph.
    expect(closed('| a | b | <!--\n|---|\n-->\n')).toEqual(['<!--\n|---|\n-->']);
    expect(closed('a <!-- x\n---\n')).toEqual([]);
    expect(closed('a|b <!--\nc -->\n')).toEqual(['<!--\nc -->']);
    expect(htmlCommentRanges('a|b <!--\n- | -\n-->\n')[0].closed).toBe(false);
  });

  it("counts a table header's cells as MDX reads the line (#380)", () => {
    // dwar drops a comment that opens and closes on the header row, pipes
    // and all, so MDX may see a table the raw cell count misses: each row is
    // then its own block, and a body-row comment may not span two rows.
    const states = (src: string): boolean[] => htmlCommentRanges(src).map((c) => c.closed);
    expect(states('<!-- a | b --> h | i\n-|-\n| x <!--\n--> |\n')).toEqual([true, false]);
    expect(states('h <!-- a | b --> | i\n-|-\n| x <!--\n--> |\n')).toEqual([true, false]);
    expect(states('- <!-- a | b --> h | i\n  -|-\n  | x <!--\n  --> |\n')).toEqual([true, false]);
    expect(states('> h <!-- a | b --> | i\n> -|-\n> | x <!--\n> --> |\n')).toEqual([true, false]);
    // A comment closing on the header row after opening on the line above.
    expect(states('<!-- a\nb | c --> h <!-- x | y --> | i\n-|-\n| x <!--\n--> |\n')).toEqual([
      true,
      true,
      false,
    ]);
    // Several comments, and the empty ones, on the header row.
    expect(states('h <!-- a | b --> <!-- c | d --> | i\n-|-\n| x <!--\n--> |\n')).toEqual([
      true,
      true,
      false,
    ]);
    expect(states('h <!-->|<!---> | i\n-|-|-\n| x <!--\n--> |\n')).toEqual([true, true, false]);
    // An escaped pipe in the comment is dropped with it; one outside still escapes.
    expect(states('h <!-- a \\| b --> \\| i | j\n-|-\n| x <!--\n--> |\n')).toEqual([true, false]);
    // No comment on the header row: in a code span, behind `\<!--`, or one
    // that runs past the row. Its pipes count, so there is no table.
    expect(closed('h `<!-- a | b -->` | i\n-|-\n| x <!--\n--> |\n')).toEqual(['<!--\n-->']);
    expect(closed('h \\<!-- a | b --> | i\n-|-\n| x <!--\n--> |\n')).toEqual(['<!--\n-->']);
    expect(closed('h | i <!-- a | b\n-|-\n--> c\n')).toEqual(['<!-- a | b\n-|-\n-->']);
    // The raw count still makes a table on its own.
    expect(states('<!-- a | b --> h\n-|-\nx <!--\n--> y\n')).toEqual([true, false]);
  });

  it('keeps the raw header count when the header line holds an unclosed comment (#380)', () => {
    // The opener closes on a later line, swallowing the delimiter row: MDX sees
    // no table, so the comment must stay closed or its text reaches MDX.
    expect(htmlCommentRanges('<!-- a | b --> h | i <!-- old\n-|-\n<br> -->\n')).toEqual([
      { start: 0, end: 14, closed: true },
      { start: 21, end: 42, closed: true },
    ]);
    expect(
      htmlCommentRanges('h <!-- a | b --> | i <!-- TODO: <details>\n-|-\n| x | y |\n-->\n')
    ).toEqual([
      { start: 2, end: 16, closed: true },
      { start: 21, end: 59, closed: true },
    ]);
  });

  it('reads a fence opener or list item holding a bare CR or a line separator', () => {
    // micromark: the fence opens (its info string or first line takes the
    // rest), and the item interrupts the paragraph so the comment stays open.
    for (const odd of ['\r', String.fromCharCode(0x2028)]) {
      expect(htmlCommentRanges('```js' + odd + 'x\n<!-- c -->\n```\n')).toEqual([]);
      expect(htmlCommentRanges('p <!--\n- a' + odd + 'b -->\n')).toEqual([
        { start: 2, end: 6, closed: false },
      ]);
    }
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

  it('htmlCommentRangesInHtml skips a <!-- inside a tag (a quoted value may hold > too)', () => {
    const cases: [string, string[]][] = [
      ['<p><a title="<!--" href="u">L</a> Promise<User> <!-- c --> end</p>', ['<!-- c -->']],
      ["<a title='<!--'>L</a> x --> y", []],
      ['<a title="x > <!-- y">L</a> <!-- z --> w', ['<!-- z -->']],
      ["<a title='x > <!-- y'>L</a> <!-- z --> w", ['<!-- z -->']],
      ['<a b = "x>y" c=\'<!--\'>t</a> <!-- z -->', ['<!-- z -->']],
      ['<a\nb="<!--"\n>x <!-- y --> z', ['<!-- y -->']],
      ['<A TITLE="<!--">x</A> <!-- y -->', ['<!-- y -->']],
      ['<a title="<!--" data="-->">x<!-- y --> z', ['<!-- y -->']],
      ['</p title="<!--"> <!-- y -->', ['<!-- y -->']],
      // Attribute names and unquoted values take `<!--`, `<` and `"` as plain
      // characters; an unquoted value ends at the `>`.
      ['<a title=<!-->L</a> x --> y', []],
      ['<a b=c<!-- d --> e', []],
      ['<a b="x" <!-- c --> d', []],
      ['<a <!-- y --> <!-- z -->', ['<!-- z -->']],
      ['<a b=x"y>z" <!-- w --> v', ['<!-- w -->']],
      // A `<` that opens no tag is text.
      ['<3 <!-- x --> y', ['<!-- x -->']],
      ['a < b <!-- x --> y', ['<!-- x -->']],
      ['<br/><!-- x -->', ['<!-- x -->']],
    ];
    for (const [src, want] of cases) {
      expect(slices(src, htmlCommentRangesInHtml(src)), src).toEqual(want);
    }
  });

  it('htmlCommentRangesInHtml reports nothing after a tag left open at the end of the input', () => {
    for (const src of [
      '<a title="<!-- x --> y',
      '<a b= "x>y <!-- z -->',
      '<a title="x" <!-- unterminated',
      '<a <!-- y',
      '<a b=',
    ]) {
      expect(htmlCommentRangesInHtml(src), src).toEqual([]);
    }
    // Everything before it is still scanned.
    const src = '<!-- a --> <a b="<!-- c -->';
    expect(slices(src, htmlCommentRangesInHtml(src))).toEqual(['<!-- a -->']);
  });

  // A regex over the tag body overflowed the regex engine's backtrack stack on
  // a tag of several million characters (#382).
  it.each<[string, () => string]>([
    ['unclosed quoted values', () => '<a b="x '.repeat(2_000_000) + '<!--'],
    ['= signs', () => '<a ' + '= '.repeat(4_000_000) + '<!--'],
    ['one long attribute name', () => '<a ' + 'x'.repeat(16_000_000) + '<!--'],
  ])(
    'htmlCommentRangesInHtml reads a multi-megabyte tag of %s to the end of the input (#382)',
    (_name, makeSource) => {
      expect(htmlCommentRangesInHtml(makeSource())).toEqual([]);
    },
    PERF_TEST_TIMEOUT
  );

  it(
    'htmlCommentRangesInHtml finds the comment after a closed multi-megabyte tag (#382)',
    () => {
      const src = '<a ' + 'b="x>" '.repeat(2_000_000) + '>' + '<!-- c -->';
      expect(htmlCommentRangesInHtml(src)).toEqual([
        { start: src.length - 10, end: src.length, closed: true },
      ]);
    },
    PERF_TEST_TIMEOUT
  );

  it('htmlCommentRangesInHtml reads <?…>, <!DOCTYPE …>, <![CDATA[… and </ … as bogus comments to the next >', () => {
    for (const src of [
      '<p>a <?php <!-- ?> b --> c</p>',
      '<p>a <![CDATA[ <!-- ]]> b --> c</p>',
      '<p>a <!DOCTYPE <!-- > b --> c</p>',
      '</ <!-- x --> y',
      '<!x <!-- y -->',
      '<?x <!-- y',
    ]) {
      expect(htmlCommentRangesInHtml(src), src).toEqual([]);
    }
    const src = '<?x> <!-- y -->';
    expect(slices(src, htmlCommentRangesInHtml(src))).toEqual(['<!-- y -->']);
  });

  it('htmlCommentRangesInHtml does not model raw-text elements (a <!-- in <script> is a comment)', () => {
    // A documented simplification, shared with the Markdown scanner; see the
    // helper's doc comment.
    const src = '<script>a <!-- b --> c</script>';
    expect(slices(src, htmlCommentRangesInHtml(src))).toEqual(['<!-- b -->']);
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

describe('htmlCommentRangesInHtml tag bodies match the regex scan they replaced (#382)', () => {
  // The implementation before #382, kept as the oracle: the tag body was read
  // by the regex TAG_BODY, and closers were found with a plain indexOf (the
  // same answers as the cached finder). Valid on small inputs only — the regex
  // overflows the stack on a tag of several million characters.
  const REF_TAG_OPEN = /<\/?[A-Za-z]/y;
  const REF_TAG_BODY = /(?:[^>=]|=[ \t\n\f\r]*(?:"[^"]*"|'[^']*'|(?![ \t\n\f\r"'])))*/y;
  type Range = { start: number; end: number; closed: boolean };
  const referenceCommentRangesInHtml = (source: string): Range[] => {
    const out: Range[] = [];
    if (!source.includes('<!--')) return out;
    for (let from = 0; ; ) {
      const lt = source.indexOf('<', from);
      if (lt === -1) return out;
      if (source.startsWith('<!--', lt)) {
        const openEnd = lt + 4;
        const empty = /^-?>/.exec(source.slice(openEnd, openEnd + 2));
        if (empty) out.push({ start: lt, end: openEnd + empty[0].length, closed: true });
        else {
          const closer = source.indexOf('-->', openEnd);
          if (closer === -1) out.push({ start: lt, end: openEnd, closed: false });
          else out.push({ start: lt, end: closer + 3, closed: true });
        }
        from = out[out.length - 1].end;
        continue;
      }
      REF_TAG_OPEN.lastIndex = lt;
      if (REF_TAG_OPEN.test(source)) {
        REF_TAG_BODY.lastIndex = REF_TAG_OPEN.lastIndex;
        REF_TAG_BODY.test(source);
        const gt = REF_TAG_BODY.lastIndex;
        if (source[gt] !== '>') return out;
        from = gt + 1;
        continue;
      }
      const next = source[lt + 1];
      if (next === '!' || next === '?' || next === '/') {
        const gt = source.indexOf('>', lt + 2);
        if (gt === -1) return out;
        from = gt + 1;
        continue;
      }
      from = lt + 1;
    }
  };

  /** Number of sources whose ranges differ from the oracle's, and the first one. */
  const compare = (sources: Iterable<string>): { mismatches: number; first?: string } => {
    let mismatches = 0;
    let first: string | undefined;
    for (const src of sources) {
      const got = JSON.stringify(htmlCommentRangesInHtml(src));
      if (got !== JSON.stringify(referenceCommentRangesInHtml(src))) {
        mismatches++;
        first ??= src;
      }
    }
    return { mismatches, first };
  };
  const expectSame = (sources: Iterable<string>): void => {
    const { mismatches, first } = compare(sources);
    if (first !== undefined) {
      expect(htmlCommentRangesInHtml(first), JSON.stringify(first)).toEqual(
        referenceCommentRangesInHtml(first)
      );
    }
    expect(mismatches).toBe(0);
  };

  it.each<[string, string, string[]]>([
    ['an unquoted value', '<a b=c> <!-- x -->', ['<!-- x -->']],
    ['an = at the end of the input', '<!-- x --> <a b=', ['<!-- x -->']],
    ['an = and a space at the end of the input', '<!-- x --> <a b= ', ['<!-- x -->']],
    ['=> ending the tag', '<a b=> <!-- x -->', ['<!-- x -->']],
    ['== re-entering the = branch', '<a b=="y>"> <!-- x -->', ['<!-- x -->']],
    [
      '= then CRLF then a quoted value holding > and <!--',
      '<a b=\r\n"> <!-- y -->"> <!-- x -->',
      ['<!-- x -->'],
    ],
    ['a tab after =', '<a b=\t"> <!-- y -->"> <!-- x -->', ['<!-- x -->']],
    ['a form feed after =', '<a b=\f"> <!-- y -->"> <!-- x -->', ['<!-- x -->']],
    [
      'a vertical tab after = (not whitespace)',
      '<a b=\v"> <!-- y -->"> <!-- x -->',
      ['<!-- y -->', '<!-- x -->'],
    ],
    ['a quote not after =', '<a "x>y" <!-- c -->', ['<!-- c -->']],
    ['an unclosed " with a later >', '<a b="x> <!-- c -->', []],
    ["an unclosed ' with a later >", "<a b='x> <!-- c -->", []],
    ['mixed quotes', '<a b="\'>" c=\'">\'> <!-- x -->', ['<!-- x -->']],
    ['< and <a inside a body', '<a < <a b> <!-- x -->', ['<!-- x -->']],
    ['an end tag with a quoted value', '</p b=">"> <!-- x -->', ['<!-- x -->']],
    ["a second tag whose = lies beyond the first's >", '<a> <b c=">"> <!-- x -->', ['<!-- x -->']],
    ['a text = between tags', '<a> = <b c=">"> <!-- x -->', ['<!-- x -->']],
  ])('matches on %s', (_name, src, want) => {
    expect(htmlCommentRangesInHtml(src)).toEqual(referenceCommentRangesInHtml(src));
    expect(slices(src, htmlCommentRangesInHtml(src))).toEqual(want);
  });

  it('matches on every sequence of up to 5 pieces', () => {
    const pieces = ['<a', '>', '=', '"', "'", ' ', '\n', 'x', '<!--', '-->', '<!', '</'];
    const depth = 5;
    function* sequences(prefix: string, left: number): Generator<string> {
      yield prefix;
      yield prefix + '<!-- z -->';
      if (left === 0) return;
      for (const p of pieces) yield* sequences(prefix + p, left - 1);
    }
    expectSame(sequences('', depth));
  });

  it('matches on seeded random sequences', () => {
    const pieces = [
      '<a',
      '</a',
      '<',
      '>',
      '=',
      '"',
      "'",
      ' ',
      '\n',
      '\r\n',
      '\t',
      '\f',
      '/',
      'b',
      'x',
      '<!--',
      '-->',
      '<!',
      '<?',
      '</ ',
      '-',
      '<!-->',
      '<!--->',
      'b="',
      "c='",
      '= "',
      '<A-b',
    ];
    let seed = 382;
    const next = (k: number): number => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed % k;
    };
    function* randomSources(count: number): Generator<string> {
      for (let n = 0; n < count; n++) {
        let s = '';
        for (let len = 1 + next(24); len > 0; len--) s += pieces[next(pieces.length)];
        yield s;
      }
    }
    expectSame(randomSources(40_000));
  });

  it('the oracle is the regex scan (it tells the cases apart)', () => {
    // Sanity: the oracle is not trivially empty, and it reads a tag body the
    // way the old regex did.
    expect(referenceCommentRangesInHtml('<a b=">" <!-- y -->"> <!-- x -->')).toEqual([
      { start: 22, end: 32, closed: true },
    ]);
    expect(referenceCommentRangesInHtml('<a b="x> <!-- c -->')).toEqual([]);
  });
});

describe('inlineCodeSpans', () => {
  it.each<[string, string[]]>([
    ['a `x` b', ['`x`']],
    ['a `` x`y `` b and `` `tick` `` c', ['`` x`y ``', '`` `tick` ``']],
    ['``` a `` b', []],
    ['`` a ` b', []],
    ['x ` a `` b ` c', ['` a `` b `']],
    ['a \\`not\\` b `x` c', ['`x`']],
    ['a \\\\`code` b', ['`code`']],
    ['`a\\` b', ['`a\\`']],
    // The first run would close across the blank line, so it is literal; the
    // second opens a span that the third closes.
    ['`a\n\nb` `c`', ['` `']],
    ['`a\r\n\r\nb` `c`', ['` `']],
    ['`a\nb`', ['`a\nb`']],
    ['no ticks', []],
  ])('finds the code spans in %j', (src, want) => {
    expect(slices(src, inlineCodeSpans(src))).toEqual(want);
  });

  it('reports the delimiter length', () => {
    expect(inlineCodeSpans('a `` x`y `` b').map((s) => s.ticks)).toEqual([2]);
  });
});

// dwar's brace, ESM and backtick pre-passes read an MDX body's code with this
// scanner (#372): fences the way MDX reads them, then code spans and JSX tags.
describe('mdxCodeRanges', () => {
  /** Each code range as `[kind, text]`. */
  const code = (src: string): [string, string][] =>
    mdxCodeRanges(src).code.map((c) => [c.kind, src.slice(c.start, c.end)]);
  /** The text of each stray backtick run. */
  const strays = (src: string): string[] => slices(src, mdxCodeRanges(src).strayTicks);

  it.each<[string, string, [string, string][]]>([
    [
      'a ```` fence around ``` lines (#372)',
      '````md\n```js\n{a}\n```\n````\n\nafter `x`',
      [
        ['fence', '````md\n```js\n{a}\n```\n````'],
        ['span', '`x`'],
      ],
    ],
    [
      'an odd number of ``` lines inside a ```` fence',
      '````md\n```\none {a}\n````\n\n{b}',
      [['fence', '````md\n```\none {a}\n````']],
    ],
    [
      'a ~~~ fence around a ``` line',
      '~~~md\n```\n{a}\n~~~\n\n{b}',
      [['fence', '~~~md\n```\n{a}\n~~~']],
    ],
    ['a longer closer', '```\n{a}\n`````\n\n{b}', [['fence', '```\n{a}\n`````']]],
    ['an unclosed fence, to the end', '```js\n{a}\n', [['fence', '```js\n{a}\n']]],
    [
      'a closer indented eight columns (MDX closes on it)',
      '```\n{x}\n        ```\n\n{z}',
      [['fence', '```\n{x}\n        ```']],
    ],
    [
      'an opener indented four columns after a paragraph (MDX has no indented code)',
      'para\n    ```\n{x}\n    ```\n\n{z}',
      [['fence', '    ```\n{x}\n    ```']],
    ],
    ['an indented line without a fence (prose)', 'para\n\n    {x} `y`\n', [['span', '`y`']]],
    [
      'a fence on a list marker line',
      '- ```\n  {a}\n  ```\n\n{b}',
      [['fence', '- ```\n  {a}\n  ```']],
    ],
    [
      "a fence on a list item's continuation line, closed",
      '1. a\n   ```js\n   {x}\n   ```\n   more {y}',
      [['fence', '   ```js\n   {x}\n   ```']],
    ],
    [
      'a list-item fence ended by an outdented line',
      '- a\n\n  ```js\n  {l: 1}\nout {m}\n',
      [['fence', '  ```js\n  {l: 1}']],
    ],
    [
      'a list-item fence ended by a > line',
      '- ```\n  {a}\n> {x: 1} q\n',
      [['fence', '- ```\n  {a}']],
    ],
    [
      'a list-item fence holding an indented > line',
      '- ```\n  {a}\n  > {b}\n  ```\n\n{c}',
      [['fence', '- ```\n  {a}\n  > {b}\n  ```']],
    ],
    [
      'a fence in a nested list, ended by an outdented line',
      '- a\n  - b\n\n    ```\n    {x}\n  back {y}\n',
      [['fence', '    ```\n    {x}']],
    ],
    [
      'a fence after a lazy line, still in its item',
      '- a\nlazy\n  ```\n  {x}\nout {y}\n',
      [['fence', '  ```\n  {x}']],
    ],
    [
      "a quoted fence ended by the quote's end",
      '> ```js\n> {l: 1}\n\nout {m} `t`\n',
      [
        ['fence', '> ```js\n> {l: 1}'],
        ['span', '`t`'],
      ],
    ],
    ['```js `x` (inline, not a fence)', '```js `x` {a}\n', [['span', '`x`']]],
    [
      'a multi-line flow JSX tag holding a fence-like line',
      '<X a="p\n```\n{b}" />\n\ntail {c}\n',
      [['tag', '<X a="p\n```\n{b}" />']],
    ],
    [
      'tags and a span on one line',
      'a <b> c </b> <X a="{y}" /> `<Y>`',
      [
        ['tag', '<b>'],
        ['tag', '</b>'],
        ['tag', '<X a="{y}" />'],
        ['span', '`<Y>`'],
      ],
    ],
    ['a span across one line break', 'a `b\nc` d', [['span', '`b\nc`']]],
    ['an escaped backtick', 'a \\` b', []],
    ['an escaped backslash, then a span', 'a \\\\`x` b', [['span', '`x`']]],
    ['an escaped tag', '\\<Foo a="{x}">', []],
    ['an escaped backslash, then a tag', '\\\\<Foo a="{x}">', [['tag', '<Foo a="{x}">']]],
    ['a span closing after a backslash', '`a\\` {x}` tail', [['span', '`a\\`']]],
    [
      'CRLF line endings',
      '````md\r\n```js\r\n{a}\r\n````\r\n\r\nprose {b}\r\n',
      [['fence', '````md\r\n```js\r\n{a}\r\n````\r']],
    ],
    ['no code', 'no code at all {x}', []],
    // MDX has no HTML blocks: a tag line does not end the paragraph.
    [
      'a span across a line starting with a tag',
      'Wrap items in `<ul>\n<li>` tags, pass {x} or `y`.\n',
      [
        ['span', '`<ul>\n<li>`'],
        ['span', '`y`'],
      ],
    ],
    [
      'a span across a line starting with a block-level tag',
      'The `{children}\n<div>` wrapper.\n',
      [['span', '`{children}\n<div>`']],
    ],
    // Quote and list markers in any order before the fence run.
    [
      'a list marker, then a quoted fence',
      '- > ```js\n  > const a = {b};\n  > ```\n\nafter {c}\n',
      [['fence', '- > ```js\n  > const a = {b};\n  > ```']],
    ],
    [
      'an ordered marker, then a quoted fence',
      '1. > ```js\n   > const a = {b};\n   > ```\n\nafter {c}\n',
      [['fence', '1. > ```js\n   > const a = {b};\n   > ```']],
    ],
    [
      'two list markers, then a fence holding a blank line',
      '- - ```js\n    a = {b};\n\n    c = {d};\n    ```\n',
      [['fence', '- - ```js\n    a = {b};\n\n    c = {d};\n    ```']],
    ],
    [
      'a quoted fence indented four columns in a list item',
      '1.  Step\n\n    > ~~~js\n    > const a = {b};\n    > ~~~\n',
      [['fence', '    > ~~~js\n    > const a = {b};\n    > ~~~']],
    ],
    [
      'a marker-then-quote fence ended by a quote line outside the item',
      '- > ```js\n  > {a}\n> {b}\n',
      [['fence', '- > ```js\n  > {a}']],
    ],
    ['a > alone outside a list-item fence', '- ```\n>\n  {y}\n', [['fence', '- ```']]],
    // A tab after a list marker reaches the next tab stop.
    [
      'a fence in a tab-marker item, ended by the item',
      '-\tStep\n\n\t```js\n\tconst a = {b};\n\nNext {para}\n',
      [['fence', '\t```js\n\tconst a = {b};\n']],
    ],
    [
      'a fence in an ordered tab-marker item, ended by the next item',
      '1.\tStep\n\t```js\n\tconst a = {b};\n2.\tNext {c}\n',
      [['fence', '\t```js\n\tconst a = {b};']],
    ],
    [
      "a line holding only the comment pass's placeholder (ends the list)",
      '- item\n{/**/}\n  ```js\nconst a = {b};\n  ```\n',
      [['fence', '  ```js\nconst a = {b};\n  ```']],
    ],
    [
      'an empty item followed by a blank line (the item ends)',
      '-\n\n  ```\n```\n{x}\n',
      [['fence', '  ```\n```']],
    ],
    [
      'a quote inside a list item, then a fence in the item',
      '- a\n  > q\n\n  ```\n  {x}\n\nout {y}\n',
      [['fence', '  ```\n  {x}\n']],
    ],
    [
      'a multi-line JSX tag after a list marker',
      '- <X a="p\n  ```\n  q" />\n\n  text {u}\n',
      [['tag', '<X a="p\n  ```\n  q" />']],
    ],
    [
      'a list item indented four columns past a paragraph (MDX: an item)',
      '- a\n  text\n      - deep\n        ```\n        {x}\n      out {y}\n',
      [['fence', '        ```\n        {x}']],
    ],
    [
      'a fence in a nested item opened on one line, ended by that item',
      '- - a\n\n    ```\n    {x}\n   out {y}\n',
      [['fence', '    ```\n    {x}']],
    ],
    ['a span in a quote opened after a list marker', '* >`a\n  >{b}`\n', [['span', '`a\n  >{b}`']]],
    [
      'an empty item with trailing spaces (content one past the marker)',
      '-  \n  ```js\n  a = {b}\n\nafter {c}\n',
      [['fence', '  ```js\n  a = {b}\n']],
    ],
    ['a quoted empty item with trailing spaces', '>+  \n>   ```\n>{x}\n', [['fence', '>   ```']]],
    [
      'an inner item reached by a line its outer item is not',
      '- > - a\n>   ```js\n> const a = {b};\n>   ```\n',
      [['fence', '>   ```js\n> const a = {b};\n>   ```']],
    ],
    [
      'flow JSX after nested list markers',
      '- - <X a="1" />\n    2. ```js\n       a = {b}\n       ```\n',
      [
        ['tag', '<X a="1" />'],
        ['fence', '    2. ```js\n       a = {b}\n       ```'],
      ],
    ],
    [
      'a quote-only line after an empty item (not blank to it)',
      '-\n  >\n  ```js\n  a = {b}\n\nout {c}\n',
      [['fence', '  ```js\n  a = {b}\n']],
    ],
    ['a nested ordered marker other than 1 after a paragraph', 'e\n1. 2. ~~~\n{x}\n', []],
    [
      'tilde fences between paragraphs',
      '~~~\ncode {a}\n~~~\n\ntext {b}\n\n~~~\ncode {c}\n~~~\n',
      [
        ['fence', '~~~\ncode {a}\n~~~'],
        ['fence', '~~~\ncode {c}\n~~~'],
      ],
    ],
  ])('finds the code in %s', (_name, src, want) => {
    expect(code(src)).toEqual(want);
  });

  it.each<[string, string, string[]]>([
    ['a span across a blank line', 'a `b\n\nc` d', ['`', '`']],
    ['a span across a heading', '# a `b\n{x}` c', ['`', '`']],
    ['a span across a list item', '- a `b\n- c` {d}', ['`', '`']],
    ['a span across table rows', '| a `b | c |\n|---|---|\n| d` {e} | f |', ['`', '`']],
    ['a span across a flow JSX line', 'a `b\n<X />\nc` d', ['`', '`']],
    ['an info string holding a backtick', '```js `x` {a}\n', ['```']],
    ['the run after a span that closed after a backslash', '`a\\` {x}` tail', ['`']],
    ['a ```` fence around ``` lines', '````md\n```js\n{a}\n```\n````\n\nafter `x`', []],
    ['a span across a line starting with a tag', 'Use `<ul>\n<li>` here.\n', []],
    ['a marker-then-quote fence', '- > ```js\n  > a\n  > ```\n', []],
    ['a span across the next ordered item', '1. `a\n2. b` {c}\n', ['`', '`']],
    [
      'a span across a quote line left of the item (no lazy line)',
      '- > Note: don`t\n> pass {x} when it`s set\n',
      ['`', '`'],
    ],
    ['a span after a heading on a marker line', '- ## Don`t\nIt`s {x}\n', ['`', '`']],
    ['a nested bullet-then-ordered marker after a paragraph', 'k\n- 7) ```\n{x}\n', ['```']],
    ['an ordered marker in a new quote after a paragraph', 'k\n>- 7) ```\n{x}\n', ['```']],
  ])('reports the stray backticks of %s', (_name, src, want) => {
    expect(strays(src)).toEqual(want);
  });

  it('leaves fencedCodeRanges on the CommonMark closer rule', () => {
    // MDX closes this fence on the indented closer; CommonMark (and the
    // comment scanner, whose ranges must not change) reads it as content.
    const src = '```\n{x}\n        ```\n\n{z}';
    expect(slices(src, fencedCodeRanges(src))).toEqual([src]);
    expect(code(src)).toEqual([['fence', '```\n{x}\n        ```']]);
  });

  // The JSX tag reader is the regex dwar used before, written out by hand so it
  // cannot overflow the stack. The reference walks the same tokens (a backslash
  // escape, a `<`) and asks the regex at each `<`; with no backtick or tilde in
  // the source there are no fences or spans, so every tag is the reader's.
  describe('reads JSX tags like the regex it replaced', () => {
    const REF_TAG = /<\/?[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][\w-]*(?:="[^"]*"|='[^']*')?)*\s*\/?>/y;
    const referenceTags = (source: string): string[] => {
      const out: string[] = [];
      const token = /\\[^\n]|</g;
      let m: RegExpExecArray | null;
      while ((m = token.exec(source)) !== null) {
        if (m[0] !== '<') continue;
        REF_TAG.lastIndex = m.index;
        if (REF_TAG.test(source)) {
          out.push(source.slice(m.index, REF_TAG.lastIndex));
          token.lastIndex = REF_TAG.lastIndex;
        }
      }
      return out;
    };
    const tags = (source: string): string[] =>
      mdxCodeRanges(source)
        .code.filter((c) => c.kind === 'tag')
        .map((c) => source.slice(c.start, c.end));

    it('matches on seeded random sequences', () => {
      const pieces = [
        '<',
        '<',
        '</',
        '>',
        '/>',
        'a',
        'B',
        '1',
        '-',
        '_',
        '=',
        '="',
        "='",
        '"',
        "'",
        ' ',
        '\n',
        '\t',
        '\v',
        ' ',
        ' ',
        '{',
        '\\',
        '=""',
        '<X a="{q}" />',
      ];
      let seed = 372;
      const next = (k: number): number => {
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
        return seed % k;
      };
      let mismatches = 0;
      let first: string | undefined;
      for (let n = 0; n < 40_000; n++) {
        let s = '';
        for (let len = 1 + next(16); len > 0; len--) s += pieces[next(pieces.length)];
        if (JSON.stringify(tags(s)) !== JSON.stringify(referenceTags(s))) {
          mismatches++;
          first ??= s;
        }
      }
      if (first !== undefined)
        expect(tags(first), JSON.stringify(first)).toEqual(referenceTags(first));
      expect(mismatches).toBe(0);
    });

    it('the reference tells the cases apart', () => {
      expect(referenceTags('<a b="x"> <a b="x> <a b> \\<c> <d/>')).toEqual([
        '<a b="x">',
        '<a b>',
        '<d/>',
      ]);
    });
  });

  it(
    'does not throw on a code span or a tag of 16M characters',
    () => {
      const n = 16 * 1024 * 1024;
      const span = '`' + 'x'.repeat(n) + '` {y}\n';
      expect(code(span).map(([kind, text]) => [kind, text.length])).toEqual([['span', n + 2]]);
      const tag = '<a ' + 'b="c" '.repeat(n / 6) + '/> {x}\n';
      expect(mdxCodeRanges(tag).code).toEqual([
        { start: 0, end: tag.indexOf('/>') + 2, kind: 'tag' },
      ]);
      const open = '<a ' + 'b '.repeat(n / 2) + '{x}\n';
      expect(mdxCodeRanges(open).code).toEqual([]);
    },
    PERF_TEST_TIMEOUT
  );

  it(
    'does not throw on one line of 8M characters of list or quote markers',
    () => {
      const n = 8 * 1024 * 1024;
      const items = '- '.repeat(n / 2) + 'x `y`\n';
      expect(code(items)).toEqual([['span', '`y`']]);
      const fence = '- '.repeat(n / 2) + '```\n{x}\n';
      expect(code(fence).map(([kind]) => kind)).toEqual(['fence']);
      const quotes = '>'.repeat(n) + ' ```\n{x}\n';
      expect(code(quotes).map(([kind]) => kind)).toEqual(['fence']);
    },
    PERF_TEST_TIMEOUT
  );
});

// Every page body goes through these scanners several times per build, so a
// pathological one must not stall it: each adversarial input must scale
// linearly (see linear-scaling.ts). The quadratic versions took seconds to
// minutes on 1MB. Each generator takes a size in characters, roughly.
describe('markdown-scan performance', () => {
  const MB = 1_000_000;
  /** Backtick runs of length 1, 2, 3, … separated by spaces, about `n` long, then `<!--`. */
  const distinctRuns = (n: number): string => {
    let s = '';
    for (let k = 1; s.length < n; k++) s += '`'.repeat(k) + ' ';
    return s + '<!--';
  };

  it.each<[string, (n: number) => string]>([
    ['unclosed inline openers on one line', (n) => 'a <!-- '.repeat(n / 7)],
    ['unclosed inline openers on many lines', (n) => 'a <!-- b\n'.repeat(n / 9)],
    ['unclosed line-start openers', (n) => '<!-- x\n'.repeat(n / 7)],
    // A body without `<!--` short-circuits; the trailing opener keeps the
    // tokenizer running over these.
    ['closers without openers', (n) => 'a --> '.repeat(n / 6) + '<!--'],
    ['closed inline comments across lines', (n) => 'a <!-- b\nc --> d\n'.repeat(n / 17)],
    [
      'fences with spans and comments',
      (n) => '```js\nx\n```\n\nSee `a` <!-- c --> [l](u).\n\n'.repeat(n / 45),
    ],
    ['one opener then a long paragraph', (n) => 'a <!-- ' + 'word '.repeat(n / 5)],
    [
      'paragraph-crossing openers with one closer at the end',
      (n) => 'a <!-- b\n\n'.repeat(n / 10) + '-->',
    ],
    ['stray backticks of mixed lengths', (n) => '` a `` b ``` c '.repeat(n / 15) + '<!--'],
    // Runs of 1, 2, 3, … backticks that never close, then the rest of the
    // paragraph: a regex closer search rescans that rest once per run (and once
    // more per shorter length), quadratic in the paragraph.
    [
      'unclosed backtick runs of distinct lengths',
      (n) => distinctRuns(n / 2) + 'word '.repeat(n / 10),
    ],
    // The run grows with the paragraph (1000 backticks at 1MB) so that a
    // rescan per backtick of it shows up as quadratic, not as a constant factor.
    [
      'one long unclosed backtick run',
      (n) => '`'.repeat(n / 1000) + ' ' + 'word '.repeat(n / 5) + '<!--',
    ],
    [
      'code spans whose closer is past a break',
      (n) => distinctRuns(n / 2) + '\n> q\n' + distinctRuns(n / 2),
    ],
    ['unterminated tag attributes', (n) => '<a b="x '.repeat(n / 8) + '<!--'],
    [
      'a header row of comments holding pipes',
      (n) => {
        const k = Math.floor(n / 18);
        return 'h <!-- | --> |'.repeat(k) + '\n' + '|---'.repeat(k) + '|\n| x <!--\n--> |\n';
      },
    ],
    [
      'a header row of unclosed openers',
      (n) => {
        const k = Math.floor(n / 13);
        return 'a <!-- | '.repeat(k) + '\n' + '|---'.repeat(k) + '|\n';
      },
    ],
    [
      'many small header rows with a commented pipe',
      (n) => 'a <!-- | --> b | c\n-|-\n\n'.repeat(Math.floor(n / 25)),
    ],
  ])(
    '%s scales linearly',
    (_name, makeInput) => {
      expectLinearScaling(htmlCommentRanges, makeInput);
    },
    PERF_TEST_TIMEOUT
  );

  it.each<[string, (n: number) => string]>([
    [
      'backtick runs of distinct lengths',
      (n) => {
        let s = '';
        for (let k = 1; s.length < n; k++) s += '`'.repeat(k) + ' ';
        return s;
      },
    ],
    ['unclosed backtick runs across blank lines', (n) => '`` a\n\n` b\n\n'.repeat(n / 12)],
  ])(
    '%s scales linearly for inlineCodeSpans',
    (_name, makeInput) => {
      expectLinearScaling(inlineCodeSpans, makeInput);
    },
    PERF_TEST_TIMEOUT
  );

  it.each<[string, (n: number) => string]>([
    [
      'fences, spans and tags',
      (n) =>
        '````md\n```js\n{a}\n````\n\nSee `a{b}` <X a="{c}" /> {d}.\n\nimport it\n\n'.repeat(n / 58),
    ],
    ['one code span over many lines', (n) => '`' + 'word {x}\n'.repeat(n / 9) + '` {y}\n'],
    ['an unclosed backtick then a long paragraph', (n) => '`' + 'word {x}\n'.repeat(n / 9)],
    ['stray backticks of mixed lengths', (n) => '` a `` b ``` c {x}\n\n'.repeat(n / 20)],
    [
      'unclosed backtick runs of distinct lengths',
      (n) => {
        let s = '';
        for (let k = 1; s.length < n / 2; k++) s += '`'.repeat(k) + ' ';
        return s + 'word {x} '.repeat(n / 18);
      },
    ],
    ['one tag with many attributes', (n) => '<a ' + 'b="c" '.repeat(n / 6) + '/> {x}\n'],
    ['one unclosed tag with many attributes', (n) => '<a ' + 'b="c" '.repeat(n / 6) + '{x}\n'],
    ['unterminated tag attributes', (n) => '<a b="x '.repeat(n / 8)],
    ['unterminated tags by line', (n) => "<a b='x\n".repeat(n / 8)],
    ['list-item fences', (n) => '- a\n\n  ```\n  {x}\n  ```\n'.repeat(n / 24)],
    ['flow JSX lines among fences', (n) => '<X a="p\n```\n{b}" />\n\n```\nc\n```\n'.repeat(n / 30)],
    // No backtick, `<` or backslash between the fences: one token search
    // must not be restarted from every fence.
    [
      'tilde fences between plain paragraphs',
      (n) => '~~~\ncode {a}\n~~~\n\ntext {b}\n\n'.repeat(n / 27),
    ],
    [
      'backtick fences between plain paragraphs',
      (n) => '```\ncode {a}\n```\n\ntext {b}\n\n'.repeat(n / 27),
    ],
    ['one tag, then tilde fences', (n) => '<b>\n\n' + '~~~\nc\n~~~\n\nt\n\n'.repeat(n / 15)],
    ['marker-then-quote fences', (n) => '- > ```js\n  > {a}\n  > ```\n\n'.repeat(n / 28)],
    ['one line of many list markers', (n) => '- '.repeat(n / 2) + 'x `y`\n'],
    ['one line of many quote and list markers', (n) => '> - '.repeat(n / 4) + '```\n{x}\n'],
  ])(
    '%s scales linearly for mdxCodeRanges',
    (_name, makeInput) => {
      expectLinearScaling(mdxCodeRanges, makeInput);
    },
    PERF_TEST_TIMEOUT
  );

  // The line tests must not recurse per repetition: as regexes, a thematic
  // break or delimiter row test overflowed the stack on lines this long. Each
  // starts at an eighth of the line it used to be checked on, so the larger
  // input is at least that long.
  it.each<[string, number, (n: number) => string]>([
    ['a thematic-break line', 5 * MB, (n) => 'a <!--\n' + '--- '.repeat(n / 4) + '\n-->\n'],
    ['a dash line under a paragraph', 5 * MB, (n) => 'a <!--\n' + '-'.repeat(n) + '\n-->\n'],
    ['a delimiter row', 8 * MB, (n) => 'a | b <!--\n' + '|---'.repeat(n / 4) + '|\n-->\n'],
    [
      'a delimiter row under a matching header',
      16 * MB,
      (n) => '|' + ' a |'.repeat(n / 8) + '\n' + '|---'.repeat(n / 8) + '|\n<!-- c -->\n',
    ],
  ])(
    '%s of several MB on one line scales linearly',
    (_name, length, makeInput) => {
      expectLinearScaling(htmlCommentRanges, makeInput, { startSize: length / 8 });
    },
    PERF_TEST_TIMEOUT
  );

  it.each<[string, (n: number) => string]>([
    ['unclosed openers', (n) => 'a <!-- '.repeat(n / 7)],
    ['closers without openers', (n) => 'a --> '.repeat(n / 6) + '<!--'],
    ['unterminated tag attributes', (n) => '<a b="x '.repeat(n / 8) + '<!--'],
    ['one quote that never closes, then openers', (n) => '<a b="' + 'x <!-- '.repeat(n / 7)],
    ['tags whose quoted values hold >', (n) => '<a b="x>y" c=\'z\'>'.repeat(n / 17) + '<!--'],
    ['openers in attributes with closers after', (n) => '<a t="<!--">x --> '.repeat(n / 18)],
    ['lone < everywhere', (n) => '<'.repeat(n) + '<!--'],
    ['bogus comments', (n) => '<?x> '.repeat(n / 5) + '<!--'],
    ['one tag full of = signs', (n) => '<a ' + '= '.repeat(n / 2) + '<!--'],
  ])(
    '%s scales linearly as raw HTML',
    (_name, makeInput) => {
      expectLinearScaling(htmlCommentRangesInHtml, makeInput);
    },
    PERF_TEST_TIMEOUT
  );

  // The tag body was a regex loop that overflowed the stack on one tag of
  // several million characters (#382). The window is pinned at 2M and 16M.
  it.each<[string, (n: number) => string]>([
    ['unterminated tag attributes', (n) => '<a b="x '.repeat(n / 8) + '<!--'],
    ['one tag full of = signs', (n) => '<a ' + '= '.repeat(n / 2) + '<!--'],
    ['one long attribute name', (n) => '<a ' + 'x'.repeat(n) + '<!--'],
    ['one tag full of quoted values', (n) => '<a ' + 'b="x" '.repeat(n / 6) + '><!--'],
    ['one tag full of quoted values holding >', (n) => '<a ' + 'b=">" '.repeat(n / 6) + '<!--'],
    ['many tags then one =', (n) => '<p>'.repeat(n / 3) + '= <!--'],
    ['whitespace between = and its value', (n) => '<a b=' + ' '.repeat(n) + '"x"><!--'],
  ])(
    '%s scales linearly as raw HTML up to 16M characters (#382)',
    (_name, makeInput) => {
      expectLinearScaling(htmlCommentRangesInHtml, makeInput, {
        startSize: 2 * MB,
        maxSize: 2 * MB,
      });
    },
    PERF_TEST_TIMEOUT
  );
});

describe('markdown-scan in the browser bundle', () => {
  // rang bundles this module into the island script, and a bundler keeps a
  // module-level `RegExp(…)` call even when nothing uses it (see the note at
  // the top of the module): every pattern must be a literal or built lazily.
  it('builds a RegExp only inside the lazy htmlBlockStartRe', () => {
    const lines = readFileSync(new URL('../site/markdown-scan.ts', import.meta.url), 'utf8').split(
      /\r?\n/
    );
    const from = lines.findIndex((l) => l.startsWith('function htmlBlockStartRe('));
    const to = lines.findIndex((l, i) => i > from && l === '}');
    expect(from).toBeGreaterThan(-1);
    // Lines of code (not comments) that call RegExp.
    const calls = lines
      .map((l, i) => (/^\s*(?:\/\/|\/?\*)/.test(l) || !l.includes('RegExp(') ? -1 : i))
      .filter((i) => i !== -1);
    expect(calls.length).toBeGreaterThan(0);
    for (const i of calls) expect(i > from && i < to, `line ${i + 1}: ${lines[i]}`).toBe(true);
  });
});
