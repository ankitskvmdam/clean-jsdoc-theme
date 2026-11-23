/**
 * #360: setu passes inline HTML with no Markdown form (`<sub>`, `<sup>`,
 * `<abbr>`, …) through as lowercase JSX, and ends a JSX-only paragraph with a
 * U+2060 guard. The page renders that HTML as is, and the search text and
 * excerpt join the element's text to its neighbours instead of spacing it out.
 */
import { describe, it, expect } from 'vitest';
import type { OutputFile } from '@clean-jsdoc-theme/utils';
import { extractExcerpt, extractSearchText } from '../html';
import { render } from '../index';
import { makeManifest, minimalTheme } from './fixtures';

const GUARD = '\u2060';

function asString(file: OutputFile): string {
  return typeof file.contents === 'string'
    ? file.contents
    : new TextDecoder().decode(file.contents);
}

describe('search text and excerpt join inline HTML text (#360)', () => {
  it.each([
    ['Water is H<sub>2</sub>O and mc<sup>2</sup>, ok', 'Water is H2O and mc2, ok'],
    ['[H<sub>2</sub>O](https://x.y) is wet', 'H2O is wet'],
    ['<abbr title="a > b">x</abbr>y', 'xy'],
    ['<span lang="fr">oui</span>!', 'oui!'],
    [`<mark>a</mark> <sub>b</sub>${GUARD}`, 'a b'],
  ])('%j', (src, want) => {
    expect(extractSearchText(src)).toBe(want);
    expect(extractExcerpt(src)).toBe(want);
  });

  it('still spaces out other tags', () => {
    expect(extractSearchText('Press<kbd>K</kbd>now')).toBe('Press K now');
    expect(extractSearchText('a<Callout type="tip">b</Callout>c')).toBe('a b c');
  });

  it('does not mistake a longer tag name for an allow-listed one', () => {
    expect(extractSearchText('a<subtitle>b</subtitle>c')).toBe('a b c');
  });
});

describe('render() — inline HTML passthrough (#360)', () => {
  it('renders the elements, keeps them in the .md, and searches their text', async () => {
    const manifest = makeManifest();
    manifest.pages.push({
      slug: 'chem',
      frontmatter: { title: 'Chem', kind: 'module', description: 'Water is H2O.' },
      body: [
        '# Chem',
        '',
        'Water is H<sub>2</sub>O and <abbr title="Hyper {Text} &#x22;ML&#x22;">HTML</abbr>.',
        '',
        `<mark>a</mark> <sub>b</sub>${GUARD}`,
        '',
      ].join('\n'),
    });
    const result = await render(manifest, { theme: minimalTheme });
    expect(result.errors?.some((e) => e.slug === 'chem')).toBeFalsy();
    expect(result.warnings?.some((w) => w.slug === 'chem')).toBeFalsy();

    const html = asString(result.files.find((f) => f.path === 'chem/index.html')!);
    expect(html).toContain(
      'Water is H<sub>2</sub>O and <abbr title="Hyper {Text} &quot;ML&quot;">'
    );
    expect(html).toContain('<p class="my-3 leading-relaxed"><mark>a</mark> <sub>b</sub>');

    const md = asString(result.files.find((f) => f.path === 'chem/index.md')!);
    expect(md).toContain('Water is H<sub>2</sub>O');

    const entry = result.search?.find((s) => s.slug === 'chem');
    expect(entry?.content).toContain('Water is H2O and HTML.');
    expect(entry?.content).not.toContain(GUARD);
  });
});

describe('render() — <details> from setu (#360)', () => {
  it('renders a collapsible block with its summary first', async () => {
    const manifest = makeManifest();
    manifest.pages.push({
      slug: 'more',
      frontmatter: { title: 'More', kind: 'module', description: 'More.' },
      body: [
        '# More',
        '',
        '<details open>',
        '  <summary>More <sub>x</sub></summary>',
        '',
        '  Body',
        '',
        '  ```js',
        '  const a = 1;',
        '  ```',
        '</details>',
        '',
      ].join('\n'),
    });
    const result = await render(manifest, { theme: minimalTheme });
    expect(result.errors?.some((e) => e.slug === 'more')).toBeFalsy();
    expect(result.warnings?.some((w) => w.slug === 'more')).toBeFalsy();
    const html = asString(result.files.find((f) => f.path === 'more/index.html')!);
    expect(html).toContain(
      '<details open><summary>More <sub>x</sub></summary><p class="my-3 leading-relaxed">Body</p>'
    );
    expect(html).toMatch(/<pre[^>]*>[\s\S]*const[\s\S]*<\/pre><\/div><\/details>/);
  });
});
