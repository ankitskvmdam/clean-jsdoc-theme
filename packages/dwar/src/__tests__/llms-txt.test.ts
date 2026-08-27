import { describe, it, expect } from 'vitest';
import {
  buildLlmsTxt,
  isSourceSlug,
  navSections,
  plainText,
  stripFrontmatter,
  stripLeadingHeading,
} from '../llms-txt';
import { render } from '../index';
import { makeManifest, minimalTheme } from './fixtures';
import type { LlmsTxtConfig, OutputFile, Page, SiteManifest } from '@clean-jsdoc-theme/utils';

const FULL: LlmsTxtConfig = { full: true, api: true };

const asString = (f: OutputFile): string =>
  typeof f.contents === 'string' ? f.contents : new TextDecoder().decode(f.contents);

/** The fixture manifest plus a class page, a source viewer, and the source index. */
function manifestWithApi(): SiteManifest {
  const manifest = makeManifest();
  manifest.pkg = { name: 'my-lib', version: '1.0.0', description: 'A tiny library.' };
  const pages: Page[] = [
    {
      slug: 'Widget',
      frontmatter: { title: 'Widget', kind: 'class', description: 'A widget class.' },
      body: '---\ntitle: Widget\n---\n\n# Widget\n\nWidget body.\n',
      headings: [],
    },
    {
      slug: 'source/src-widget-js',
      frontmatter: { title: 'src/widget.js', kind: 'source', hidden: true },
      body: '',
      headings: [],
    },
    {
      slug: 'source',
      frontmatter: { title: 'Source Files', kind: 'guide' },
      body: '# Source Files\n\n- src/widget.js\n',
      headings: [],
    },
  ];
  manifest.pages.push(...pages);
  // Mirrors the real nav shape: flat top level, section label carried on `group`,
  // menu entries (home, source index, external links) flagged `menu: true`.
  manifest.nav = [
    { label: 'Home', slug: '', menu: true },
    { label: 'GitHub', href: 'https://github.com/x/y', external: true, menu: true },
    { label: 'Source files', slug: 'source', menu: true },
    { label: 'Intro', slug: 'guide/intro', group: 'Guide' },
    { label: 'Widget', slug: 'Widget', group: 'Classes' },
  ];
  return manifest;
}

describe('isSourceSlug', () => {
  it('matches the source index and its viewer pages only', () => {
    expect(isSourceSlug('source')).toBe(true);
    expect(isSourceSlug('source/src-widget-js')).toBe(true);
    expect(isSourceSlug('sources')).toBe(false);
    expect(isSourceSlug('guide/source')).toBe(false);
  });
});

describe('navSections', () => {
  it('buckets flat top-level entries by their `group` label, in first-seen order', () => {
    expect(
      navSections([
        { label: 'Home', slug: '', menu: true },
        { label: 'GitHub', href: 'https://x.com', external: true, menu: true },
        { label: 'UserService', slug: 'module/userservice', group: 'Services' },
        { label: 'Widget', slug: 'Widget', group: 'Classes' },
        { label: 'Gadget', slug: 'Gadget', group: 'Classes' },
      ])
    ).toEqual([
      { label: 'Services', slugs: ['module/userservice'] },
      { label: 'Classes', slugs: ['Widget', 'Gadget'] },
    ]);
  });

  it('flattens nested branches (categories, clubbed parents) into their group', () => {
    expect(
      navSections([
        {
          label: 'Processing',
          group: 'Core',
          children: [{ label: 'Deep', children: [{ label: 'A', slug: 'a' }] }],
        },
        { label: 'base', group: 'Core', children: [{ label: 'index', slug: 'base' }] },
      ])
    ).toEqual([{ label: 'Core', slugs: ['a', 'base'] }]);
  });

  it('skips menu entries and external links entirely', () => {
    expect(
      navSections([
        { label: 'Home', slug: '', menu: true },
        { label: 'Source files', slug: 'source', menu: true },
        { label: 'NPM', href: 'https://npm.im/x', external: true, menu: true },
      ])
    ).toEqual([]);
  });

  it('falls back to the node label when it carries no group', () => {
    expect(navSections([{ label: 'Loose', slug: 'loose' }])).toEqual([
      { label: 'Loose', slugs: ['loose'] },
    ]);
  });
});

