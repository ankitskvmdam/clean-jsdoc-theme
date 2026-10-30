/**
 * Angle-bracketed words in prose (`Promise<User>`, a generic `<T>`) must render
 * as the text they are. JSDoc's markdown plugin — and setu's own Markdown → HTML
 * lowering for docs and TypeDoc comments — hands them over as raw tags, which
 * the HTML round-trip used to unwrap (the word vanished) or, for a name that
 * collides with a real element, worse (`<Option>` swallowed the rest of the
 * paragraph). Real markup and the theme's own containers must be unaffected.
 */
import { describe, it, expect } from 'vitest';
import type { Root, RootContent } from 'mdast';
import { default as salty } from '@jsdoc/salty';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { escapeLiteralTags } from '../mdast/literal-tags';
import { htmlToMdastBlocks, htmlToMdastInline, markdownToMdastBlocks } from '../mdast/from-html';
import { examplesBlocks } from '../mdast/doclet';
import { toMdx } from '../mdx';
import { generateSite } from '../index';

/** Serialize converted blocks the way a page body is written. */
const mdx = (nodes: RootContent[]): string =>
  toMdx({ type: 'root', children: nodes } as Root).trim();

/** Plain text of converted blocks, paragraph per line. */
const text = (nodes: RootContent[]): string =>
  nodes
    .map((n) =>
      JSON.stringify(n)
        .match(/"value":"((?:[^"\\]|\\.)*)"/g)!
        .map((m) => JSON.parse(m.slice(8)) as string)
        .join('')
    )
    .join('\n');

/** Is `tag` (as it sits in `html`) kept as markup by escapeLiteralTags? */
const kept = (html: string, tag: string): boolean => {
  const at = html.indexOf(tag);
  return escapeLiteralTags(html).slice(at, at + tag.length) === tag;
};

describe('escapeLiteralTags — which tags are markup', () => {
  it.each([
    // [html, tag] — kept as markup
    ['<p>Press <kbd>Ctrl</kbd></p>', '<kbd>'],
    ['line<br>next', '<br>'],
    ['a <img src="x.png"> b', '<img'],
    ['an unclosed <p>para', '<p>'],
    ['x<b>bold</b>', '<b>'],
    ['<B>bold</B>', '<B>'],
    ['<I>it</I>', '<I>'],
    ['<A HREF="https://e.com">L</A>', '<A'],
    ['<P ALIGN=center>x', '<P'],
    ['<DIV>x', '<DIV>'],
    ['<TABLE><TR><TD>x', '<TABLE>'],
    ['a <BR> b', '<BR>'],
    ['<my-widget>Hello</my-widget>', '<my-widget>'],
    ['<x-el data-a="1">', '<x-el'],
    ['stray <steps> tag', '<steps>'],
  ])('keeps %j', (html, tag) => {
    expect(kept(html, tag)).toBe(true);
  });

  it.each([
    // [html, tag] — escaped as literal text
    ['Promise<User>', '<User>'],
    ['a generic <T>', '<T>'],
    ['Props<P> more', '<P>'],
    ['Map<B>', '<B>'],
    ['Array<Option> of', '<Option>'],
    ['Array<string>', '<string>'],
    ['Promise<object> then', '<object>'],
    ['Array<title> then more', '<title>'],
    ['Array<textarea> rest', '<textarea>'],
    ['Parser<Input>', '<Input>'],
    ['a <Callout type="tip">x</Callout>', '<Callout'],
    ['Use <Steps> literal and <Tab> stray', '<Steps>'],
    ['Use <Steps> literal and <Tab> stray', '<Tab>'],
    ['a <Br> b', '<Br>'],
    ['<Img src="x.png">', '<Img'],
    ['<Div>x</Div>', '<Div>'],
    ['<Button variant="primary">Click</Button>', '<Button'],
    ['<Button onClick={fn}>x</Button>', '<Button'],
    ['<Select>', '<Select>'],
    ['<Input>', '<Input>'],
    ['<Link href="/x">', '<Link'],
    ['<Form>x</Form>', '<Form>'],
    ['<Table>x</Table>', '<Table>'],
    ['<Label>x</Label>', '<Label>'],
    ['<Dialog open>x</Dialog>', '<Dialog'],
    ['<Menu>x</Menu>', '<Menu>'],
    ['<Option value="a">A</Option>', '<Option'],
  ])('escapes %j', (html, tag) => {
    expect(kept(html, tag)).toBe(false);
  });

  it('keeps a closing tag only when it closes a kept opener', () => {
    expect(escapeLiteralTags('<B>bold</B> and <Foo>x</Foo>')).toBe(
      '<B>bold</B> and &lt;Foo>x&lt;/Foo>'
    );
  });
});

