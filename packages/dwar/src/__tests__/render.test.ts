import { describe, it, expect } from 'vitest';
import { render, codeFrame } from '../index';
import { makeManifest, minimalTheme } from './fixtures';
import type { OutputFile, SiteManifest } from '@clean-jsdoc-theme/utils';

function asString(file: OutputFile): string {
  return typeof file.contents === 'string'
    ? file.contents
    : new TextDecoder().decode(file.contents);
}

describe('render() — smoke', () => {
  it('emits an HTML file per page', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('index.html');
    expect(paths).toContain('guide/intro/index.html');
  });

  it('emits a verbatim .md companion alongside each page HTML', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('index.md');
    expect(paths).toContain('guide/intro/index.md');

    // The .md is the page's MDX body written verbatim — no transformation.
    for (const page of manifest.pages) {
      const mdPath = (page.slug ? `${page.slug}/` : '') + 'index.md';
      const md = result.files.find((f) => f.path === mdPath)!;
      expect(asString(md)).toBe(page.body);
    }

    // The companion .md does not count as a page.
    expect(result.stats.pageCount).toBe(2);
  });

  it('renders the page title into HTML', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const home = result.files.find((f) => f.path === 'index.html')!;
    const html = asString(home);
    // siteName from tokens takes precedence over pkg.name.
    expect(html).toContain('<title>Home | Test Site</title>');
    // MDX body rendered:
    expect(html).toContain('Welcome');
    expect(html).toContain('home');
  });

  it('emits a sidebar island marker on each page', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    for (const path of ['index.html', 'guide/intro/index.html']) {
      const html = asString(result.files.find((f) => f.path === path)!);
      expect(html).toContain('data-island="sidebar"');
      expect(html).toMatch(/data-island-id="i\d+"/);
    }
  });

  it('mounts the copy-page island with the page md url on content pages', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain('data-island="copy-page"');
    // Its props payload carries the companion .md url for this page.
    expect(home).toContain('/index.md');
    const guide = asString(result.files.find((f) => f.path === 'guide/intro/index.html')!);
    expect(guide).toContain('guide/intro/index.md');
  });

  // The default Footer's footer-specific class signature (the pager reuses
  // `border-t border-(--clean-border)`, so we key off the footer-only classes).
  const DEFAULT_FOOTER_SIG = 'py-6 text-sm text-muted-foreground';

  it('renders the default footer when no theme.footer is set', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain(DEFAULT_FOOTER_SIG);
  });

  it('renders the custom footer in place of the default when theme.footer is set', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, {
      theme: { ...minimalTheme, footer: '<div class="my-footer">Custom Footer XYZ</div>' },
    });
    for (const path of ['index.html', 'guide/intro/index.html']) {
      const html = asString(result.files.find((f) => f.path === path)!);
      // Author markup is present verbatim on every page...
      expect(html).toContain('<div class="my-footer">Custom Footer XYZ</div>');
      // ...and the default footer chrome is gone.
      expect(html).not.toContain(DEFAULT_FOOTER_SIG);
    }
  });

  it('emits custom theme.meta tags into every page head (render stays in-memory)', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, {
      theme: {
        ...minimalTheme,
        meta: [
          { name: 'keywords', content: 'a, b' },
          { property: 'og:image', content: 'https://example.com/c.png' },
        ],
      },
    });
    for (const path of ['index.html', 'guide/intro/index.html']) {
      const html = asString(result.files.find((f) => f.path === path)!);
      expect(html).toContain('<meta name="keywords" content="a, b" />');
      expect(html).toContain('<meta property="og:image" content="https://example.com/c.png" />');
    }
  });

  it('omits the copy-page button when disabled in the theme', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, {
      theme: { ...minimalTheme, copyPage: { enabled: false } },
    });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).not.toContain('data-island="copy-page"');
  });

  it('omits the copy-page button on the source section', async () => {
    const manifest = makeManifest();
    manifest.pages = [
      ...manifest.pages,
      {
        slug: 'source',
        frontmatter: { title: 'Source Files', kind: 'guide' },
        body: '# Source Files\n\n- a\n- b\n',
        headings: [],
      },
    ];
    const result = await render(manifest, { theme: minimalTheme });
    const sourceIndex = asString(result.files.find((f) => f.path === 'source/index.html')!);
    expect(sourceIndex).not.toContain('data-island="copy-page"');
    // A normal content page still has it.
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain('data-island="copy-page"');
  });

  it('renders the prev/next pager linking adjacent pages in reading order', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    // Reading order from the nav: '' (Home) → 'guide/intro' (Introduction).
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain('aria-label="Pagination"');
    // Home is first: only a "Next" card pointing at the guide.
    expect(home).toContain('href="/guide/intro"');
    expect(home).toContain('Introduction');
    expect(home).toContain('Next');
    expect(home).not.toContain('Previous');

    const guide = asString(result.files.find((f) => f.path === 'guide/intro/index.html')!);
    expect(guide).toContain('aria-label="Pagination"');
    // The guide is last: only a "Previous" card pointing back at Home.
    expect(guide).toContain('href="/"');
    expect(guide).toContain('Previous');
    expect(guide).not.toContain('Next');
  });

  it('includes Home but not the Source Files index or external links in menu-mode reading order', async () => {
    const manifest = makeManifest();
    // Menu mode: Home and external links are `menu` entries; add a Source Files
    // index page + nav node. Expected reading order: '' (Home) → 'guide/intro'.
    manifest.pages = [
      ...manifest.pages,
      {
        slug: 'source',
        frontmatter: { title: 'Source Files', kind: 'guide' },
        body: '# Source Files\n\n- a\n- b\n',
        headings: [],
      },
    ];
    manifest.nav = [
      { label: 'Home', slug: '', menu: true },
      { label: 'GitHub', href: 'https://github.com/x/y', menu: true },
      { label: 'Source Files', slug: 'source', menu: true },
      { label: 'Guide', children: [{ label: 'Intro', slug: 'guide/intro' }] },
    ];
    const result = await render(manifest, { theme: minimalTheme });

    // Home (a menu entry) is the start of the reading flow → only a Next card.
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain('aria-label="Pagination"');
    expect(home).toContain('href="/guide/intro"');
    expect(home).toContain('Next');
    expect(home).not.toContain('Previous');

    // The guide is the last content page (Source Files is excluded) → only a
    // Previous card, pointing back at Home, and no Next.
    const guide = asString(result.files.find((f) => f.path === 'guide/intro/index.html')!);
    expect(guide).toContain('aria-label="Pagination"');
    expect(guide).toContain('href="/"');
    expect(guide).toContain('Previous');
    expect(guide).not.toContain('Next');

    // The Source Files index is out of the reading order → no pager at all.
    const source = asString(result.files.find((f) => f.path === 'source/index.html')!);
    expect(source).not.toContain('aria-label="Pagination"');
  });

  it('omits the prev/next pager when disabled in the theme', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, {
      theme: { ...minimalTheme, pageNav: { enabled: false } },
    });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).not.toContain('aria-label="Pagination"');
  });

  it('omits the prev/next pager on source-viewer pages', async () => {
    const manifest = makeManifest();
    manifest.pages = [
      ...manifest.pages,
      {
        slug: 'source/lib/queue-js',
        frontmatter: { title: 'queue.js', kind: 'source', hidden: true },
        body: '',
        source: { code: 'export const x = 1;\n', language: 'js', filename: 'queue.js' },
      },
    ];
    const result = await render(manifest, { theme: minimalTheme });
    const sourcePage = asString(
      result.files.find((f) => f.path === 'source/lib/queue-js/index.html')!
    );
    expect(sourcePage).not.toContain('aria-label="Pagination"');
  });

  it('links the buildId-suffixed stylesheet', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain(`href="/_assets/styles.${manifest.buildId}.css"`);
  });

  it('inlines the pre-hydration theme script', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain(`localStorage.getItem('theme')`);
    // No system mode: a stored 'dark' applies dark, everything else defaults to light.
    expect(home).toContain(`d.dataset.theme='dark'`);
    expect(home).toContain(`d.dataset.theme='light'`);
  });

  it('emits a non-empty chunk for each island', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    // Chunk filenames are now content-hashed (`<name>-<hash>.js`).
    const names = [
      'sidebar',
      'mobile-nav',
      'toc',
      'toc-mobile',
      'cmdk',
      'code-tabs',
      'copy-btn',
      'copy-page',
      'theme-toggle',
      'settings',
      'code-viewer',
      'embed',
      'tabs',
    ];
    for (const name of names) {
      const re = new RegExp(`^_islands/${name}-[A-Za-z0-9]+\\.js$`);
      const chunk = result.files.find((f) => re.test(f.path));
      expect(chunk, `missing chunk for ${name}`).toBeDefined();
      expect(asString(chunk!).length).toBeGreaterThan(0);
    }
  });

  it('compiles an <Embed> in MDX into a surviving data-island="embed" marker', async () => {
    const manifest = makeManifest();
    // setu emits iframe embeds as a self-closing <Embed …/> in the MDX body.
    manifest.pages = [
      ...manifest.pages,
      {
        slug: 'embed-page',
        frontmatter: { title: 'Embed Page', kind: 'guide' },
        body: '# Embed Page\n\n<Embed src="https://example.com/widget" title="Live demo" height="500" />\n',
        headings: [],
      },
    ];
    const result = await render(manifest, { theme: minimalTheme });

    // The marker survives the MDX compile, with its data-* config channel.
    const html = asString(result.files.find((f) => f.path === 'embed-page/index.html')!);
    expect(html).toContain('data-island="embed"');
    expect(html).toContain('data-src="https://example.com/widget"');
    expect(html).toContain('data-title="Live demo"');
    expect(html).toContain('<iframe');

    // The page's loader references the (hashed) embed chunk, and it is emitted.
    expect(html).toMatch(/\/_islands\/embed-[A-Za-z0-9]+\.js/);
    const chunk = result.files.find((f) => /^_islands\/embed-[A-Za-z0-9]+\.js$/.test(f.path));
    expect(chunk, 'missing hashed embed chunk').toBeDefined();
    expect(asString(chunk!).length).toBeGreaterThan(0);
  });

  it('renders <Steps> as a numbered stepper and <Tabs> as an enhanced tabs island', async () => {
    const manifest = makeManifest();
    manifest.pages = [
      ...manifest.pages,
      {
        slug: 'components-page',
        frontmatter: { title: 'Components Page', kind: 'guide' },
        body: [
          '# Demo',
          '',
          '<Steps>',
          '<Step label="Install">',
          'Run the installer.',
          '</Step>',
          '<Step label="Configure">',
          'Edit the config.',
          '</Step>',
          '</Steps>',
          '',
          '<Tabs>',
          '<Tab label="npm">',
          'npm content here.',
          '</Tab>',
          '<Tab label="pnpm">',
          'pnpm content here.',
          '</Tab>',
          '</Tabs>',
          '',
        ].join('\n'),
        headings: [],
      },
    ];
    const result = await render(manifest, { theme: minimalTheme });
    const html = asString(result.files.find((f) => f.path === 'components-page/index.html')!);

    // Steps: labels, the 1/2 numbers, and the body text.
    expect(html).toContain('Install');
    expect(html).toContain('Configure');
    expect(html).toContain('>1<');
    expect(html).toContain('>2<');
    expect(html).toContain('Run the installer.');
    expect(html).toContain('Edit the config.');

    // Tabs: the island marker + ARIA roles, both labels, and content.
    expect(html).toContain('data-island="tabs"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('npm content here.');
    expect(html).toContain('pnpm content here.');
    // First panel visible, the rest hidden (exactly one `hidden` panel here).
    expect(html).toMatch(/role="tabpanel"[^>]*\shidden/);

    // Tab button ids are unique on the page (no id appears twice).
    const tabIds = [...html.matchAll(/id="(tabs-\d+-tab-\d+)"/g)].map((m) => m[1]);
    expect(tabIds.length).toBeGreaterThanOrEqual(2);
    expect(new Set(tabIds).size).toBe(tabIds.length);

    // The page references the (hashed) tabs chunk, and it is emitted non-empty.
    expect(html).toMatch(/\/_islands\/tabs-[A-Za-z0-9]+\.js/);
    const chunk = result.files.find((f) => /^_islands\/tabs-[A-Za-z0-9]+\.js$/.test(f.path));
    expect(chunk, 'missing hashed tabs chunk').toBeDefined();
    expect(asString(chunk!).length).toBeGreaterThan(0);
  });

  it('renders a <Callout type="tip"> in a neutral container with a green lucide icon', async () => {
    const manifest = makeManifest();
    manifest.pages = [
      ...manifest.pages,
      {
        slug: 'tip-page',
        frontmatter: { title: 'Tip Page', kind: 'guide' },
        body: '# Tip Page\n\n<Callout type="tip">\nPro tip here.\n</Callout>\n',
        headings: [],
      },
    ];
    const result = await render(manifest, { theme: minimalTheme });
    const html = asString(result.files.find((f) => f.path === 'tip-page/index.html')!);
    // Rendered as a callout (role="note") in the neutral rounded container …
    expect(html).toContain('role="note"');
    expect(html).toContain('rounded-2xl');
    expect(html).toContain('bg-neutral-50');
    // … the green-tinted lucide lightbulb icon (its class is unique to the tip
    // variant; the green is now on the icon, not the container) …
    expect(html).toContain('lucide-lightbulb');
    expect(html).toContain('text-green-600');
    // … and the body text intact.
    expect(html).toContain('Pro tip here.');
  });

  it('emits a CSS file with theme variables on :root', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const css = result.files.find(
      (f) => f.path.startsWith('_assets/styles.') && f.path.endsWith('.css')
    );
    expect(css).toBeDefined();
    const text = asString(css!);
    expect(text).toContain(':root');
    expect(text).toContain('--clean-bg:#ffffff;');
    expect(text).toContain('--clean-fg:#111827;');
  });

  it('produces a search entry per non-hidden page', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    expect(result.search).toBeDefined();
    expect(result.search!.length).toBe(2);
    const titles = result.search!.map((s) => s.title).sort();
    expect(titles).toEqual(['Home', 'Introduction']);
    for (const entry of result.search!) {
      expect(entry.excerpt).toBeTruthy();
      expect(entry.excerpt!.length).toBeLessThanOrEqual(201);
      // Description + full content are indexed for matching (not just the title).
      expect(entry.description).toBeTruthy();
      expect(entry.content).toBeTruthy();
    }
  });

  it('indexes full page content with identifiers preserved', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const home = result.search!.find((s) => s.slug === '')!;
    // `inline code` is unwrapped (kept), not stripped as it is from the excerpt.
    expect(home.content).toContain('inline code');
    expect(home.content).toContain('home page');
  });

  it('emits member deep-link entries (H3+ headings) into the search-index JSON', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const indexFile = result.files.find((f) => f.path.startsWith('_assets/search-index.'))!;
    const entries = JSON.parse(asString(indexFile)) as Array<{
      slug: string;
      title: string;
      context?: string;
    }>;
    const member = entries.find((e) => e.slug === 'guide/intro#dostuff');
    expect(member).toBeDefined();
    expect(member!.title).toBe('doStuff');
    expect(member!.context).toBe('Introduction');
    // The H2 section header is NOT indexed as a member (only H3+).
    expect(entries.some((e) => e.slug === 'guide/intro#section')).toBe(false);
    // The JSON index = page entries + member entries (2 pages + 1 member).
    expect(entries.length).toBe(3);
  });

  it('populates the stats block', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    expect(result.stats.pageCount).toBe(2);
    expect(result.stats.assetCount).toBeGreaterThanOrEqual(9); // 1 css + 8 islands
    expect(result.stats.cssBytes).toBeGreaterThan(0);
    expect(result.stats.jsBytes).toBeGreaterThan(0);
    expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('render() — pre-hydration ordering', () => {
  it('places the inline theme script before the stylesheet link', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    const scriptIdx = home.indexOf(`localStorage.getItem('theme')`);
    const linkIdx = home.indexOf('<link rel="stylesheet"');
    expect(scriptIdx).toBeGreaterThanOrEqual(0);
    expect(linkIdx).toBeGreaterThanOrEqual(0);
    expect(scriptIdx).toBeLessThan(linkIdx);
  });
});

