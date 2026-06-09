import { describe, it, expect, afterEach, vi } from 'vitest';
import { render as renderToString } from 'preact-render-to-string';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { Embed, EmbedBody } from '../components/Embed';
import { defaultMdxComponents } from '../mdx-components';
import { ISLAND_REGISTRY } from '../islands';

describe('Embed (SSR markup)', () => {
  it('non-click-to-load: renders the island marker, data-* config, and a live iframe', () => {
    const html = renderToString(
      <Embed src="https://example.com/widget" title="Live demo" height="500" />,
    );
    // Island marker + config channel.
    expect(html).toContain('data-island="embed"');
    expect(html).toContain('data-src="https://example.com/widget"');
    expect(html).toContain('data-title="Live demo"');
    expect(html).toContain('data-height="500"');
    // Default sandbox is always serialized into the data channel.
    expect(html).toContain('data-sandbox="allow-scripts allow-same-origin allow-popups allow-forms"');
    // A live iframe (no JS needed) with the security defaults.
    expect(html).toContain('<iframe');
    expect(html).toContain('src="https://example.com/widget"');
    expect(html).toContain('title="Live demo"');
    expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-forms"');
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    expect(html).toContain('loading="lazy"');
    // Not click-to-load → no poster button, no noscript fallback.
    expect(html).not.toContain('data-embed-poster');
    expect(html).not.toContain('<noscript');
  });

  it('respects a custom sandbox override', () => {
    const html = renderToString(
      <Embed src="https://example.com" sandbox="allow-scripts" />,
    );
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).toContain('data-sandbox="allow-scripts"');
  });

  it('click-to-load: renders a poster button + noscript fallback, no live iframe', () => {
    const html = renderToString(
      <Embed src="https://example.com/demo" title="Sandbox" clickToLoad="true" />,
    );
    expect(html).toContain('data-click-to-load="true"');
    // Poster button (accessible), not a live iframe up front.
    expect(html).toContain('data-embed-poster');
    expect(html).toContain('aria-label="Load embedded content: Sandbox"');
    // The only iframe present is inside the <noscript> fallback.
    expect(html).toContain('<noscript>');
    const iframeCount = html.split('<iframe').length - 1;
    expect(iframeCount).toBe(1);
    expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });

  it('aspectRatio sizing wins over height and emits data-aspect', () => {
    const html = renderToString(
      <Embed src="https://example.com" aspectRatio="16/9" height="400" />,
    );
    expect(html).toContain('aspect-ratio:16/9');
    expect(html).toContain('data-aspect="16/9"');
    // height is not used in the wrapper sizing when an aspect ratio is set.
    expect(html).not.toContain('data-height');
    const wrapperStyle = /<div[^>]*data-island="embed"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? '';
    expect(wrapperStyle).toContain('aspect-ratio:16/9');
    expect(wrapperStyle).not.toContain('height:');
  });

  it('height sizing (default 400) when no aspectRatio', () => {
    const html = renderToString(<Embed src="https://example.com" />);
    const wrapperStyle = /<div[^>]*data-island="embed"[^>]*style="([^"]*)"/.exec(html)?.[1] ?? '';
    expect(wrapperStyle).toContain('height:400px');
    expect(html).toContain('data-height="400"');
    expect(html).not.toContain('aspect-ratio');
  });

  it('themed src keeps the literal {theme} token in SSR markup (no hydration mismatch)', () => {
    const html = renderToString(
      <Embed src="https://example.com/{theme}" themed="true" />,
    );
    // themed defaults ON, so the on-state writes no data-themed attr.
    expect(html).not.toContain('data-themed');
    // SSR src is the literal token; the client resolves it post-hydration.
    expect(html).toContain('src="https://example.com/{theme}"');
  });

  it('themed defaults on: emits no data-themed attr when the prop is absent', () => {
    const html = renderToString(<Embed src="https://example.com/widget" />);
    expect(html).not.toContain('data-themed');
  });

  it('themed=false records the opt-out in the data channel', () => {
    const html = renderToString(
      <Embed src="https://example.com/widget" themed="false" />,
    );
    expect(html).toContain('data-themed="false"');
  });
});

describe('Embed registration', () => {
  it('is registered in defaultMdxComponents under the capitalized key', () => {
    expect(defaultMdxComponents.Embed).toBe(Embed);
  });

  it('exposes the hydration body as the `embed` island in ISLAND_REGISTRY', () => {
    expect(ISLAND_REGISTRY.embed).toBe(EmbedBody);
  });
});

