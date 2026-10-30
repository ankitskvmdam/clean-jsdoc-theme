import { describe, it, expect } from 'vitest';
import type { Page } from '@clean-jsdoc-theme/utils';
import {
  extractExcerpt,
  extractSearchText,
  htmlPathFor,
  mdPathFor,
  renderHtmlDocument,
} from '../html';

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

  // The old `/<[^>]+>/` rescanned to the end of the page from every `<` with no
  // `>` after it — minutes for a 1MB page.
  it.each([
    ['unclosed comment openers', 'a <!-- '.repeat(150_000)],
    ['stray < characters', 'a < b '.repeat(170_000)],
    ['unclosed quoted attributes', '<a b="x '.repeat(125_000)],
  ])('stays fast on 1MB of %s', (_name, src) => {
    const t = performance.now();
    extractSearchText(src);
    extractExcerpt(src);
    expect(performance.now() - t).toBeLessThan(1000);
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