describe('render() — island loader + payload', () => {
  it('references every island chunk path from the loader', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    for (const name of [
      'sidebar',
      'toc',
      'cmdk',
      'code-tabs',
      'copy-btn',
      'theme-toggle',
      'settings',
    ]) {
      expect(home).toMatch(new RegExp(`/_islands/${name}-[A-Za-z0-9]+\\.js`));
    }
  });

  it('emits a data-island-props JSON payload on each page', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toMatch(/<script type="application\/json" data-island-props>\{.*\}<\/script>/u);
  });
});

describe('render() — frontmatter handling', () => {
  it('strips setu-emitted YAML frontmatter from the rendered body', async () => {
    const manifest = makeManifest();
    manifest.pages[0].body = `---\ntitle: Home\nkind: class\nlongname: Home\n---\n\n# Welcome\n\nReal body content.\n`;
    const result = await render(manifest, { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);

    // The real body still renders.
    expect(home).toContain('Welcome');
    expect(home).toContain('Real body content.');

    // The YAML key lines do not leak into the rendered HTML body.
    const bodyMatch = home.match(/<body[^>]*>([\s\S]*)<\/body>/u);
    expect(bodyMatch).not.toBeNull();
    const body = bodyMatch![1];
    expect(body).not.toMatch(/\bkind:\s*class\b/);
    expect(body).not.toMatch(/\blongname:\s*Home\b/);
  });
});

describe('render() — CSS variable mapping', () => {
  it('maps token colors to --clean-* custom properties', async () => {
    const customTheme = {
      ...minimalTheme,
      tokens: {
        ...minimalTheme.tokens,
        colors: {
          ...minimalTheme.tokens.colors,
          bg: '#ff00ff',
          accent: '#abcdef',
        },
      },
    };
    const result = await render(makeManifest(), { theme: customTheme });
    const css = asString(
      result.files.find((f) => f.path.startsWith('_assets/styles.') && f.path.endsWith('.css'))!
    );
    expect(css).toContain('--clean-bg:#ff00ff;');
    expect(css).toContain('--clean-accent:#abcdef;');
  });
});

describe('render() — localization (language switcher + chrome locale)', () => {
  const twoLocales = {
    code: 'fr',
    defaultLocale: 'en',
    messages: {},
    siteBasePath: '/',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Français' },
    ],
  };

  it('localized build: <html lang>, __i18n payload, and a language-switcher island', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme, locale: twoLocales });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain('<html lang="fr" data-scrollbar="styled">');
    expect(home).toContain('__i18n');
    expect(home).toContain('data-island="language-switcher"');
    // The switcher offers the OTHER locale (en) linking to the default home '/'.
    expect(home).toContain('"current":"fr"');
    expect(home).toContain('"code":"en"');
    // The switcher chunk is bundled only for the localized build.
    expect(result.files.some((f) => /_islands\/language-switcher-.*\.js$/.test(f.path))).toBe(true);
  });

  it('emits hreflang alternates (+ x-default → the default locale)', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme, locale: twoLocales });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain('<link rel="alternate" hreflang="en" href="/"');
    expect(home).toContain('<link rel="alternate" hreflang="fr" href="/fr"');
    expect(home).toContain('hreflang="x-default" href="/"');
  });

  it('a single locale mounts no switcher (renders nothing extra)', async () => {
    const result = await render(makeManifest(), {
      theme: minimalTheme,
      locale: { ...twoLocales, locales: [{ code: 'fr', label: 'Français' }] },
    });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).not.toContain('data-island="language-switcher"');
    expect(result.files.some((f) => /language-switcher/.test(f.path))).toBe(false);
  });

  it('no locale → byte-identical chrome path (lang=en, no __i18n, no switcher)', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toContain('<html lang="en" data-scrollbar="styled">');
    expect(home).not.toContain('__i18n');
    expect(home).not.toContain('language-switcher');
  });
});

