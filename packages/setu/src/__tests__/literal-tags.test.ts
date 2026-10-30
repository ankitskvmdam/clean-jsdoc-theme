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
import { escapeLiteralTags, isMarkupTagName } from '../mdast/literal-tags';
import { htmlToMdastBlocks, htmlToMdastInline, markdownToMdastBlocks } from '../mdast/from-html';
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

describe('isMarkupTagName', () => {
  it('treats lowercase HTML elements as markup', () => {
    for (const name of ['kbd', 'sub', 'sup', 'details', 'summary', 'br', 'img', 'a', 'p', 'code']) {
      expect(isMarkupTagName(name), name).toBe(true);
    }
  });

  it('treats all-caps HTML elements as markup (old-school spelling)', () => {
    for (const name of ['BR', 'TABLE', 'TD', 'DIV', 'IMG']) {
      expect(isMarkupTagName(name), name).toBe(true);
    }
  });

  it('keeps the theme containers on their existing path, in any case', () => {
    for (const name of ['steps', 'step', 'tabs', 'tab', 'playground', 'Steps', 'TABS']) {
      expect(isMarkupTagName(name), name).toBe(true);
    }
  });

  it('treats capitalized names, lone capitals and unknown names as literal text', () => {
    const literal = ['User', 'Object', 'Option', 'Callout', 'Foo', 'T', 'K', 'P', 'B', 'S'];
    for (const name of [...literal, 'string', 'void', 'any', 'my-widget', 'ID', 'URL']) {
      expect(isMarkupTagName(name), name).toBe(false);
    }
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
