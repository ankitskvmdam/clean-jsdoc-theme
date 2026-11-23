import { describe, it, expect } from 'vitest';
import type { Page } from '@clean-jsdoc-theme/utils';
import {
  extractExcerpt,
  extractSearchText,
  htmlPathFor,
  mdPathFor,
  renderHtmlDocument,
} from '../html';
import { pageCommentRanges } from '../mdx';
import { expectLinearScaling, PERF_TEST_TIMEOUT } from './linear-scaling';

const basePage: Page = {
  slug: 'x',
  frontmatter: { title: 'X', kind: 'class' },
  body: '',
  headings: [],
};

function doc(extra: Record<string, unknown>): string {
  return renderHtmlDocument({
    page: basePage,
    bodyHtml: '<main></main>',
    islands: [],
    cssHref: '/_assets/styles.b1.css',
    islandChunks: {},
    ...extra,
  });
}

describe('renderHtmlDocument — favicon', () => {
  it('omits the icon link when no favicon is set', () => {
    expect(doc({})).not.toContain('rel="icon"');
  });

  it('emits a typed <link rel="icon"> for an SVG favicon', () => {
    const html = doc({ favicon: '/docs/_assets/logo.abc123.svg' });
    expect(html).toContain(
      '<link rel="icon" type="image/svg+xml" href="/docs/_assets/logo.abc123.svg" />'
    );
  });

  it('derives the type from the extension (.png / .ico)', () => {
    expect(doc({ favicon: '/i.png' })).toContain(
      '<link rel="icon" type="image/png" href="/i.png" />'
    );
    expect(doc({ favicon: '/i.ico' })).toContain(
      '<link rel="icon" type="image/x-icon" href="/i.ico" />'
    );
  });

  it('omits the type for an unknown extension but still links it', () => {
    const html = doc({ favicon: '/i.weird' });
    expect(html).toContain('<link rel="icon" href="/i.weird" />');
  });
});

describe('renderHtmlDocument — custom CSS/JS', () => {
  it('omits custom tags entirely when nothing is provided', () => {
    const html = doc({});
    expect(html).not.toContain('<style>');
    expect(html).not.toContain('_assets/custom.');
  });

  it('inlines customCss as a <style> AFTER the theme stylesheet (so it overrides)', () => {
    const html = doc({ customCss: 'body{color:red}' });
    expect(html).toContain('<style>body{color:red}</style>');
    expect(html.indexOf('styles.b1.css')).toBeLessThan(html.indexOf('<style>'));
  });

  it('links customCss files AFTER the theme stylesheet, before the inline style', () => {
    const html = doc({
      customCssLinks: ['/_assets/a.h1.css', '/_assets/b.h2.css'],
      customCss: 'a{}',
    });
    const main = html.indexOf('styles.b1.css');
    const linkA = html.indexOf('a.h1.css');
    const linkB = html.indexOf('b.h2.css');
    const inline = html.indexOf('<style>');
    // theme stylesheet < first custom link < second (order preserved) < inline style.
    expect(main).toBeLessThan(linkA);
    expect(linkA).toBeLessThan(linkB);
    expect(linkB).toBeLessThan(inline);
  });

  it('emits customJs inline as a classic <script> before </body>', () => {
    const html = doc({ customJs: 'console.log(1)' });
    expect(html).toContain('<script>console.log(1)</script>');
    expect(html.indexOf('console.log(1)')).toBeLessThan(html.indexOf('</body>'));
  });

  it('references customJs files via <script src> before </body>', () => {
    const html = doc({ customJsLinks: ['/_assets/a.h1.js'] });
    expect(html).toContain('<script src="/_assets/a.h1.js"></script>');
    expect(html.indexOf('a.h1.js')).toBeLessThan(html.indexOf('</body>'));
  });

  it('guards against </style> and </script> break-out', () => {
    const html = doc({
      customCss: 'a{}</style><script>evil()</script>',
      customJs: 'x();</script><img>',
    });
    expect(html).not.toContain('a{}</style>');
    expect(html).toContain('a{}<\\/style>');
    expect(html).toContain('x();<\\/script>');
  });
});

