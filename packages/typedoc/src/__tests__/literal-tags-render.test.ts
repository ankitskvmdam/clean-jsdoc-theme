/**
 * End to end, setu → dwar: prose holding literal angle-bracket words must
 * compile, wherever setu's HTML normalization leaves it. A fragment that is only
 * inline content (a `<step>` item with no `<p>`, Markdown text after a dropped
 * comment) used to reach MDX as bare text with an unescaped `Promise<User>`,
 * which MDX read as an unclosed tag and the page was skipped.
 */
import { describe, expect, it } from 'vitest';
import salty from '@jsdoc/salty';
import { buildDocPages, generateSite } from '@clean-jsdoc-theme/setu';
import { render } from '@clean-jsdoc-theme/dwar';
import type { OutputFile, SiteManifest, ThemeConfig } from '@clean-jsdoc-theme/utils';

const theme: ThemeConfig = {
  basePath: '/',
  tokens: {
    colors: {
      bg: '#ffffff',
      bgMuted: '#f3f4f6',
      fg: '#111827',
      fgMuted: '#6b7280',
      accent: '#2563eb',
      accentFg: '#ffffff',
      border: '#e5e7eb',
    },
    fonts: { heading: 'serif', body: 'sans-serif', mono: 'monospace' },
    shiki: { light: 'github-light', dark: 'github-dark' },
    siteName: 'Test',
  },
};

const asString = (file: OutputFile): string =>
  typeof file.contents === 'string' ? file.contents : new TextDecoder().decode(file.contents);

/** Render `manifest`; return the page's HTML and its render error, if any. */
async function renderPage(manifest: SiteManifest, slug: string) {
  const result = await render(manifest, { theme });
  const err = result.errors?.find((e) => e.slug === slug);
  const file = result.files.find((f) => f.path === `${slug}/index.html`);
  return { err, html: file ? asString(file) : undefined };
}

/** A module page whose description is the JSDoc HTML `description`. */
const modulePage = (description: string): SiteManifest =>
  generateSite(
    salty.taffy([{ kind: 'module', name: 'm', longname: 'module:m', scope: 'global', description }])
  );

/** A Markdown docs page with body `md`. */
function docPage(md: string): SiteManifest {
  const site = modulePage('<p>x</p>');
  const { pages, nav } = buildDocPages([{ path: 'guide', content: md, type: 'markdown' }]);
  site.pages.push(...pages);
  site.nav.push(...nav);
  return site;
}

describe('literal angle-bracket words in inline-only fragments render', () => {
  it.each([
    [
      'a <step> item',
      '<steps><step label="A">Returns Promise<User></step></steps>',
      'Promise&lt;User>',
    ],
    ['a <tab> item', '<tabs><tab label="A">Map<K> here</tab></tabs>', 'Map&lt;K> here'],
  ])('%s with no <p>', async (_name, description, shown) => {
    const { err, html } = await renderPage(modulePage(description), 'module/m');
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain(shown);
  });

  it.each([
    [
      'text after a comment',
      '<!-- prettier-ignore --> Returns Promise<User> here',
      'Promise&lt;User> here',
    ],
    ['inline HTML after a comment', '<!-- x --> plain a <b>bold</b> Array<Foo>', 'Array&lt;Foo>'],
    ['an unterminated comment', '<!-- badge\n\nPromise<User> after', 'Promise&lt;User> after'],
  ])('Markdown: %s', async (_name, md, shown) => {
    const site = docPage(md);
    const slug = site.pages.find((p) => p.slug.endsWith('guide'))!.slug;
    const { err, html } = await renderPage(site, slug);
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain(shown);
  });
});