describe('render() — header controls visibility (mobile + desktop)', () => {
  const twoLocales = {
    code: 'fr',
    defaultLocale: 'en',
    messages: {},
    siteBasePath: '/',
    locales: [
      { code: 'en', label: 'English' },
      { code: 'fr', label: 'Français' },
    ],
  };

  /**
   * The class string of the `<div>` that directly wraps a given island marker,
   * or `null` when the marker is emitted with no wrapping div. The desktop-only
   * controls live behind a `hidden … md:flex` wrapper; the always-visible ones
   * do not.
   */
  function wrapperClassFor(html: string, island: string): string | null {
    const m = html.match(new RegExp(`<div class="([^"]*)">\\s*<div data-island="${island}"`, 'u'));
    return m ? m[1] : null;
  }

  it('keeps the search (cmdk) trigger visible on all breakpoints, not desktop-only', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);

    const searchWrapper = wrapperClassFor(home, 'cmdk');
    expect(searchWrapper).not.toBeNull();
    // Visible at every breakpoint: a plain flex container, never gated by `hidden`.
    expect(searchWrapper).toContain('flex');
    expect(searchWrapper).not.toContain('hidden');
    expect(searchWrapper).not.toContain('md:flex');

    // Regression guard: theme + settings stay desktop-only (they live in the
    // mobile nav drawer), so the search fix didn't accidentally expose them.
    expect(wrapperClassFor(home, 'theme-toggle')).toBe('hidden items-center gap-1 md:flex');
  });

  it('keeps the language switcher visible on all breakpoints, not desktop-only', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme, locale: twoLocales });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);

    expect(home).toContain('data-island="language-switcher"');
    // The switcher is emitted with no wrapping div, so it is never gated by a
    // `hidden`/`md:flex` desktop-only wrapper.
    expect(wrapperClassFor(home, 'language-switcher')).toBeNull();
    // And search remains visible alongside it on every breakpoint.
    expect(wrapperClassFor(home, 'cmdk')).not.toContain('hidden');
  });
});

