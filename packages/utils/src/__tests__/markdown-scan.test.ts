import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  fencedCodeRanges,
  htmlCommentRanges,
  htmlCommentRangesInHtml,
  inlineCodeSpans,
  maskHtmlComments,
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

// Every page body goes through these scanners several times per build, so a
// pathological one must not stall it: each adversarial input must scale
// linearly (see linear-scaling.ts). The quadratic versions took seconds to
// minutes on 1MB. Each generator takes a size in characters, roughly.
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
    ['`a\nb`', ['`a\nb`']],
    ['no ticks', []],
  ])('finds the code spans in %j', (src, want) => {
    expect(slices(src, inlineCodeSpans(src))).toEqual(want);
  });

  it('reports the delimiter length', () => {
    expect(inlineCodeSpans('a `` x`y `` b').map((s) => s.ticks)).toEqual([2]);
  });
});

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
  ])(
    '%s scales linearly',
    (_name, makeInput) => {
      expectLinearScaling(htmlCommentRanges, makeInput);
    },
    PERF_TEST_TIMEOUT
  );

  // The line tests must not recurse per repetition: as regexes, a thematic
  // break or delimiter row test overflowed the stack on lines this long. Each
  // starts at an eighth of the line it used to be checked on, so the larger
  // input is at least that long.
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
