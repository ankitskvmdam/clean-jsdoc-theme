import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'preact-render-to-string';
import { render as mount, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { Sidebar } from '../components/Sidebar';

/** A two-child clubbed parent under "Modules" (as setu emits when clubbing). */
const CLUB: NavNode[] = [
  {
    label: 'queue',
    group: 'Modules',
    children: [
      { label: 'index', slug: 'module/queue', group: 'Modules' },
      { label: 'Queue', slug: 'module/queue-queue', group: 'Modules' },
    ],
  },
];

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

  it('auto-opens the club holding the current page, revealing its children', () => {
    const html = render(<Sidebar nav={CLUB} currentSlug="module/queue-queue" />);
    // The parent is a toggle button (no self-link), expanded since it holds active.
    expect(html).toContain('queue');
    expect(html).not.toContain('href="/queue"');
    expect(html).toContain('aria-expanded="true"');
    // Children render as real links under it; the active child carries aria-current.
    expect(html).toContain('href="/module/queue"');
    expect(html).toContain('href="/module/queue-queue"');
    expect(html).toMatch(/aria-current="page"[^>]*>(?:<[^>]*>)*Queue/);
  });

  it('collapses a club by default when it does not hold the current page', () => {
    const html = render(<Sidebar nav={CLUB} currentSlug="" />);
    expect(html).toContain('aria-expanded="false"');
    // Children are not rendered while collapsed.
    expect(html).not.toContain('href="/module/queue"');
    expect(html).not.toContain('href="/module/queue-queue"');
  });
});

describe('Sidebar — collapsible clubs (interactive)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('reveals children on click and persists the open state', () => {
    const { getByRole, queryByRole } = mount(<Sidebar nav={CLUB} currentSlug="" />);
    // Collapsed by default: no child links yet.
    expect(queryByRole('link', { name: 'index' })).toBeNull();

    fireEvent.click(getByRole('button', { name: /queue/ }));

    // Children appear, and the choice is persisted to localStorage.
    expect(getByRole('link', { name: 'index' })).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('clean-jsdoc-theme:sidebar-open') ?? '{}');
    expect(stored['Modules::queue']).toBe(true);
  });

  it('restores a persisted collapsed state over the auto-open default', async () => {
    // User previously collapsed the club that holds the current page.
    localStorage.setItem(
      'clean-jsdoc-theme:sidebar-open',
      JSON.stringify({ 'Modules::queue': false })
    );
    const { queryByRole } = mount(<Sidebar nav={CLUB} currentSlug="module/queue-queue" />);
    // Despite holding the active page, the stored `false` wins → collapsed once
    // the persisted state loads on mount.
    await waitFor(() => expect(queryByRole('link', { name: 'Queue' })).toBeNull());
  });
});

describe('Sidebar — menu region (icons + external links)', () => {
  // The menu top region as setu emits it: each entry flagged `menu: true`,
  // icons as prefixed `source:code` strings.
  const menuNav: NavNode[] = [
    { label: 'Home', slug: '', icon: 'lucide:home', menu: true },
    {
      label: 'GitHub',
      href: 'https://github.com/x/y',
      external: true,
      icon: 'simpleicons:github',
      menu: true,
    },
    { label: 'Source files', slug: 'source', icon: 'lucide:code-xml', menu: true },
    { label: 'BaseEntity', slug: 'baseentity', group: 'Classes' },
  ];

  it('renders an external link with target=_blank and rel', () => {
    const html = render(<Sidebar nav={menuNav} currentSlug="" />);
    expect(html).toContain('href="https://github.com/x/y"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('paints a simpleicons: glyph with the fg token via a CSS mask', () => {
    const html = render(<Sidebar nav={menuNav} currentSlug="" />);
    // Silhouette SVG used as a mask (no baked-in color in the URL)...
    expect(html).toContain('cdn.simpleicons.org/github');
    expect(html).not.toContain('cdn.simpleicons.org/github/');
    // ...filled with the fg theme token, which swaps light/dark on its own.
    expect(html).toContain('bg-(--clean-fg)');
    expect(html).toContain('mask:url(https://cdn.simpleicons.org/github)');
  });

  it('renders a bundled lucide icon for a lucide: icon, not a CDN image', () => {
    const html = render(
      <Sidebar
        nav={[{ label: 'Home', slug: '', icon: 'lucide:home', menu: true }]}
        currentSlug=""
      />
    );
    expect(html).toContain('lucide-house'); // lucide `home` maps to the House glyph
    expect(html).not.toContain('cdn.simpleicons.org');
  });

  it('falls back to external-link for an unknown lucide: icon', () => {
    const html = render(
      <Sidebar
        nav={[{ label: 'X', href: 'https://x.y', external: true, icon: 'lucide:nope', menu: true }]}
        currentSlug=""
      />
    );
    expect(html).toContain('lucide-external-link');
    expect(html).not.toContain('cdn.simpleicons.org');
  });

  it('renders the menu region above the sections, separated by a divider', () => {
    const html = render(<Sidebar nav={menuNav} currentSlug="" />);
    // A horizontal rule divides the menu region from the Classes section.
    expect(html).toContain('<hr');
    // Menu entries precede the section entry; the divider sits between them.
    expect(html.indexOf('Source files')).toBeLessThan(html.indexOf('<hr'));
    expect(html.indexOf('<hr')).toBeLessThan(html.indexOf('BaseEntity'));
  });
});
