import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { Sidebar } from '../components/Sidebar';

const fixture: NavNode[] = [
  {
    label: 'Guide',
    children: [
      { label: 'Intro', slug: 'guide/intro' },
      { label: 'Setup', slug: 'guide/setup' },
    ],
  },
  {
    label: 'API',
    children: [
      { label: 'Foo', slug: 'foo/bar' },
      { label: 'Bar', slug: 'foo/baz' },
    ],
  },
  { label: 'Standalone', slug: 'standalone' },
];

describe('Sidebar', () => {
  it('marks the current slug link with aria-current="page"', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="foo/bar" />);
    expect(html).toContain('aria-current="page"');
    expect(html).toMatch(/aria-current="page"[^>]*>Foo|>Foo[^<]*<[^>]*aria-current="page"/);
  });

  it('expands the parent branch containing the current slug', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="foo/bar" />);
    expect(html).toContain('href="/foo/bar"');
    expect(html).toContain('href="/foo/baz"');
  });

  it('collapses sibling branches that do not contain the current slug', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="foo/bar" />);
    expect(html).not.toContain('href="/guide/intro"');
    expect(html).not.toContain('href="/guide/setup"');
  });

  it('renders flat leaves without expansion controls', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="standalone" />);
    expect(html).toContain('href="/standalone"');
  });
});
