import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import type { ComponentChildren } from 'preact';
import { MdxA, MdxImg, SourceLink, MemberMeta } from '../components/mdx-tags';
import { BasePathContext, InlineSvgContext } from '../components/mdx-utils';

/** Render a node inside a BasePathContext.Provider (SSR-only path dwar uses). */
function renderWithBase(basePath: string, node: ComponentChildren): string {
  return render(<BasePathContext.Provider value={basePath}>{node}</BasePathContext.Provider>);
}

describe('BasePathContext + in-content links', () => {
  it('MdxA prefixes an internal root-relative href with basePath', () => {
    const html = renderWithBase('/docs', <MdxA href="/guide/intro">Intro</MdxA>);
    expect(html).toContain('href="/docs/guide/intro"');
    expect(html).not.toContain('href="/guide/intro"');
  });

  it('MdxA leaves an external link untouched (no prefix, opens new tab)', () => {
    const html = renderWithBase('/docs', <MdxA href="https://example.com/x">Ext</MdxA>);
    expect(html).toContain('href="https://example.com/x"');
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain('/docs');
  });

  it('MdxA leaves a protocol-relative link untouched', () => {
    const html = renderWithBase('/docs', <MdxA href="//cdn.example.com/x">PR</MdxA>);
    expect(html).toContain('href="//cdn.example.com/x"');
    expect(html).not.toContain('/docs//cdn');
  });

  it('MdxA is the identity-prefix at the default root base', () => {
    const html = render(<MdxA href="/guide/intro">Intro</MdxA>);
    expect(html).toContain('href="/guide/intro"');
  });

  it('SourceLink prefixes its (always internal) href with basePath', () => {
    const html = renderWithBase('/docs', <SourceLink href="/source/foo.js" label="foo.js:12" />);
    expect(html).toContain('href="/docs/source/foo.js"');
  });

  it('MemberMeta prefixes its source href with basePath', () => {
    const html = renderWithBase(
      '/docs',
      <MemberMeta sourceHref="/source/foo.js#L12" sourceLabel="foo.js:12" />
    );
    expect(html).toContain('href="/docs/source/foo.js#L12"');
  });

  it('MdxImg prefixes a root-relative src with basePath exactly once', () => {
    const html = renderWithBase('/docs', <MdxImg src="/_assets/d.1a2b3c4d.png" alt="d" />);
    expect(html).toContain('src="/docs/_assets/d.1a2b3c4d.png"');
    expect(html).not.toContain('/docs/docs/');
  });

  it('MdxImg is the identity-prefix at the default root base', () => {
    expect(render(<MdxImg src="/_assets/d.png" alt="" />)).toContain('src="/_assets/d.png"');
  });

  it('MdxImg leaves absolute, protocol-relative and data: srcs untouched', () => {
    for (const src of [
      'https://x/y.png',
      '//cdn.x/y.png',
      'data:image/png;base64,AAAA',
      './rel.png',
    ]) {
      const html = renderWithBase('/docs', <MdxImg src={src} alt="" />);
      expect(html).toContain(`src="${src}"`);
      expect(html).not.toContain('/docs');
    }
  });

  it('MdxImg inlines an SVG looked up by its base-free src even under a sub-path', () => {
    const html = render(
      <BasePathContext.Provider value="/docs">
        <InlineSvgContext.Provider value={{ '/_assets/l.0000ffff.svg': '<svg data-x="1"></svg>' }}>
          <MdxImg src="/_assets/l.0000ffff.svg" alt="logo" />
        </InlineSvgContext.Provider>
      </BasePathContext.Provider>
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('<svg data-x="1">');
    expect(html).not.toContain('<img');
  });
});