describe('escapeLiteralTags', () => {
  it('escapes only the opener of a literal tag (and of its close tag)', () => {
    expect(escapeLiteralTags('<p>a Promise<User> and <Foo>x</Foo></p>')).toBe(
      '<p>a Promise&lt;User> and &lt;Foo>x&lt;/Foo></p>'
    );
  });

  it('leaves markup, comments and non-tags untouched', () => {
    const html =
      '<p>a < b, x <= 3 <kbd>Ctrl</kbd> <!-- <User> --> &lt;T&gt; <code>A&lt;B&gt;</code></p>';
    expect(escapeLiteralTags(html)).toBe(html);
  });

  it('judges each level of a nested generic on its own', () => {
    expect(escapeLiteralTags('Promise<Array<string>>')).toBe('Promise&lt;Array&lt;string>>');
  });

  it('escapes a raw `b<c` (the parser would open a `<c,>` element there)', () => {
    expect(escapeLiteralTags('<p>b<c, d</p>')).toBe('<p>b&lt;c, d</p>');
  });

  it('is a no-op on a string without tags', () => {
    expect(escapeLiteralTags('plain text')).toBe('plain text');
  });
});

describe('literal angle-bracket words survive conversion', () => {
  it('keeps generic type names in a JSDoc description (c04 repro)', () => {
    // What JSDoc's markdown plugin emits: `<User>`/`<string>` pass through as
    // raw tags; `<K, V>` isn't a valid tag name, so it arrives entity-escaped.
    const blocks = htmlToMdastBlocks(
      '<p>Resolves to a Promise<User> or Array<string>, maybe Map&lt;K, V&gt;.</p>'
    );
    expect(text(blocks)).toBe('Resolves to a Promise<User> or Array<string>, maybe Map<K, V>.');
    expect(mdx(blocks)).toBe(
      'Resolves to a Promise\\<User> or Array\\<string>, maybe Map\\<K, V>.'
    );
  });

  it('keeps a generic `<T>` and capitalized component-looking words (c05 repro)', () => {
    const blocks = htmlToMdastBlocks(
      '<p>Generic param <T> and a <Foo> component and <Callout> literal.</p>'
    );
    expect(text(blocks)).toBe('Generic param <T> and a <Foo> component and <Callout> literal.');
  });

  it('keeps nested generics, attributes and explicit close tags verbatim', () => {
    const blocks = htmlToMdastBlocks(
      '<p>Gets Promise<Array<string>>, a <Callout type="tip">tip</Callout> too.</p>'
    );
    expect(text(blocks)).toBe(
      'Gets Promise<Array<string>>, a <Callout type="tip">tip</Callout> too.'
    );
  });

  it('does not let `<Option>`/`<Object>` (element-name collisions) swallow the paragraph', () => {
    const blocks = htmlToMdastBlocks('<p>An Array<Option> of choices, or Array<Object> x.</p>');
    expect(text(blocks)).toBe('An Array<Option> of choices, or Array<Object> x.');
  });

  it('does not let a generic `<P>` split the paragraph', () => {
    const blocks = htmlToMdastBlocks('<p>Takes Props<P> and more.</p>');
    expect(blocks).toHaveLength(1);
    expect(text(blocks)).toBe('Takes Props<P> and more.');
  });

  it('keeps them in inline fields (param / returns descriptions)', () => {
    const inline = htmlToMdastInline('value of type <T>, or Promise<User>');
    expect(text([{ type: 'paragraph', children: inline }])).toBe(
      'value of type <T>, or Promise<User>'
    );
  });

  it('keeps them in Markdown prose (README / docs / TypeDoc comments)', () => {
    const blocks = markdownToMdastBlocks('Returns a `Promise<T>` resolving to Promise<User>.');
    expect(mdx(blocks)).toBe('Returns a `Promise<T>` resolving to Promise\\<User>.');
  });

  it('keeps them inside raw inline code markup', () => {
    const blocks = htmlToMdastBlocks('<p>See <code>Promise<User></code>.</p>');
    expect(mdx(blocks)).toBe('See `Promise<User>`.');
  });

  it('keeps them inside a <steps> item and a callout', () => {
    const blocks = markdownToMdastBlocks(
      '<steps>\n<step label="One">\n\nReturns Promise<User>.\n\n</step>\n</steps>\n\n> [!TIP]\n> Use Map<K>.'
    );
    const out = mdx(blocks);
    expect(out).toContain('<Steps>');
    expect(out).toContain('Returns Promise\\<User>.');
    expect(out).toContain('<Callout type="tip">');
    expect(out).toContain('Use Map\\<K>.');
  });
});

