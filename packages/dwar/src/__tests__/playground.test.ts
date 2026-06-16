import { describe, it, expect } from 'vitest';
import { render } from '../index';
import { minimalTheme } from './fixtures';
import type { OutputFile, SiteManifest, ThemeConfig } from '@clean-jsdoc-theme/utils';

function asString(file: OutputFile): string {
  return typeof file.contents === 'string'
    ? file.contents
    : new TextDecoder().decode(file.contents);
}

/** A page whose body wraps a 3-line JS fence in a `<Playground>` (as setu emits). */
const PLAYGROUND_BODY = `# Demo

<Playground providers="codepen" filename="resize.js" highlight="1,3">

\`\`\`js
const a = 1;
const b = 2;
const c = 3;
\`\`\`

</Playground>
`;

function makePlaygroundManifest(): SiteManifest {
  return {
    pages: [
      {
        slug: '',
        frontmatter: { title: 'Home', kind: 'index', description: 'No playground here.' },
        body: `# Home\n\nJust prose, no playground.\n`,
        headings: [],
      },
      {
        slug: 'demo',
        frontmatter: { title: 'Demo', kind: 'guide', description: 'Has a playground.' },
        body: PLAYGROUND_BODY,
        headings: [],
      },
    ],
    nav: [
      { label: 'Home', slug: '' },
      { label: 'Demo', slug: 'demo' },
    ],
    pkg: { name: 'test-pkg', version: '1.0.0' },
    buildId: 'test-build-pg',
  };
}

const themeWithPlayground: ThemeConfig = {
  ...minimalTheme,
  playground: {
    enabled: true,
    codepen: { js_external: 'https://example.com/lib.js', js_pre_processor: 'babel' },
  },
};

describe('render() — playground', () => {
  it('emits the playground marker + data-providers on a page that has one', async () => {
    const result = await render(makePlaygroundManifest(), { theme: themeWithPlayground });
    const html = asString(result.files.find((f) => f.path === 'demo/index.html')!);
    expect(html).toContain('data-code-card');
    expect(html).toContain('data-island="playground"');
    expect(html).toContain('data-providers="codepen"');
    // The filename label replaces the default CODE label.
    expect(html).toContain('resize.js');
  });

  it('emits the data-playground-config payload (only) when the page has a marker', async () => {
    const result = await render(makePlaygroundManifest(), { theme: themeWithPlayground });

    const demo = asString(result.files.find((f) => f.path === 'demo/index.html')!);
    expect(demo).toContain('data-playground-config');
    // The site-wide per-provider options are threaded into the payload.
    expect(demo).toContain('js_external');
    expect(demo).toContain('https://example.com/lib.js');

    // The home page has no playground → neither the marker nor the payload, so it
    // stays free of any playground bytes.
    const home = asString(result.files.find((f) => f.path === 'index.html')!);
    expect(home).not.toContain('data-island="playground"');
    expect(home).not.toContain('data-playground-config');
  });

  it('omits the payload when no playground config is set, even with a marker', async () => {
    // The marker still renders (it comes from the <Playground> JSX attribute), but
    // with no ThemeConfig.playground there are no site-wide options to emit.
    const result = await render(makePlaygroundManifest(), { theme: minimalTheme });
    const html = asString(result.files.find((f) => f.path === 'demo/index.html')!);
    expect(html).toContain('data-island="playground"');
    expect(html).not.toContain('data-playground-config');
  });

  it('real Shiki wraps each line, so highlight lands on the requested lines', async () => {
    const result = await render(makePlaygroundManifest(), { theme: themeWithPlayground });
    const html = asString(result.files.find((f) => f.path === 'demo/index.html')!);

    // End-to-end confirmation that @shikijs/rehype wraps each source line in a
    // `<span class="line">` (the assumption rang's highlight logic relies on).
    const pre = html.match(/<pre[^>]*shiki[\s\S]*?<\/pre>/)?.[0] ?? '';
    expect(pre).toContain('class="line');

    // Split into per-line chunks (each begins at a `class="line` span). Shiki
    // nests per-token spans inside, so we inspect each line span's OPENING tag
    // for `data-highlighted` (which rang adds only to the requested lines).
    const lineChunks = pre.split('class="line').slice(1);
    expect(lineChunks.length).toBe(3);
    const isHighlighted = (chunk: string): boolean =>
      chunk.slice(0, chunk.indexOf('>')).includes('data-highlighted');

    // highlight="1,3" → lines 1 and 3 tagged, line 2 not.
    expect(isHighlighted(lineChunks[0])).toBe(true);
    expect(isHighlighted(lineChunks[1])).toBe(false);
    expect(isHighlighted(lineChunks[2])).toBe(true);
    expect(lineChunks[0]).toContain('1');
    expect(lineChunks[2]).toContain('3');
    expect(html.match(/data-highlighted/g)?.length).toBe(2);
  });

  it('resets token-span backgrounds inside a highlighted line (dark-mode tint fix)', async () => {
    const result = await render(makePlaygroundManifest(), { theme: themeWithPlayground });
    const css = asString(result.files.find((f) => f.path.endsWith('.css'))!);
    // The rule that clears per-token span backgrounds so the line's own
    // highlight shows in dark mode (where `.shiki span` is force-painted).
    expect(css).toContain('data-highlighted] span');
  });

  it('emits the code-chrome vars, overridable via colors/darkColors', async () => {
    const themed: ThemeConfig = {
      ...themeWithPlayground,
      tokens: {
        ...themeWithPlayground.tokens,
        colors: { ...themeWithPlayground.tokens.colors, codeHeaderBg: 'rebeccapurple' },
      },
    };
    const result = await render(makePlaygroundManifest(), { theme: themed });
    const css = asString(result.files.find((f) => f.path.endsWith('.css'))!);
    // The user override wins in :root …
    expect(css).toContain('--clean-code-header-bg:rebeccapurple');
    // … and the others keep their defaults.
    expect(css).toContain('--clean-code-highlight-bg:oklch(0.973 0 0)');
  });
});
