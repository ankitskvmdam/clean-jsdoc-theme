import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { Sidebar } from '../components/Sidebar';

// Flat, grouped nav — the shape setu's buildNav emits (group + order per entry).
const fixture: NavNode[] = [
  { label: 'CoreSchema', slug: 'module/coreschema', group: 'Modules', order: 0 },
  { label: 'BaseEntity', slug: 'baseentity', group: 'Classes', order: 2 },
  { label: 'DataProcessor', slug: 'dataprocessor', group: 'Classes', order: 2 },
];

describe('Sidebar', () => {
  it('renders a title for each group', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="" />);
    expect(html).toContain('Modules');
    expect(html).toContain('Classes');
  });

  it('renders a link for every navigable entry', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="" />);
    expect(html).toContain('href="/module/coreschema"');
    expect(html).toContain('href="/baseentity"');
    expect(html).toContain('href="/dataprocessor"');
  });

  it('marks the current slug with aria-current="page"', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="dataprocessor" />);
    expect(html).toContain('aria-current="page"');
    expect(html).toMatch(/aria-current="page"[^>]*>(?:<[^>]*>)*DataProcessor/);
  });

  it('applies the active treatment to only the current entry', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="dataprocessor" />);
    // The tinted active surface (`bg-primary/10`) appears exactly once.
    const active = html.match(/bg-primary\/10/g) ?? [];
    expect(active.length).toBe(1);
  });
});