describe('controls — real markup and plain comparisons are unchanged', () => {
  it('renders comparisons and entity-escaped brackets as before', () => {
    // As JSDoc's markdown plugin emits them: `b<c` isn't a valid tag, so it
    // arrives entity-escaped, like `<T>` written as `&lt;T&gt;`.
    const blocks = htmlToMdastBlocks('<p>a < b, b&lt;c, x <= 3, &lt;T&gt;</p>');
    expect(text(blocks)).toBe('a < b, b<c, x <= 3, <T>');
  });

  it('still lowers real inline HTML (tags dropped, content kept)', () => {
    const blocks = htmlToMdastBlocks(
      '<p>Press <kbd>Ctrl</kbd>, H<sub>2</sub>O, x<sup>2</sup>.</p><details><summary>More</summary><p>Body</p></details>'
    );
    expect(text(blocks)).toBe('Press Ctrl, H2O, x2.\nMore\nBody');
  });

  it('still converts <br>, <img>, links and all-caps markup', () => {
    const out = mdx(
      htmlToMdastBlocks(
        '<p>a<br>b <img src="x.png" alt="X"> <a href="https://e.com">e</a> c<BR>d</p>'
      )
    );
    expect(out).toContain('![X](x.png)');
    expect(out).toContain('[e](https://e.com)');
    expect(out).not.toContain('&lt;');
    expect(out).not.toMatch(/\\<(br|BR|img)/);
  });

  it('still turns a Markdown autolink into a link', () => {
    expect(mdx(markdownToMdastBlocks('See <https://example.com>.'))).toBe(
      'See [https://example.com](https://example.com).'
    );
  });

  it('still lifts <steps>, <tabs> and <playground> containers', () => {
    const out = mdx(
      markdownToMdastBlocks(
        [
          '<tabs>\n<tab label="A">\n\nalpha\n\n</tab>\n<tab label="B">\n\nbeta\n\n</tab>\n</tabs>',
          '<playground codepen>\n\n```js\nconsole.log(1);\n```\n\n</playground>',
        ].join('\n\n')
      )
    );
    expect(out).toContain('<Tabs>');
    expect(out).toContain('<Tab label="A">');
    expect(out).toContain('<Playground');
  });

  it('keeps the old handling of a stray container tag (tag dropped, content kept)', () => {
    expect(text(htmlToMdastBlocks('<p>a <step>b</step> c</p>'))).toBe('a b c');
  });
});

describe('page frontmatter description', () => {
  const site = (description: string) =>
    generateSite(
      salty.taffy([
        {
          kind: 'module',
          name: 'm',
          longname: 'module:m',
          scope: 'global',
          comment: '/** m */',
          description,
        },
      ]) as unknown as TJSDocSaltyCollection<TDoclet>
    );

  it('reads like the body: literal tags kept, real tags stripped, entities decoded', () => {
    const page = site(
      '<p>Resolves to a Promise<User> or <code>Array</code>, maybe Map&lt;K, V&gt; &amp; &quot;more&quot;.</p>'
    ).pages.find((p) => p.slug === 'module/m');
    expect(page?.frontmatter.description).toBe(
      'Resolves to a Promise<User> or Array , maybe Map<K, V> & "more".'
    );
  });
});

describe('page frontmatter description — character references', () => {
  const describe1 = (description: string): string | undefined =>
    generateSite(
      salty.taffy([
        { kind: 'module', name: 'm', longname: 'module:m', scope: 'global', description },
      ]) as unknown as TJSDocSaltyCollection<TDoclet>
    ).pages.find((p) => p.slug === 'module/m')?.frontmatter.description;

  it('decodes once: `&#38;lt;T&#38;gt;` is the text `&lt;T&gt;`', () => {
    expect(describe1('<p>a &#38;lt;T&#38;gt; b</p>')).toBe('a &lt;T&gt; b');
  });

  it('decodes any named reference', () => {
    expect(describe1('<p>a &mdash; b &hellip;</p>')).toBe('a — b …');
  });

  it('leaves out-of-range, surrogate and NUL references as written instead of throwing', () => {
    expect(describe1('<p>a &#99999999; &#x110000; &#xD800; &#0; b</p>')).toBe(
      'a &#99999999; &#x110000; &#xD800; &#0; b'
    );
  });
});