describe('EmbedBody (island hydration target)', () => {
  afterEach(() => cleanup());

  it('renders only the inner body (no data-island marker) so it can mount onto the marker', () => {
    const html = renderToString(<EmbedBody src="https://example.com/widget" title="Live demo" />);
    // The body is just the iframe — the marker/wrapper is owned by `Embed`.
    expect(html).not.toContain('data-island');
    expect(html.trimStart().startsWith('<iframe')).toBe(true);
    expect(html).toContain('src="https://example.com/widget"');
    expect(html).toContain('title="Live demo"');
  });

  it('click-to-load body: poster click injects the live iframe in place', () => {
    const { container } = render(
      <EmbedBody src="https://example.com/demo" title="Demo" clickToLoad="true" themed="false" />,
    );
    const poster = container.querySelector('button[data-embed-poster]');
    expect(poster).toBeTruthy();
    fireEvent.click(poster!);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe!.getAttribute('src')).toBe('https://example.com/demo');
    expect(container.querySelector('button[data-embed-poster]')).toBeNull();
  });
});

describe('Embed (client hydration)', () => {
  afterEach(() => cleanup());

  it('click-to-load: clicking the poster injects the live iframe', () => {
    const { container } = render(
      <Embed src="https://example.com/demo" title="Demo" clickToLoad="true" themed="false" />,
    );
    const wrapper = container.querySelector('[data-island="embed"]')!;
    const poster = wrapper.querySelector('button[data-embed-poster]');
    expect(poster).toBeTruthy();
    // The live iframe is injected as a *direct* child of the wrapper, replacing
    // the poster. (happy-dom parses the <noscript> fallback iframe into the DOM,
    // so we look only at the wrapper's direct element children.)
    const directIframe = () =>
      Array.from(wrapper.children).find((el) => el.tagName === 'IFRAME') as
        | HTMLIFrameElement
        | undefined;
    expect(directIframe()).toBeUndefined();

    fireEvent.click(poster!);

    const iframe = directIframe();
    expect(iframe).toBeTruthy();
    expect(iframe!.getAttribute('src')).toBe('https://example.com/demo');
    expect(iframe!.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-popups allow-forms',
    );
    expect(iframe!.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe!.getAttribute('loading')).toBe('lazy');
    // Poster is gone once replaced.
    expect(wrapper.querySelector('button[data-embed-poster]')).toBeNull();
  });

  it('themed: resolves {theme} from <html data-theme> and re-points on theme change', async () => {
    document.documentElement.dataset.theme = 'dark';
    try {
      const { container } = render(
        <Embed src="https://example.com/{theme}/embed" themed="true" />,
      );
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      // The non-click effect resolves the initial {theme} token from <html>.
      expect(iframe!.getAttribute('src')).toBe('https://example.com/dark/embed');

      // Flipping the theme re-points the iframe via the MutationObserver.
      document.documentElement.dataset.theme = 'light';
      await vi.waitFor(() =>
        expect(iframe!.getAttribute('src')).toBe('https://example.com/light/embed'),
      );
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('themed: auto-appends ?theme-id=<theme> when the author declared no theme-id', async () => {
    document.documentElement.dataset.theme = 'dark';
    try {
      const { container } = render(
        <Embed src="https://example.com/embed" themed="true" />,
      );
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe!.getAttribute('src')).toBe('https://example.com/embed?theme-id=dark');

      // Re-points on theme change just like the {theme} token form.
      document.documentElement.dataset.theme = 'light';
      await vi.waitFor(() =>
        expect(iframe!.getAttribute('src')).toBe('https://example.com/embed?theme-id=light'),
      );
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('themed: uses & when the URL already has a query string, and preserves the #fragment', () => {
    document.documentElement.dataset.theme = 'dark';
    try {
      const { container } = render(
        <Embed src="https://example.com/embed?foo=1#section" themed="true" />,
      );
      const iframe = container.querySelector('iframe');
      expect(iframe!.getAttribute('src')).toBe(
        'https://example.com/embed?foo=1&theme-id=dark#section',
      );
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('themed: respects an author-declared theme-id and never overrides it', () => {
    document.documentElement.dataset.theme = 'dark';
    try {
      const { container } = render(
        <Embed src="https://example.com/embed?theme-id=light" themed="true" />,
      );
      const iframe = container.querySelector('iframe');
      // Author pinned theme-id=light at declaration → stays light despite dark theme.
      expect(iframe!.getAttribute('src')).toBe('https://example.com/embed?theme-id=light');
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('default on: a bare embed appends ?theme-id=<theme> (no opt-in needed)', () => {
    document.documentElement.dataset.theme = 'dark';
    try {
      const { container } = render(<Embed src="https://example.com/embed" />);
      const iframe = container.querySelector('iframe');
      expect(iframe!.getAttribute('src')).toBe('https://example.com/embed?theme-id=dark');
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

  it('themed=false opts out: leaves src untouched (no theme-id appended)', () => {
    document.documentElement.dataset.theme = 'dark';
    try {
      const { container } = render(
        <Embed src="https://example.com/embed" themed="false" />,
      );
      const iframe = container.querySelector('iframe');
      expect(iframe!.getAttribute('src')).toBe('https://example.com/embed');
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });
});