describe('plainText', () => {
  it('flattens the {@link} family, preferring the authored label', () => {
    expect(plainText('extends {@link BaseEntity} for X')).toBe('extends BaseEntity for X');
    expect(plainText('see {@link Foo|the docs}')).toBe('see the docs');
    expect(plainText('see {@link Foo the docs}')).toBe('see the docs');
    expect(plainText('{@linkcode Queue} and {@linkplain Job}')).toBe('Queue and Job');
    expect(plainText('{@tutorial getting-started}')).toBe('getting-started');
  });

  it('decodes the HTML entities a comment round-trip leaves behind', () => {
    expect(plainText('one of the few pure &quot;classes&quot;')).toBe(
      'one of the few pure "classes"'
    );
    expect(plainText('a &amp; b &lt;c&gt; d&#39;s')).toBe("a & b <c> d's");
  });

  it('leaves unknown entities and plain prose untouched', () => {
    expect(plainText('100&percnt; plain')).toBe('100&percnt; plain');
    expect(plainText('Just prose.')).toBe('Just prose.');
  });
});

describe('stripFrontmatter / stripLeadingHeading', () => {
  it('removes a leading YAML block and a leading h1', () => {
    expect(stripFrontmatter('---\ntitle: X\n---\n\n# X\n\nBody.\n')).toBe('# X\n\nBody.\n');
    expect(stripLeadingHeading('# X\n\nBody.\n')).toBe('Body.\n');
  });

  it('leaves bodies without frontmatter or a leading h1 untouched', () => {
    expect(stripFrontmatter('# X\n')).toBe('# X\n');
    expect(stripLeadingHeading('Body only.\n')).toBe('Body only.\n');
  });
});

describe('buildLlmsTxt', () => {
  it('returns null for an unusable site URL', () => {
    expect(
      buildLlmsTxt({ manifest: makeManifest(), siteUrl: 'nope', basePath: '/', config: FULL })
    ).toBeNull();
  });

  it('builds the llmstxt.org shape: single h1, blockquote summary, ## sections', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: FULL,
    })!;
    expect(out.llms.split('\n')[0]).toBe('# my-lib');
    expect(out.llms).toContain('> A tiny library.');
    expect(out.llms.match(/^# /gm)).toHaveLength(1);
    expect(out.llms).toContain('## Guide');
    expect(out.llms).toContain('## Classes');
    expect(out.llms).toContain('## Optional');
  });

  it('links each page to its companion .md with an absolute URL + description', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: FULL,
    })!;
    expect(out.llms).toContain(
      '- [Introduction](https://x.com/guide/intro/index.md): A guide intro.'
    );
    expect(out.llms).toContain('- [Widget](https://x.com/Widget/index.md): A widget class.');
  });

  it('excludes source pages (hidden viewers AND the Source Files index)', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: FULL,
    })!;
    expect(out.llms).not.toContain('Source Files');
    expect(out.llms).not.toContain('/source/');
    expect(out.full).not.toContain('Source Files');
  });

  it('skips external menu entries and never lists the home page as an entry', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: FULL,
    })!;
    expect(out.llms).not.toContain('github.com');
    expect(out.llms).not.toContain('](https://x.com/index.md)');
  });

  it('applies basePath exactly once to every URL', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com/docs',
      basePath: '/docs/',
      config: FULL,
    })!;
    expect(out.llms).toContain('https://x.com/docs/guide/intro/index.md');
    expect(out.llms).toContain('https://x.com/docs/llms-full.txt');
    expect(out.llms).not.toContain('/docs/docs/');
  });

  it('api: "index" drops API descriptions and API bodies from llms-full.txt', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: { full: true, api: 'index' },
    })!;
    expect(out.llms).toContain('- [Widget](https://x.com/Widget/index.md)');
    expect(out.llms).not.toContain('A widget class.');
    expect(out.llms).toContain(': A guide intro.');
    expect(out.full).not.toContain('Widget body.');
    expect(out.full).toContain('Hello from the guide.');
  });

  it('api: false omits API pages entirely and drops an emptied section', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: { full: true, api: false },
    })!;
    expect(out.llms).not.toContain('Widget');
    expect(out.llms).not.toContain('## Classes');
  });

  it('full: false emits no llms-full.txt and never advertises it', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: { full: false, api: true },
    })!;
    expect(out.full).toBeUndefined();
    expect(out.llms).not.toContain('llms-full.txt');
  });

  it('llms-full.txt concatenates the home page first, with per-page Source lines', () => {
    const out = buildLlmsTxt({
      manifest: manifestWithApi(),
      siteUrl: 'https://x.com',
      basePath: '/',
      config: FULL,
    })!;
    expect(out.full!).toContain('# my-lib — full documentation');
    expect(out.full!).toContain('Source: https://x.com/');
    expect(out.full!).toContain('Source: https://x.com/guide/intro/');
    expect(out.full!.indexOf('This is the **home** page')).toBeLessThan(
      out.full!.indexOf('Hello from the guide.')
    );
    expect(out.full!).not.toContain('---\ntitle: Widget');
  });

  it('falls back to the site name, then a generic title, when pkg is absent', () => {
    const manifest = manifestWithApi();
    delete manifest.pkg;
    const named = buildLlmsTxt({
      manifest,
      siteUrl: 'https://x.com',
      basePath: '/',
      config: FULL,
      siteName: 'My Site',
    })!;
    expect(named.llms.split('\n')[0]).toBe('# My Site');
    const bare = buildLlmsTxt({ manifest, siteUrl: 'https://x.com', basePath: '/', config: FULL })!;
    expect(bare.llms.split('\n')[0]).toBe('# Documentation');
    expect(bare.llms).not.toContain('> ');
  });
});

