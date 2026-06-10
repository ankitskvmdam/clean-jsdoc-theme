import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import type { ComponentChildren } from 'preact';
import { MdxA, SourceLink, MemberMeta } from '../components/mdx-tags';
import { BasePathContext } from '../components/mdx-utils';

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
});
