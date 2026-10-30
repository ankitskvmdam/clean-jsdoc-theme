import { describe, it, expect } from 'vitest';
import type { Root } from 'mdast';
import type { TDoclet } from '@clean-jsdoc-theme/utils';
import { examplesBlocks } from '../mdast/doclet';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';
import { toMdx } from '../mdx';

const mdx = (blocks: Root['children']): string => toMdx({ type: 'root', children: blocks });

/** True when `s` holds an `<!--` that isn't backslash-escaped. */
const hasRawOpener = (s: string): boolean => /(^|[^\\])<!--/.test(s);

// Every prose path lowers through the HTML normalization, which drops comment
// nodes (MDX has no comment syntax; dwar's `stripHtmlComments` is only the safety
// net). The unterminated opener is the other job: the HTML parser would run that
// comment to the end of the fragment, hiding the rest of a README or doc comment.
describe('HTML comments through the HTML normalization', () => {
  it('drops a terminated comment', () => {
    expect(mdx(markdownToMdastBlocks('<!-- badges -->\n\nText.'))).toBe('Text.\n');
    expect(mdx(htmlToMdastBlocks('<p>a <!-- note -->b</p>'))).toBe('a b\n');
  });

  it('drops an inline comment that spans a blank line (legal in HTML)', () => {
    expect(mdx(htmlToMdastBlocks('<p>Text <!-- a\n\nb --> c</p>'))).toBe('Text c\n');
  });

  it('drops a comment block holding a lone fence line, keeping what follows', () => {
    const out = mdx(markdownToMdastBlocks('<!--\n```js\n-->\n\nText <!-- c --> after.\n'));
    expect(out).toBe('Text after.\n');
  });

  it('keeps a README alive after a block-level unterminated <!--', () => {
    const out = mdx(markdownToMdastBlocks('Intro.\n\n<!-- oops\n\nStill here.'));
    expect(out).toContain('Still here.');
    expect(hasRawOpener(out)).toBe(false);
  });

  it('keeps a doc comment alive after an inline unterminated <!--', () => {
    const out = mdx(htmlToMdastBlocks('<p>a <!-- oops</p><p>Still here.</p>'));
    expect(out).toContain('\\<!-- oops');
    expect(out).toContain('Still here.');
    expect(hasRawOpener(out)).toBe(false);
  });

  it('only escapes the opener that has no closer after it', () => {
    const out = mdx(htmlToMdastBlocks('<p>a <!-- real --> b <!-- stray</p><p>c</p>'));
    expect(out).not.toContain('real');
    expect(out).toContain('\\<!-- stray');
    expect(out).toContain('c');
  });

  it('treats <!--> and <!---> as complete empty comments', () => {
    expect(mdx(htmlToMdastBlocks('<p>a<!-->b<!--->c</p>'))).toBe('abc\n');
  });

  it('leaves an opener inside code alone (it reaches here entity-escaped)', () => {
    const out = mdx(markdownToMdastBlocks('```html\n<!-- open\n```\n\nUse `<!--` to start.'));
    expect(out).toContain('```html\n<!-- open\n```');
    expect(out).toContain('`<!--`');
  });

  it('escapes many unterminated openers in linear time', () => {
    const html = `<p>${'a <!-- '.repeat(100_000)}</p>`;
    const t = performance.now();
    htmlToMdastBlocks(html);
    expect(performance.now() - t).toBeLessThan(5000);
  });
});

// The container / playground splitters run on raw text before the HTML
// round-trip. A commented-out `<steps>` etc. must stay inside its comment (and
// vanish with it), not be lifted out as a live component with the `<!--`/`-->`
// orphaned around it.
describe('commented-out containers and playgrounds stay commented out', () => {
  /** The MDX holds no live component, no comment and none of the hidden text. */
  function expectCommentedOut(out: string, inner: string): void {
    expect(out).not.toMatch(/<(Steps|Step|Tabs|Tab|Playground)\b/);
    expect(out).not.toContain('<!--');
    expect(out).not.toContain('-->');
    expect(out).not.toContain(inner);
  }

  const STEPS = '<steps>\n<step label="A">one</step>\n</steps>';
  const TABS = '<tabs>\n<tab label="A">one</tab>\n</tabs>';
  const PG_TAG = '<playground codepen>\n\n```js\nrun();\n```\n\n</playground>';
  const PG_FENCE = '```js playground codepen\nrun();\n```';

  it.each([
    ['steps', STEPS, 'one'],
    ['tabs', TABS, 'one'],
    ['playground tag', PG_TAG, 'run();'],
    ['playground fence', PG_FENCE, 'run();'],
  ])('markdown: %s inside a comment', (_name, block, inner) => {
    const out = mdx(markdownToMdastBlocks(`before\n\n<!--\n${block}\n-->\n\nafter`));
    expectCommentedOut(out, inner);
    expect(out).toBe('before\n\nafter\n');
  });

  it.each([
    ['steps', STEPS, 'one'],
    ['tabs', TABS, 'one'],
    [
      'playground tag',
      '<playground codepen><pre><code class="language-js">run();</code></pre></playground>',
      'run();',
    ],
  ])('HTML: %s inside a comment', (_name, block, inner) => {
    const out = mdx(htmlToMdastBlocks(`<p>x</p><!-- ${block} --><p>y</p>`));
    expectCommentedOut(out, inner);
    expect(out).toBe('x\n\ny\n');
  });

  it('still expands a live container next to a commented-out one', () => {
    const out = mdx(markdownToMdastBlocks(`<!--\n${TABS}\n-->\n\n${STEPS}`));
    expect(out).toContain('<Steps');
    expect(out).not.toContain('<Tabs');
  });

  it('still lowers a live playground fence next to a commented-out one', () => {
    const out = mdx(markdownToMdastBlocks(`<!--\n${PG_FENCE}\n-->\n\n${PG_FENCE}`));
    expect(out.match(/<Playground\b/g)).toHaveLength(1);
  });
});

// `@example` captions skip the HTML round-trip (they are Markdown, not the HTML
// JSDoc renders descriptions to), so raw HTML in one used to reach MDX as-is.
describe('example captions holding raw HTML', () => {
  const docletWith = (examples: string[]): TDoclet =>
    ({ longname: 'x', examples }) as unknown as TDoclet;
  const caption = (text: string): string =>
    mdx(examplesBlocks(docletWith([`<caption>${text}</caption>\nrun();`]), 'js'));

  it('lowers a processing instruction / CDATA / void tag the way descriptions do', () => {
    for (const text of ['a <?php x ?> b', 'a <![CDATA[x]]> b', 'a<br>b']) {
      const out = caption(text);
      // No raw `<?`, `<![` or unclosed `<br>` left for MDX to reject.
      expect(out).not.toMatch(/<\?|<!\[|<br>/);
      expect(out).toContain('run();');
    }
  });

  it('drops a comment and keeps the text around it', () => {
    expect(caption('Basic <!-- c --> use')).toBe('Basic use\n\n```js\nrun();\n```\n');
  });

  it('keeps plain Markdown captions on the direct parse', () => {
    expect(caption('*Basic* use')).toBe('_Basic_ use\n\n```js\nrun();\n```\n');
  });
});
