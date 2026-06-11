import { describe, it, expect } from 'vitest';
import type { Page } from '@clean-jsdoc-theme/utils';
import { extractExcerpt, htmlPathFor, mdPathFor, renderHtmlDocument } from '../html';

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

describe('htmlPathFor', () => {
  it('returns index.html for an empty slug', () => {
    expect(htmlPathFor('')).toBe('index.html');
  });
  it('returns index.html for the literal "index" slug', () => {
    expect(htmlPathFor('index')).toBe('index.html');
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