describe('renderHtmlDocument — custom <meta> tags', () => {
  it('emits author meta tags in <head> with escaped values', () => {
    const html = doc({
      meta: [
        { name: 'keywords', content: 'jsdoc, typescript' },
        { property: 'og:title', content: 'Fast & "typed" <docs>' },
      ],
    });
    expect(html).toContain('<meta name="keywords" content="jsdoc, typescript" />');
    expect(html).toContain(
      '<meta property="og:title" content="Fast &amp; &quot;typed&quot; &lt;docs&gt;" />'
    );
    // meta lives in <head>.
    expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
  });

  it('neutralises a value that tries to break out of the tag', () => {
    const html = doc({ meta: [{ name: 'x', content: '"><script>alert(1)</script>' }] });
    expect(html).not.toContain('"><script>alert(1)');
    expect(html).toContain('content="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
  });

  it('drops attributes whose names are not simple HTML attribute names', () => {
    const html = doc({ meta: [{ name: 'ok', 'x" onmouseover="alert(1)': 'y' }] });
    expect(html).toContain('<meta name="ok" />');
    expect(html).not.toContain('onmouseover');
  });

  it('emits a guide page frontmatter description as <meta name="description"> (#370)', () => {
    const page: Page = {
      slug: 'guides/faq',
      frontmatter: { title: 'FAQ', kind: 'guide', description: 'Answers & tips' },
      body: '',
      headings: [],
    };
    const html = doc({ page });
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html).toContain('<meta name="description" content="Answers &amp; tips" />');
  });

  it('lets an author description replace the theme default (exactly one)', () => {
    const page: Page = {
      slug: 'x',
      frontmatter: { title: 'X', kind: 'class', description: 'Auto excerpt' },
      body: '',
      headings: [],
    };
    const html = doc({ page, meta: [{ name: 'description', content: 'Hand-written' }] });
    expect(html).toContain('<meta name="description" content="Hand-written" />');
    expect(html).not.toContain('Auto excerpt');
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });

  it('lets an author charset/viewport replace the theme defaults (no duplicate)', () => {
    const html = doc({
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
      ],
    });
    expect(html.match(/charset=/g)).toHaveLength(1);
    expect(html.match(/name="viewport"/g)).toHaveLength(1);
    expect(html).toContain('maximum-scale=5');
  });

  it('emits the theme charset/viewport unchanged when no meta is given', () => {
    const html = doc({});
    expect(html).toContain('<meta charset="utf-8" />');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1" />'
    );
  });

  it('stamps a generator meta with the theme version by default', () => {
    const html = doc({});
    expect(html).toMatch(/<meta name="generator" content="clean-jsdoc-theme [^"]+" \/>/);
    // generator lives in <head>.
    expect(html.indexOf('name="generator"')).toBeLessThan(html.indexOf('</head>'));
  });

  it('lets an author generator meta replace the theme default (no duplicate)', () => {
    const html = doc({ meta: [{ name: 'generator', content: 'my-tool 1.0.0' }] });
    expect(html).toContain('<meta name="generator" content="my-tool 1.0.0" />');
    expect(html).not.toMatch(/content="clean-jsdoc-theme /);
    expect(html.match(/name="generator"/g)).toHaveLength(1);
  });
});

describe('htmlPathFor', () => {
  it('returns index.html for an empty slug', () => {
    expect(htmlPathFor('')).toBe('index.html');
  });
  it('gives a symbol named "index" its own directory (not the site root)', () => {
    expect(htmlPathFor('index')).toBe('index/index.html');
  });
  it('treats slug as a directory', () => {
    expect(htmlPathFor('guide/intro')).toBe('guide/intro/index.html');
  });
  it('strips leading and trailing slashes', () => {
    expect(htmlPathFor('/foo/bar/')).toBe('foo/bar/index.html');
  });
});

describe('mdPathFor', () => {
  it('co-locates the .md next to the .html (index.html → index.md)', () => {
    expect(mdPathFor('')).toBe('index.md');
    expect(mdPathFor('guide/intro')).toBe('guide/intro/index.md');
    expect(mdPathFor('/foo/bar/')).toBe('foo/bar/index.md');
  });
  it('gives a symbol named "index" its own .md (not the home .md)', () => {
    expect(mdPathFor('index')).toBe('index/index.md');
  });
});