describe('render() — llms.txt emission', () => {
  it('emits both files when siteUrl and llmsTxt are set', async () => {
    const result = await render(manifestWithApi(), {
      theme: minimalTheme,
      siteUrl: 'https://x.com',
      llmsTxt: FULL,
    });
    const llms = result.files.find((f) => f.path === 'llms.txt');
    const full = result.files.find((f) => f.path === 'llms-full.txt');
    expect(llms).toBeDefined();
    expect(full).toBeDefined();
    expect(asString(llms!)).toContain('# my-lib');
    expect(asString(llms!)).toContain('](https://x.com/guide/intro/index.md)');
  });

  it('emits nothing without llmsTxt, even with siteUrl (unchanged behavior)', async () => {
    const result = await render(manifestWithApi(), {
      theme: minimalTheme,
      siteUrl: 'https://x.com',
    });
    expect(result.files.find((f) => f.path === 'llms.txt')).toBeUndefined();
    expect(result.files.find((f) => f.path === 'llms-full.txt')).toBeUndefined();
  });

  it('emits nothing when llmsTxt is set but siteUrl is not (dwar stays silent)', async () => {
    const result = await render(manifestWithApi(), { theme: minimalTheme, llmsTxt: FULL });
    expect(result.files.find((f) => f.path === 'llms.txt')).toBeUndefined();
  });

  it('omits llms-full.txt when full is false', async () => {
    const result = await render(manifestWithApi(), {
      theme: minimalTheme,
      siteUrl: 'https://x.com',
      llmsTxt: { full: false, api: true },
    });
    expect(result.files.find((f) => f.path === 'llms.txt')).toBeDefined();
    expect(result.files.find((f) => f.path === 'llms-full.txt')).toBeUndefined();
  });

  it('links the locale-prefixed .md files in a sub-path build', async () => {
    const result = await render(manifestWithApi(), {
      theme: { ...minimalTheme, basePath: '/ja/' },
      siteUrl: 'https://x.com',
      llmsTxt: FULL,
    });
    expect(asString(result.files.find((f) => f.path === 'llms.txt')!)).toContain(
      'https://x.com/ja/guide/intro/index.md'
    );
  });
});
