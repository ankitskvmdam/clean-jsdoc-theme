import { describe, it, expect } from 'vitest';
import { render } from '../index';
import { makeManifest, minimalTheme } from './fixtures';
import type { OutputFile } from '@clean-jsdoc-theme/utils';

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
    const expected = [
      '_islands/sidebar.js',
      '_islands/mobile-nav.js',
      '_islands/toc.js',
      '_islands/toc-mobile.js',
      '_islands/cmdk.js',
      '_islands/code-tabs.js',
      '_islands/copy-btn.js',
      '_islands/copy-page.js',
      '_islands/theme-toggle.js',
      '_islands/settings.js',
      '_islands/code-viewer.js',
      '_islands/embed.js',
    ];
    for (const path of expected) {
      const chunk = result.files.find((f) => f.path === path);
      expect(chunk, `missing chunk ${path}`).toBeDefined();
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

    // The page's loader references the embed chunk, and the chunk is emitted.
    expect(html).toContain('/_islands/embed.js');
    const chunk = result.files.find((f) => f.path === '_islands/embed.js');
    expect(chunk, 'missing chunk _islands/embed.js').toBeDefined();
    expect(asString(chunk!).length).toBeGreaterThan(0);
  });

  it('emits a CSS file with theme variables on :root', async () => {
    const manifest = makeManifest();
    const result = await render(manifest, { theme: minimalTheme });
    const css = result.files.find((f) =>
      f.path.startsWith('_assets/styles.') && f.path.endsWith('.css'),
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
    }
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
      expect(home).toContain(`/_islands/${name}.js`);
    }
  });

  it('emits a data-island-props JSON payload on each page', async () => {
    const result = await render(makeManifest(), { theme: minimalTheme });
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).toMatch(
      /<script type="application\/json" data-island-props>\{.*\}<\/script>/u,
    );
  });
});

describe('render() — frontmatter handling', () => {
  it('strips setu-emitted YAML frontmatter from the rendered body', async () => {
    const manifest = makeManifest();
    manifest.pages[0].body =
      `---\ntitle: Home\nkind: class\nlongname: Home\n---\n\n# Welcome\n\nReal body content.\n`;
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
      result.files.find((f) =>
        f.path.startsWith('_assets/styles.') && f.path.endsWith('.css'),
      )!,
    );
    expect(css).toContain('--clean-bg:#ff00ff;');
    expect(css).toContain('--clean-accent:#abcdef;');
  });
});
