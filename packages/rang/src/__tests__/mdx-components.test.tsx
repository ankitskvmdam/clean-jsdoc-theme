import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { h } from 'preact';
import { defaultMdxComponents } from '../mdx-components';

describe('defaultMdxComponents', () => {
  it('renders h2 with its id and a hover anchor button (no <a> tag)', () => {
    const H2 = defaultMdxComponents.h2;
    const html = render(h(H2, { id: 'foo' }, 'Title'));
    expect(html).toContain('Title');
    expect(html).toContain('id="foo"');
    // The anchor affordance is a button (clicks are handled by dwar's
    // heading-anchors script via JS), not an <a href> — see mdx-utils.
    expect(html).toContain('data-heading-anchor');
    expect(html).not.toContain('href="#foo"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('h2 without id renders without an anchor button', () => {
    const H2 = defaultMdxComponents.h2;
    const html = render(h(H2, {}, 'Title'));
    expect(html).toContain('Title');
    expect(html).not.toContain('data-heading-anchor');
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
    // The copy button must carry the island marker so dwar's loader hydrates it
    // — without it the button renders but clicks do nothing.
    expect(html).toContain('data-island="copy-btn"');
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

  it('MemberMeta renders chips on the left and the filename:line source on the right', () => {
    const MemberMeta = defaultMdxComponents.MemberMeta;
    const html = render(
      h(MemberMeta, {
        badges: 'static,async,deprecated',
        sourceHref: '/source/x/#L1',
        sourceLabel: 'x.js:1',
      }),
    );
    expect(html).toContain('static');
    expect(html).toContain('async');
    expect(html).toContain('deprecated');
    // Source link: filename:line only (no "Source:" word), pinned right (ml-auto).
    expect(html).toContain('href="/source/x/#L1"');
    expect(html).toContain('>x.js:1<');
    expect(html).not.toContain('Source:');
    expect(html).toMatch(/ml-auto[^>]*>x\.js:1/);
  });

  it('MemberMeta keeps the source on the right when chips are missing (empty left element)', () => {
    const MemberMeta = defaultMdxComponents.MemberMeta;
    const html = render(h(MemberMeta, { sourceHref: '/source/x/#L1', sourceLabel: 'x.js:1' }));
    // The left chip group is still rendered (empty), source stays right.
    expect(html).toMatch(/ml-auto[^>]*>x\.js:1/);
  });

  it('MemberMeta leaves the right empty when source is opted out', () => {
    const MemberMeta = defaultMdxComponents.MemberMeta;
    const html = render(h(MemberMeta, { badges: 'static' }));
    expect(html).toContain('static');
    expect(html).not.toContain('href=');
  });

  it('MemberMeta renders nothing when it has neither badges nor source', () => {
    const MemberMeta = defaultMdxComponents.MemberMeta;
    expect(render(h(MemberMeta, {}))).toBe('');
  });
});