describe('codeFrame', () => {
  const body = ['line one', 'line two', 'line three', 'line four', 'line five'].join('\n');

  it('emits a numbered gutter around the target line', () => {
    const frame = codeFrame(body, 3);
    expect(frame).toContain('1 | line one');
    expect(frame).toContain('3 | line three');
    expect(frame).toContain('5 | line five');
  });

  it('clamps the context window at the start of the file', () => {
    const frame = codeFrame(body, 1).split('\n');
    // No line 0; the window starts at line 1 and extends `context` lines down.
    expect(frame[0]).toBe('1 | line one');
    expect(frame.some((l) => l.startsWith('3 |'))).toBe(true);
    expect(frame.some((l) => l.startsWith('4 |'))).toBe(false);
  });

  it('clamps the context window at the end of the file', () => {
    const frame = codeFrame(body, 5).split('\n');
    expect(frame.some((l) => l.startsWith('2 |'))).toBe(false);
    expect(frame[frame.length - 1]).toBe('5 | line five');
  });

  it('aligns a caret under the column when given', () => {
    const frame = codeFrame(body, 3, 6).split('\n');
    const targetIdx = frame.findIndex((l) => l.startsWith('3 |'));
    const caretRow = frame[targetIdx + 1];
    // Gutter width is 1 here ("5"), so the caret row is `" | " + (col-1) spaces + ^`.
    expect(caretRow).toBe('  | ' + ' '.repeat(5) + '^');
  });

  it('omits the caret row when no column is given', () => {
    const frame = codeFrame(body, 3).split('\n');
    expect(frame.every((l) => !l.includes('^'))).toBe(true);
  });

  it('widens the gutter for multi-digit line numbers', () => {
    const long = Array.from({ length: 12 }, (_, i) => `row ${i + 1}`).join('\n');
    const frame = codeFrame(long, 10).split('\n');
    // End line is 12 (two digits), so single-digit numbers are right-padded.
    expect(frame).toContain(' 8 | row 8');
    expect(frame).toContain('12 | row 12');
  });
});

