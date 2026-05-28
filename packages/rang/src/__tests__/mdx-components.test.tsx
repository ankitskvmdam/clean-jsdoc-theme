import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { h } from 'preact';
import { defaultMdxComponents } from '../mdx-components';

describe('defaultMdxComponents', () => {
  it('renders h2 with an anchor link to its id', () => {
    const H2 = defaultMdxComponents.h2;
    const html = render(h(H2, { id: 'foo' }, 'Title'));
    expect(html).toContain('Title');
    expect(html).toContain('href="#foo"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('h2 without id renders without an anchor link', () => {
    const H2 = defaultMdxComponents.h2;
    const html = render(h(H2, {}, 'Title'));
    expect(html).toContain('Title');
    expect(html).not.toContain('aria-hidden="true"');
  });

  it('external link renders target=_blank and rel', () => {
    const A = defaultMdxComponents.a;
    const html = render(h(A, { href: 'https://example.com' }, 'link'));
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });

  it('intra-doc link does not set target', () => {
    const A = defaultMdxComponents.a;
    const html = render(h(A, { href: '/local' }, 'link'));
    expect(html).not.toContain('target=');
  });

  it('pre with code child surfaces a copy button', () => {
    const Pre = defaultMdxComponents.pre;
    const child = h('code', { children: 'console.log(1)' });
    const html = render(h(Pre, { children: child }));
    expect(html).toContain('console.log(1)');
    expect(html).toMatch(/aria-label="(Copy|Copied)/);
  });

  it('pre with non-code children renders without copy button', () => {
    const Pre = defaultMdxComponents.pre;
    const html = render(h(Pre, { children: 'raw text' }));
    expect(html).toContain('raw text');
    expect(html).not.toMatch(/aria-label="(Copy|Copied)/);
  });

  it('table wraps content in an overflow-x-auto container', () => {
    const Table = defaultMdxComponents.table;
    const html = render(h(Table, {}, 'rows'));
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('<table');
  });
});