describe('extractExcerpt', () => {
  it('strips frontmatter, headings, and code fences', () => {
    const src = `---
title: x
---

# Hello

\`\`\`js
console.log(1);
\`\`\`

Body paragraph here with **bold** and \`code\`.
`;
    const out = extractExcerpt(src);
    expect(out).not.toContain('---');
    expect(out).not.toContain('console.log');
    expect(out).not.toContain('#');
    expect(out).toContain('Body paragraph here');
  });

  it('caps length and appends an ellipsis', () => {
    const long = 'word '.repeat(200);
    const out = extractExcerpt(long, 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith('…')).toBe(true);
  });

  it('rewrites markdown links to their label', () => {
    const out = extractExcerpt('See [the docs](https://example.com).');
    expect(out).toContain('the docs');
    expect(out).not.toContain('example.com');
  });
});

describe('search text — HTML comments', () => {
  it('drops comments first, so a backtick inside one cannot pair with real code', () => {
    const src = '<!-- it`s -->\n\nSome `code` here.';
    expect(extractExcerpt(src)).toBe('Some here.');
    expect(extractSearchText(src)).toBe('Some code here.');
  });

  it('drops a comment holding `>` whole', () => {
    expect(extractSearchText('Visible <!-- a > b --> text.')).toBe('Visible text.');
  });

  it('keeps a comment shown inside a fenced code block out of the text like any code', () => {
    expect(extractSearchText('Text.\n\n```html\n<!-- x -->\n```\n')).toBe('Text.');
  });

  it('accepts precomputed comment ranges', () => {
    const src = '---\ntitle: x\n---\nVisible <!-- hidden --> text.';
    expect(extractSearchText(src, undefined, pageCommentRanges(src))).toBe('Visible text.');
    expect(extractExcerpt(src, undefined, pageCommentRanges(src))).toBe('Visible text.');
  });

  it('skips the YAML frontmatter when scanning a body itself, as render() does', () => {
    // The `<!--` in the YAML string is YAML: read as a comment, it would run to
    // the `-->` in the body and take the frontmatter's closing `---` with it.
    const src = '---\nnote: |\n  <!-- a\n---\nVisible -->text.\n';
    expect(extractSearchText(src)).toBe(extractSearchText(src, undefined, pageCommentRanges(src)));
    expect(extractSearchText(src)).toContain('Visible');
    expect(extractExcerpt(src)).toContain('Visible');
  });
});

describe('search text — tag strip', () => {
  it('strips a JSX tag whose quoted attribute holds < and > whole', () => {
    const src = '<MemberHeading id="run" sig="run(): Promise<Map<K, V>>" />\n\nRuns it.';
    expect(extractSearchText(src)).toBe('Runs it.');
    expect(extractExcerpt(src)).toBe('Runs it.');
  });

  it('strips plain HTML tags and keeps their text', () => {
    expect(extractSearchText('<p align="center">Hi <b>there</b></p>')).toBe('Hi there');
  });

  it('keeps a generic type in inline code (it is not a tag)', () => {
    // A code span keeps its text verbatim, `>` included (its punctuation is parked).
    expect(extractSearchText('so `Array<Map<string, T>>` becomes <b>x</b>')).toBe(
      'so Array<Map<string, T>> becomes x'
    );
  });

  // The old `/<[^>]+>/` rescanned to the end of the page from every `<` with no
  // `>` after it — minutes for a 1MB page. Each generator takes a size in
  // characters, roughly (see linear-scaling.ts).
  it.each<[string, (n: number) => string]>([
    ['unclosed comment openers', (n) => 'a <!-- '.repeat(n / 7)],
    ['stray < characters', (n) => 'a < b '.repeat(n / 6)],
    ['unclosed quoted attributes', (n) => '<a b="x '.repeat(n / 8)],
    ['unclosed backtick runs', (n) => '`` a\n\n` b\n\n'.repeat(n / 12)],
    // Exercises an escaped `<` waiting for its `>` (#383); its time is mostly
    // other passes, so it cannot tell the old copy from the new one.
    ['escaped generics', (n) => 'Promise\\<User> and `a<b>` x > y\n'.repeat(n / 32)],
  ])(
    'scales linearly on %s',
    (_name, makeInput) => {
      expectLinearScaling(
        (src: string) => [extractSearchText(src), extractExcerpt(src)],
        makeInput
      );
    },
    PERF_TEST_TIMEOUT
  );

  // #383: on these two shapes, a per-character copy of the prose and a
  // many-match `/\s+/g` replace made a page of several million characters far
  // slower than its size. The window is pinned at 512K -> 4M characters, so the
  // large input crosses 2M, and the limit is tighter than the default: the old
  // code measured ratios of about 21-22 here, the fixed code about 2-6.
  // `floorMs` is raised to 25: the fixed code runs the 512K input in a few ms,
  // under the default 10 ms floor, so the check became "t(4M) under 120 ms",
  // which a busy CI runner broke (178 ms). The old code takes 35-50 ms at 512K,
  // above this floor, so its real ratio (~20) still fails the limit.
  it.each<[string, (n: number) => string]>([
    ['stray < characters (#383)', (n) => 'a < b '.repeat(n / 6)],
    ['long whitespace runs (#383)', (n) => ('word' + ' \t\n'.repeat(4)).repeat(n / 16)],
  ])(
    'scales linearly past 2M characters on %s',
    (_name, makeInput) => {
      expectLinearScaling(
        (src: string) => [extractSearchText(src), extractExcerpt(src)],
        makeInput,
        { startSize: 524_288, maxSize: 524_288, maxRatio: 12, floorMs: 25 }
      );
    },
    PERF_TEST_TIMEOUT
  );
});