describe('reviewer cases — lowercase element names as type arguments', () => {
  it('keeps `Promise<object>` and the text after it', () => {
    expect(text(htmlToMdastBlocks('<p>Promise<object> then more.</p>'))).toBe(
      'Promise<object> then more.'
    );
  });

  it('does not let `Array<title>` / `Array<textarea>` eat the rest of the page', () => {
    for (const name of ['title', 'textarea']) {
      const blocks = htmlToMdastBlocks(`<p>Array<${name}> then more</p><p>next</p>`);
      expect(text(blocks), name).toBe(`Array<${name}> then more\nnext`);
    }
  });
});

describe('reviewer cases — HTML spelled lowercase, ALL-CAPS or single-capital still renders', () => {
  it.each([
    ['<p>a <B>bold</B> b</p>', 'a **bold** b'],
    ['<p>a <I>it</I> b</p>', 'a _it_ b'],
    ['<p><A HREF="https://e.com">L</A></p>', '[L](https://e.com)'],
    ['<p>a <BR> b <IMG SRC="x.png" ALT="X"></p>', 'a\\\nb ![X](x.png)'],
    ['<DIV>Hello</DIV>', 'Hello'],
    ['<p><my-widget>Hello</my-widget></p>', 'Hello'],
  ])('%j → %j', (html, expected) => {
    expect(mdx(htmlToMdastBlocks(html))).toBe(expected);
  });

  it('keeps a capitalized stray container name literal', () => {
    expect(text(htmlToMdastBlocks('<p>Use <Steps> literal and <Tab> stray.</p>'))).toBe(
      'Use <Steps> literal and <Tab> stray.'
    );
  });
});