describe('render() — issue #333: index name clash', () => {
  function manifestWithIndexSymbol(): SiteManifest {
    const m = makeManifest();
    m.pages.push({
      slug: 'index',
      frontmatter: { title: 'index', kind: 'class', description: 'A class named index.' },
      body: `# index\n\nA documented symbol literally named index.\n`,
      headings: [],
    });
    m.nav.push({ label: 'index', slug: 'index' });
    return m;
  }

  it('emits distinct paths for the home page and an "index"-named symbol', async () => {
    const result = await render(manifestWithIndexSymbol(), { theme: minimalTheme });
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('index.html'); // home
    expect(paths).toContain('index/index.html'); // the symbol
    // The companion .md files follow the same split.
    expect(paths).toContain('index.md');
    expect(paths).toContain('index/index.md');
  });

  it('does not let the "index" symbol overwrite the home page', async () => {
    const result = await render(manifestWithIndexSymbol(), { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    const symbol = asString(result.files.find((f) => f.path === 'index/index.html')!);
    expect(home).toContain('home');
    expect(home).not.toContain('A documented symbol literally named index');
    expect(symbol).toContain('A documented symbol literally named index');
  });
});

// issue #347: a doc-comment description whose first word is lowercase `import`
// (or `export`) lands at column 0 of a flow line in the MDX body. MDX's ESM
// construct claims any such line as an ES module statement, acorn rejects the
// prose ("Could not parse import/exports with acorn"), and the whole page — with
// every member on it — is skipped. The reporter's workaround was capitalizing
// the word; the theme must render the sentence as prose whatever word it starts
// with, exactly as v4 and JSDoc's default template do.
describe('render() — issue #347: prose line starting with import/export', () => {
  const IMPORT_SENTENCE = 'import these functions to your own project.';
  const EXPORT_SENTENCE = 'export the result when you are done.';

  /** The shape setu emits for a `@module` page whose description is `sentence`. */
  function modulePageBody(name: string, sentence: string): string {
    return [
      '---',
      `title: ${name}`,
      'kind: module',
      `longname: module:${name}`,
      `description: ${sentence}`,
      '---',
      '',
      `# ${name}`,
      '',
      `<SourceLink href="/source/main-js/#L5" label="main.js:5" />`,
      '',
      sentence,
      '',
    ].join('\n');
  }

  function manifestWith(slug: string, body: string): SiteManifest {
    const m = makeManifest();
    m.pages.push({
      slug,
      frontmatter: { title: slug, kind: 'module', description: 'A page.' },
      body,
      headings: [],
    });
    m.nav.push({ label: slug, slug });
    return m;
  }

  async function renderOne(slug: string, body: string) {
    const result = await render(manifestWith(slug, body), { theme: minimalTheme });
    const err = result.errors?.find((e) => e.slug === slug);
    const file = result.files.find((f) => f.path === `${slug}/index.html`);
    return { result, err, html: file ? asString(file) : undefined };
  }

  it('renders a module description that starts with lowercase "import" (the issue repro)', async () => {
    const { err, html } = await renderOne('module/foo', modulePageBody('foo', IMPORT_SENTENCE));
    expect(err, err?.message).toBeUndefined();
    expect(html).toBeDefined();
    // Rendered as prose — the sentence is visible, verbatim.
    expect(html).toContain(IMPORT_SENTENCE);
  });

  it('renders a module description that starts with lowercase "export"', async () => {
    const { err, html } = await renderOne('module/baz', modulePageBody('baz', EXPORT_SENTENCE));
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain(EXPORT_SENTENCE);
  });

  it('renders "export default …" prose (the construct keys on the keyword alone)', async () => {
    const sentence = 'export default behaviour is to copy the file.';
    const { err, html } = await renderOne('module/qux', modulePageBody('qux', sentence));
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain(sentence);
  });

  it('renders when the import line is the very first flow line after the frontmatter', async () => {
    const body = `---\ntitle: summary\nkind: guide\n---\n\n${IMPORT_SENTENCE}\n`;
    const { err, html } = await renderOne('summary', body);
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain(IMPORT_SENTENCE);
  });

  it('renders when a later paragraph starts with "import"', async () => {
    const body = `# Page\n\nUse this module.\n\n${IMPORT_SENTENCE}\n`;
    const { err, html } = await renderOne('later', body);
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain(IMPORT_SENTENCE);
  });

  it('still renders the other pages when one has the import line (no cross-page damage)', async () => {
    const { result } = await renderOne('module/foo', modulePageBody('foo', IMPORT_SENTENCE));
    expect(result.files.map((f) => f.path)).toContain('index.html');
    expect(result.files.map((f) => f.path)).toContain('guide/intro/index.html');
  });

  // Controls: these pass today and must keep passing once the keyword is guarded.
  it('still renders a capitalized "Import …" line as prose (the reporter\'s workaround)', async () => {
    const sentence = 'Import these functions to your own project.';
    const { err, html } = await renderOne('module/bar', modulePageBody('bar', sentence));
    expect(err).toBeUndefined();
    expect(html).toContain(sentence);
  });

  it('still renders words that merely begin with import/export, and mid-line uses', async () => {
    const body = [
      '# Page',
      '',
      'important: read this first.',
      '',
      'imports are resolved lazily.',
      '',
      'You can import these functions and export the result.',
      '',
    ].join('\n');
    const { err, html } = await renderOne('words', body);
    expect(err).toBeUndefined();
    expect(html).toContain('important: read this first.');
    expect(html).toContain('imports are resolved lazily.');
    expect(html).toContain('You can import these functions and export the result.');
  });

  it('still highlights a real import statement inside a fenced code block', async () => {
    const body = '# Page\n\n```js\nimport x from "y";\nexport default x;\n```\n';
    const { err, html } = await renderOne('fence', body);
    expect(err).toBeUndefined();
    expect(html).toMatch(/<pre class="[^"]*\bshiki\b/);
    // Shiki tokenizes the keyword into its own span — it must still be there, as code.
    expect(html).toMatch(/<span[^>]*>import<\/span>/);
    // And no escaped artefact leaked into the code block.
    expect(html).not.toContain('&#x69;mport');
    expect(html).not.toContain('\\import');
  });
});

// MDX has no HTML-comment syntax, so a single `<!-- … -->` in prose aborted the
// page ("Unexpected character `!` … to create a comment in MDX, use `{/* text
// */}`"). On the README that meant no root index.html at all. v4 emitted plain
// HTML, where a comment is harmless; the theme must render these pages again.
describe('render() — HTML comments in prose', () => {
  /** The shape setu emits for a README home page with a badge-block comment. */
  const README_BODY = [
    '---',
    'title: Home',
    'kind: index',
    '---',
    '',
    '<!-- badges -->',
    '',
    '[![npm](https://img.shields.io/npm/v/x.svg)](https://npm.im/x)',
    '',
    '# my-lib',
    '',
    'A small library. <!-- TODO: reword -->It does things.',
    '',
    '<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->',
    '',
    '| Contributor |',
    '| - |',
    '| Ada |',
    '',
    '<!-- ALL-CONTRIBUTORS-LIST:END -->',
    '',
    '```html',
    '<!-- kept as code -->',
    '```',
    '',
  ].join('\n');

  function withPage(slug: string, body: string): SiteManifest {
    const m = makeManifest();
    const existing = m.pages.find((p) => p.slug === slug);
    if (existing) {
      existing.body = body;
    } else {
      m.pages.push({
        slug,
        frontmatter: { title: slug, kind: 'module', description: 'A page.' },
        body,
        headings: [],
      });
      m.nav.push({ label: slug, slug });
    }
    return m;
  }

  async function renderOne(slug: string, body: string) {
    const result = await render(withPage(slug, body), { theme: minimalTheme });
    const err = result.errors?.find((e) => e.slug === slug);
    const file = result.files.find((f) => f.path === (slug ? `${slug}/index.html` : 'index.html'));
    return { result, err, html: file ? asString(file) : undefined };
  }

  it('renders a README home page with badge, inline and marker comments (root index.html exists)', async () => {
    const { err, html } = await renderOne('', README_BODY);
    expect(err, err?.message).toBeUndefined();
    expect(html).toBeDefined();
    expect(html).toContain('A small library. It does things.');
    expect(html).toContain('Ada');
    // Prose comments are gone from the rendered page…
    expect(html).not.toContain('TODO: reword');
    expect(html).not.toContain('ALL-CONTRIBUTORS');
    expect(html).not.toContain('badges');
    // …while the one inside the fenced code block is still shown, as code.
    expect(html).toContain('kept as code');
  });

  it('renders a module page whose description holds an inline comment (the doc-comment repro)', async () => {
    const body = [
      '# c01',
      '',
      '<SourceLink href="/source/c01-js/#L5" label="c01.js:5" />',
      '',
      'HTML comment in a description <!-- internal note -->should not break.',
      '',
    ].join('\n');
    const { err, html } = await renderOne('module/c01', body);
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain('HTML comment in a description should not break.');
    expect(html).not.toContain('internal note');
  });

  it('renders a tutorial with a comment on its own line', async () => {
    const body = '# Tutorial\n\n<!-- a comment -->\n\nimport the package first, then:\n';
    const { err, html } = await renderOne('tutorials/t1', body);
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain('import the package first, then:');
    expect(html).not.toContain('a comment');
  });

  it('renders an unterminated <!-- as literal text and keeps the rest of the page', async () => {
    const body = '# Page\n\nBroken <!-- opener here.\n\n## Later\n\nStill visible.\n';
    const { err, html } = await renderOne('broken', body);
    expect(err, err?.message).toBeUndefined();
    expect(html).toContain('Broken &lt;!-- opener here.');
    expect(html).toContain('Still visible.');
  });

  it('keeps the comments verbatim in the .md companion (it is the page source)', async () => {
    const { result } = await renderOne('', README_BODY);
    const md = result.files.find((f) => f.path === 'index.md');
    expect(md && asString(md)).toBe(README_BODY);
  });

  it('keeps comment text out of the search index', async () => {
    const { result } = await renderOne('module/c01', 'Visible <!-- secret > note --> text.\n');
    const entry = result.search!.find((s) => s.slug === 'module/c01')!;
    expect(entry.content).toBe('Visible text.');
    expect(entry.excerpt).toBe('Visible text.');
  });
});

describe('render() — issue #333: render-error diagnostics', () => {
  function manifestWithBadPage(): SiteManifest {
    const m = makeManifest();
    // An angle-bracket autolink is MDX-hostile: `<https:` reads as a JSX tag and
    // acorn rejects it. It survives the brace-escaping pre-pass (no braces), so
    // the page fails to compile with a positioned VFileMessage.
    m.pages.push({
      slug: 'bad',
      frontmatter: { title: 'Bad', kind: 'guide', description: 'A page that will not compile.' },
      body: `# Bad page\n\nIntro line.\n\nSee <https://example.com> for more.\n`,
      headings: [],
    });
    m.nav.push({ label: 'Bad', slug: 'bad' });
    return m;
  }

  it('skips the bad page (not thrown) and still renders the good pages', async () => {
    const result = await render(manifestWithBadPage(), { theme: minimalTheme });
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('index.html'); // home still rendered
    expect(paths).not.toContain('bad/index.html'); // bad page skipped
    expect(result.errors).toBeDefined();
    expect(result.errors!.some((e) => e.slug === 'bad')).toBe(true);
  });

  it('enriches the RenderError with line, column, and a code-frame snippet', async () => {
    const result = await render(manifestWithBadPage(), { theme: minimalTheme });
    const err = result.errors!.find((e) => e.slug === 'bad')!;
    expect(typeof err.line).toBe('number');
    expect(err.snippet).toBeTruthy();
    // The snippet locates the offending source line.
    expect(err.snippet).toContain('See <https://example.com> for more.');
    // The reported line points at that line in the body (1-based).
    expect(err.snippet).toContain(`${err.line} |`);
  });

  // issue #333 (dwv): an aggregated Globals page where one symbol's doc comment
  // has an unbalanced inline-code backtick straddling a blank line, with a `{...}`
  // between the ticks. This used to abort the page ("Could not parse expression
  // with acorn") because escapeStrayBraces let the stray backtick swallow the
  // brace as "code". escapeStrayBraces now mirrors CommonMark (a code span can't
  // cross a blank line), so the brace is escaped and the page renders — this is
  // the regression guard for that fix.
  it('renders an aggregated page with an unbalanced backtick + brace (issue #333)', async () => {
    const m = makeManifest();
    m.pages.push({
      slug: 'global',
      frontmatter: { title: 'Globals', kind: 'guide', description: 'Aggregated globals.' },
      body: [
        '# Globals',
        '',
        '## getConfig',
        '',
        'Pass `{ port: 8080 } to override just the port',
        '',
        'and keep the `rest`.',
      ].join('\n'),
      headings: [],
    });
    const result = await render(m, { theme: minimalTheme });
    // No render failure, and the page is emitted (it used to be skipped).
    expect(result.errors?.some((e) => e.slug === 'global')).toBeFalsy();
    expect(result.files.map((f) => f.path)).toContain('global/index.html');
  });

  it('surfaces an unbalanced backtick as a non-fatal warning (still renders)', async () => {
    const m = makeManifest();
    m.pages.push({
      slug: 'globals',
      frontmatter: { title: 'Globals', kind: 'guide', description: 'Aggregated globals.' },
      body: [
        '# Globals',
        '',
        'Pass `{ port: 8080 } to override the port',
        '',
        'and keep the rest.',
      ].join('\n'),
      headings: [],
    });
    const result = await render(m, { theme: minimalTheme });
    // The page renders…
    expect(result.files.map((f) => f.path)).toContain('globals/index.html');
    // …and the unbalanced backtick is reported as a located warning.
    const warn = result.warnings?.find((w) => w.slug === 'globals' && typeof w.line === 'number');
    expect(warn).toBeDefined();
    expect(warn!.message).toMatch(/unbalanced inline-code backtick/);
    expect(warn!.snippet).toContain('Pass `{ port: 8080 } to override the port');
  });

  it('emits no warnings for a clean page', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    expect(result.warnings).toBeUndefined();
  });
});