describe('search text — escaped < and its > (#383)', () => {
  // [source, excerpt, search text]: an escaped `<` parks the next unparked `>`
  // on its line, so the emphasis/blockquote pass leaves it; a newline forgets it.
  it.each<[string, string, string]>([
    ['a \\<b> c > d > e\nf > g', 'a <b> c d e f g', 'a <b> c d e f g'],
    ['\\<\\< a > b > c > d', '<< a > b > c d', '<< a > b > c d'],
    ['\\<a\n> b', '<a b', '<a b'],
    ['`x\\<y>` > \\<T> > >', '<T>', 'x\\<y> <T>'],
    ['a \\<b \u{1F600} > c > d', 'a <b \u{1F600} > c d', 'a <b \u{1F600} > c d'],
  ])('reads %j', (src, excerpt, searchText) => {
    expect(extractExcerpt(src)).toBe(excerpt);
    expect(extractSearchText(src)).toBe(searchText);
  });
});

describe('search text — length caps (#383)', () => {
  // [source, excerpt (max 10), search text (max 10)]
  it.each<[string, string, string]>([
    ['abcd efghi', 'abcd efghi', 'abcd efghi'],
    ['abcd efghij', 'abcd…', 'abcd efghi'],
    ['abcd efgh', 'abcd efgh', 'abcd efgh'],
    ['abcd efghi j', 'abcd…', 'abcd efghi'],
    ['  \n abcd \t  efghi \n ', 'abcd efghi', 'abcd efghi'],
    ['  \n abcd \t  efghij \n ', 'abcd…', 'abcd efghi'],
    ['one two three word   ', 'one two…', 'one two th'],
    ['one two\u2026 word   ', 'one two\u2026\u2026', 'one two\u2026 w'],
  ])('caps %j', (src, excerpt, searchText) => {
    expect(extractExcerpt(src, 10)).toBe(excerpt);
    expect(extractSearchText(src, 10)).toBe(searchText);
  });
});

describe('search text — code spans of any backtick count (#385)', () => {
  // [source, excerpt, search text]: the excerpt drops every code span, the
  // search text unwraps it; an unmatched run is the literal text the page shows.
  it.each<[string, string, string]>([
    ['a `` x`y `` b and `` `tick` `` c', 'a b and c', 'a x`y b and `tick` c'],
    ['one `a` two ``b`` three', 'one two three', 'one a two b three'],
    ['x ` a `` b ` c', 'x c', 'x a `` b c'],
    ['`` a ` b', '`` a ` b', '`` a ` b'],
    ['a \\`not code\\` b', 'a `not code` b', 'a `not code` b'],
    ['a \\\\`code` b', 'a \\ b', 'a \\code b'],
    ['`a\n\nb` c', '`a b` c', '`a b` c'],
    ['so `` a < b `` then <kbd>K</kbd> end', 'so then K end', 'so a < b then K end'],
    ['see `a\nb` here', 'see here', 'see a b here'],
  ])('reads %j', (src, excerpt, searchText) => {
    expect(extractExcerpt(src)).toBe(excerpt);
    expect(extractSearchText(src)).toBe(searchText);
  });

  it('forgets an escaped < once a span carries the text onto the next line', () => {
    // The span's newline ends the line, so the `\<` no longer waits for a `>`:
    // the `>` of `<b>` on the next line is a tag's, and `<b>` is stripped.
    const src = 'a \\<T `x\ny` <b>z</b>';
    expect(extractSearchText(src)).toBe('a <T x y z');
    expect(extractExcerpt(src)).toBe('a <T z');
  });
});