describe('comments', () => {
  it('treats `<!-->` and `<!--->` as complete comments', () => {
    expect(escapeLiteralTags('<!--> Promise<User> <!---> <T> -->')).toBe(
      '<!--> Promise&lt;User> <!---> &lt;T> -->'
    );
  });

  it('is linear on many unterminated `<!--`', () => {
    const html = '<!--x'.repeat(40_000);
    const start = performance.now();
    expect(escapeLiteralTags(html)).toBe(html);
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe('@example captions', () => {
  const caption = (text: string): string =>
    mdx(
      examplesBlocks(
        { longname: 'x', examples: [`<caption>${text}</caption>\nrun();`] } as unknown as TDoclet,
        'js'
      )
    );

  it('keeps a literal type name instead of handing MDX an unclosed tag', () => {
    const out = caption('Returns Promise<User>');
    expect(out).toContain('Returns Promise\\<User>');
    expect(out).toContain('run();');
  });

  it('leaves a caption without raw HTML on the direct Markdown parse', () => {
    expect(caption('*Basic* use')).toBe('_Basic_ use\n\n```js\nrun();\n```');
  });
});

describe('PascalCase component names render as written', () => {
  it.each([
    [
      '<p>Use <Button variant="primary">Click</Button> here.</p>',
      'Use <Button variant="primary">Click</Button> here.',
    ],
    ['<p>A <Dialog open>body</Dialog>.</p>', 'A <Dialog open>body</Dialog>.'],
    ['<p>a <Img src="x.png"> b <Div>c</Div></p>', 'a <Img src="x.png"> b <Div>c</Div>'],
  ])('%j', (html, expected) => {
    expect(text(htmlToMdastBlocks(html))).toBe(expected);
  });
});

describe('a closer only counts inside the same block', () => {
  it.each([
    ['<p>List<a> glued.</p><p>See <a href="u">link</a>.</p>', 'List\\<a> glued.\n\nSee [link](u).'],
    ['<p>Array<code> glued.</p><p>Use <code>x</code>.</p>', 'Array\\<code> glued.\n\nUse `x`.'],
    ['<p>Array<p> glued.</p><p>more</p>', 'Array\\<p> glued.\n\nmore'],
    [
      '<p>Takes Map<B> here.</p><p>later </B> stray</p>',
      'Takes Map\\<B> here.\n\nlater \\</B> stray',
    ],
  ])('%j', (html, expected) => {
    expect(mdx(htmlToMdastBlocks(html))).toBe(expected);
  });

  it('treats a blank line as a block boundary', () => {
    expect(escapeLiteralTags('Map<B> here\n\nlater </B>')).toBe('Map&lt;B> here\n\nlater &lt;/B>');
  });

  it('pairs a glued block element with its closer across inner blocks', () => {
    const html = '<ul><li>item<blockquote><p>q</p></blockquote></li></ul>';
    expect(escapeLiteralTags(html)).toBe(html);
  });

  it('pairs nested same-name tags by depth', () => {
    expect(escapeLiteralTags('<B>a <B>b</B>')).toBe('&lt;B>a <B>b</B>');
  });

  it('accepts the residual ambiguity: a one-letter generic with a stray closer in its block', () => {
    expect(escapeLiteralTags('Map<B> and </B>')).toBe('Map<B> and </B>');
  });
});

describe('genuinely nesting block elements pair by depth', () => {
  it.each([
    ['<ul>\n<li>a<ul>\n<li>b</li>\n</ul>\n</li>\n<li>c</li>\n</ul>'],
    ['<ol><li>step<ol><li>sub</li></ol></li></ol>'],
    ['<div>Text<div>inner</div></div>'],
    ['<blockquote>q<blockquote>r</blockquote></blockquote>'],
  ])('keeps %j as markup', (html) => {
    expect(escapeLiteralTags(html)).toBe(html);
  });

  it('renders a marked-style nested list (glued `a<ul>`) as a nested list', () => {
    const html = '<ul>\n<li>a<ul>\n<li>b</li>\n</ul>\n</li>\n<li>c</li>\n</ul>';
    expect(mdx(htmlToMdastBlocks(html))).toBe('- a\n  - b\n- c');
  });

  it('renders nested ordered lists, divs and quotes', () => {
    expect(mdx(htmlToMdastBlocks('<ol><li>step<ol><li>sub</li></ol></li></ol>'))).toBe(
      '1. step\n   1. sub'
    );
    expect(text(htmlToMdastBlocks('<div>Text<div>inner</div></div>'))).toBe('Text\ninner');
    expect(mdx(htmlToMdastBlocks('<blockquote>q<blockquote>r</blockquote></blockquote>'))).toBe(
      '> q\n>\n> > r'
    );
  });
});

describe('ALL-CAPS element names glued to a word are type arguments', () => {
  it('keeps `Array<DATA>`, `Promise<OBJECT>`, `Set<LABEL>` as text', () => {
    expect(
      text(htmlToMdastBlocks('<p>Array<DATA> and Promise<OBJECT> and Set<LABEL> here.</p>'))
    ).toBe('Array<DATA> and Promise<OBJECT> and Set<LABEL> here.');
  });

  it.each([
    ['a <BR> b', '<BR>'],
    ['x<BR>y', '<BR>'],
    ['a <DIV>b</DIV>', '<DIV>'],
    ['x<B>bold</B>', '<B>'],
  ])('keeps %j as markup', (html, tag) => {
    expect(kept(html, tag)).toBe(true);
  });
});

describe('omitted optional closers stay markup when glued', () => {
  it.each([
    ['<ul><li>a<li>b</ul>', '- a\n- b'],
    // A table without <th> gets an empty header row (as on master), then 2×2.
    ['<table><tr><td>a<td>b<tr><td>c<td>d</table>', '|   |   |\n| - | - |\n| a | b |\n| c | d |'],
  ])('%j → %j', (html, expected) => {
    expect(escapeLiteralTags(html)).toBe(html);
    expect(mdx(htmlToMdastBlocks(html))).toBe(expected);
  });

  it('keeps a definition list with omitted closers as markup', () => {
    const html = '<dl><dt>x<dd>y<dt>z<dd>w</dl>';
    expect(escapeLiteralTags(html)).toBe(html);
    expect(text(htmlToMdastBlocks(html))).not.toContain('<');
  });

  it('still reads a glued `<p>` as a type argument', () => {
    expect(escapeLiteralTags('<p>Array<p> here</p>')).toBe('<p>Array&lt;p> here</p>');
  });
});

// setu neutralizes an unterminated `<!--` and drops complete comments; the tag
// scan must agree on what is a comment, or it would stop escaping (or escape
// inside a comment) where the HTML parser doesn't.
describe('literal tags next to HTML comments', () => {
  it('keeps tags after an unterminated opener literal, beside the visible `<!--`', () => {
    expect(mdx(htmlToMdastBlocks('<p>a <!-- open Promise<User> b</p>'))).toBe(
      'a \\<!-- open Promise\\<User> b'
    );
  });

  it('treats `<!-->` as a complete comment and keeps scanning after it', () => {
    expect(mdx(htmlToMdastBlocks('<p>a <!--> Promise<User> <!-- c --> d<T></p>'))).toBe(
      'a Promise\\<User> d\\<T>'
    );
  });

  it('drops a commented-out tag and keeps one after the comment (Markdown)', () => {
    expect(mdx(markdownToMdastBlocks('a <!-- x <User> --> Map<K> b'))).toBe('a Map\\<K> b');
  });
});
