import { describe, it, expect } from 'vitest';
import type { Root } from 'mdast';
import { htmlToMdastBlocks, markdownToMdastBlocks } from '../mdast/from-html';
import { toMdx } from '../mdx';

const mdx = (blocks: Root['children']): string => toMdx({ type: 'root', children: blocks });

/** True when `s` holds an `<!--` that isn't backslash-escaped. */
const hasRawOpener = (s: string): boolean => /(^|[^\\])<!--/.test(s);

// HTML comments in prose pass through setu as raw `html` nodes and are dropped
// by dwar's MDX pre-pass (`stripHtmlComments`). setu's one job here is the
// unterminated opener: the HTML parser would otherwise run that comment to the
// end of the fragment, hiding the rest of a README or doc comment.
describe('HTML comments through the HTML normalization', () => {
  it('passes a terminated comment through verbatim (dwar drops it at compile)', () => {
    expect(mdx(markdownToMdastBlocks('<!-- badges -->\n\nText.'))).toBe(
      '<!-- badges -->\n\nText.\n'
    );
    expect(mdx(htmlToMdastBlocks('<p>a <!-- note -->b</p>'))).toBe('a <!-- note -->b\n');
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
    expect(out).toContain('<!-- real -->');
    expect(out).toContain('\\<!-- stray');
    expect(out).toContain('c');
  });

  it('treats <!--> and <!---> as complete empty comments', () => {
    expect(mdx(htmlToMdastBlocks('<p>a<!-->b<!--->c</p>'))).toBe('a<!---->b<!---->c\n');
  });

  it('leaves an opener inside code alone (it reaches here entity-escaped)', () => {
    const out = mdx(markdownToMdastBlocks('```html\n<!-- open\n```\n\nUse `<!--` to start.'));
    expect(out).toContain('```html\n<!-- open\n```');
    expect(out).toContain('`<!--`');
  });
});