describe('search text — escaped punctuation reads as rendered', () => {
  // setu writes a literal `Promise<User>` as `Promise\<User>` (and `snake_case`
  // as `snake\_case`); the page shows the bare characters, so must the index.
  const body = [
    '<MemberHeading id="f" depth="3" name="f" sig="f()" />',
    '',
    'Resolves to a Promise\\<User> or Array\\<Array\\<string>>, maybe Map\\<K, V>.',
    '',
    'Converts to snake\\_case \\[x] with \\*stars\\*; *emphasis* stays stripped.',
    '',
    '> a quoted line',
  ].join('\n');

  it('extractSearchText keeps literal angle brackets and other escapes, drops JSX/marks', () => {
    const out = extractSearchText(body);
    expect(out).toBe(
      'Resolves to a Promise<User> or Array<Array<string>>, maybe Map<K, V>. ' +
        'Converts to snake_case [x] with *stars*; emphasis stays stripped. a quoted line'
    );
  });

  it('extractExcerpt does the same', () => {
    expect(extractExcerpt(body)).toContain(
      'Resolves to a Promise<User> or Array<Array<string>>, maybe Map<K, V>.'
    );
  });

  it('keeps code spans verbatim, backslashes included', () => {
    expect(extractSearchText('Paths `a\\*b`, `\\\\server`, `C:\\\\` and `snake_case<T>`.')).toBe(
      'Paths a\\*b, \\\\server, C:\\\\ and snake_case<T>.'
    );
  });

  it('leaves private-use characters already in the text alone', () => {
    const pua = String.fromCharCode(0xe03c, 0xe000, 0xe0ff, 0xe1ff);
    expect(extractSearchText(`icon ${pua} and \\<T>`)).toBe(`icon ${pua} and <T>`);
  });

  it('still strips an unescaped tag and a lone `>`', () => {
    expect(extractSearchText('a <kbd>Ctrl</kbd> b > c')).toBe('a Ctrl b c');
  });

  it("doesn't let a `<` in a code span claim a later tag's `>`", () => {
    // Only an escaped `<` pairs with the next `>` on its line.
    expect(extractSearchText('so `a < b` then <kbd>K</kbd> end')).toBe('so a < b then K end');
    expect(extractSearchText('a \\<User> and `x<y` then <b>z</b> end')).toBe(
      'a <User> and x<y then z end'
    );
    expect(extractExcerpt('so `a < b` then <kbd>K</kbd> end')).toBe('so then K end');
  });
});

describe('renderHtmlDocument — locale (i18n)', () => {
  it('defaults to <html lang="en"> with no __i18n payload (byte-identical path)', () => {
    const html = doc({});
    expect(html).toContain('<html lang="en" data-scrollbar="styled">');
    expect(html).not.toContain('__i18n');
  });

  it('sets <html lang> + embeds the __i18n chrome payload when localized', () => {
    const html = doc({
      lang: 'fr',
      i18n: {
        locale: 'fr',
        defaultLocale: 'en',
        messages: { 'chrome.search.placeholder': 'Rechercher…' },
      },
    });
    expect(html).toContain('<html lang="fr" data-scrollbar="styled">');
    expect(html).toContain('__i18n');
    expect(html).toContain('Rechercher');
    expect(html).toContain('"locale":"fr"');
  });
});

describe('renderHtmlDocument — custom JS order (#299)', () => {
  it('runs custom JS after every theme script, files before the inline string (#299)', () => {
    const html = doc({
      customJsLinks: ['/_assets/a.h1.js', '/_assets/b.h2.js'],
      customJs: 'window.x=1',
    });
    const mod = html.lastIndexOf('<script type="module">');
    const a = html.indexOf('<script src="/_assets/a.h1.js">');
    const b = html.indexOf('<script src="/_assets/b.h2.js">');
    const inline = html.indexOf('<script>window.x=1</script>');
    expect(mod).toBeGreaterThanOrEqual(0);
    expect(a).toBeGreaterThan(mod);
    expect(b).toBeGreaterThan(a);
    expect(inline).toBeGreaterThan(b);
    // Nothing runs after the user's code: the page ends with the custom scripts,
    // so every theme script (module loader and classic helpers alike) is above them.
    expect(html.indexOf('<script', inline + 1)).toBe(-1);
    expect(html.slice(inline).endsWith('</script></body></html>')).toBe(true);
  });
});
