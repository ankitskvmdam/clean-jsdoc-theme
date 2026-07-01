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

  it('prefixes nav links with basePath when set', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="" basePath="/docs" />);
    expect(html).toContain('href="/docs/module/coreschema"');
    expect(html).toContain('href="/docs/baseentity"');
    expect(html).toContain('href="/docs/dataprocessor"');
    expect(html).not.toContain('href="/baseentity"');
  });

  it('prefixes clubbed child nav links with basePath', () => {
    const html = render(<Sidebar nav={CLUB} currentSlug="module/queue" basePath="/docs" />);
    expect(html).toContain('href="/docs/module/queue"');
    expect(html).toContain('href="/docs/module/queue-queue"');
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

describe('Sidebar — module node that is both a link and expandable (typedoc)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  // A module node carries BOTH `slug` (the module page) and `children` (its
  // exported members) — TypeDoc's default sidebar shape (Task 1 on this branch).
  const MODULE_WITH_SLUG: NavNode[] = [
    {
      label: 'queue',
      slug: 'modules/queue',
      group: 'Modules',
      children: [
        { label: 'Queue', slug: 'classes/queue-queue', group: 'Modules' },
        { label: 'QueueOptions', slug: 'interfaces/queue-options', group: 'Modules' },
      ],
    },
  ];

  it('renders both a navigable link to the module slug and a chevron toggle', () => {
    const html = render(<Sidebar nav={MODULE_WITH_SLUG} currentSlug="" />);
    // The label is a real link to the module's own page...
    expect(html).toContain('href="/modules/queue"');
    expect(html).toMatch(/<a[^>]*href="\/modules\/queue"[^>]*>(?:<[^>]*>)*queue/);
    // ...and a sibling toggle control (not nested inside the link) exposes
    // aria-expanded, so the link and the toggle are two separate interactive
    // controls in the row.
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toMatch(/<a[^>]*href="\/modules\/queue"[^>]*>(?:(?!<\/a>).)*aria-expanded/s);
  });

  it('reveals children when the toggle is clicked, without navigating', () => {
    const { getByRole, queryByRole } = mount(<Sidebar nav={MODULE_WITH_SLUG} currentSlug="" />);
    // Collapsed by default (no descendant is current): only the module's own
    // link is present, no child links yet.
    expect(queryByRole('link', { name: 'Queue' })).toBeNull();
    const moduleLink = getByRole('link', { name: 'queue' });
    expect(moduleLink.getAttribute('href')).toBe('/modules/queue');

    // The toggle is a separate control from the link.
    const toggle = getByRole('button', { name: /queue/ });
    expect(toggle.tagName).not.toBe('A');
    fireEvent.click(toggle);

    expect(getByRole('link', { name: 'Queue' })).toBeTruthy();
    expect(getByRole('link', { name: 'QueueOptions' })).toBeTruthy();
    // Clicking the toggle didn't remove or replace the module's own link.
    expect(getByRole('link', { name: 'queue' }).getAttribute('href')).toBe('/modules/queue');
  });

  it('auto-expands when a descendant is the current page and highlights the descendant', () => {
    const html = render(
      <Sidebar nav={MODULE_WITH_SLUG} currentSlug="classes/queue-queue" />
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('href="/classes/queue-queue"');
    expect(html).toMatch(/aria-current="page"[^>]*>(?:<[^>]*>)*Queue/);
  });

  it('highlights the module link itself when its own slug is current', () => {
    const html = render(<Sidebar nav={MODULE_WITH_SLUG} currentSlug="modules/queue" />);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/modules\/queue"|href="\/modules\/queue"[^>]*aria-current="page"/);
  });

  it('a folder node (children, no slug) still renders no link — label-only toggle', () => {
    const html = render(<Sidebar nav={CLUB} currentSlug="" />);
    expect(html).not.toContain('href="/queue"');
    expect(html).toContain('aria-expanded');
  });

  it('a leaf node (no children) still renders a plain link', () => {
    const html = render(<Sidebar nav={fixture} currentSlug="" />);
    expect(html).toContain('href="/baseentity"');
    expect(html).not.toMatch(/aria-expanded/);
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

  it('honors a menu entry `target` override and merges its `class`', () => {
    // An external entry pointing back into the site, forced to open in the same
    // tab and tagged with a custom class.
    const html = render(
      <Sidebar
        nav={[
          {
            label: 'Changelog',
            href: 'https://example.com/changelog',
            external: true,
            target: '_self',
            class: 'menu-changelog',
            menu: true,
          },
        ]}
        currentSlug=""
      />
    );
    expect(html).toContain('target="_self"');
    // _self is not a new tab, so the noopener rel is dropped.
    expect(html).not.toContain('rel="noopener noreferrer"');
    expect(html).toContain('menu-changelog');
  });

  it('applies `target`/`class` to a built-in internal menu link', () => {
    const html = render(
      <Sidebar
        nav={[{ label: 'Home', slug: '', target: '_self', class: 'menu-home', menu: true }]}
        currentSlug=""
      />
    );
    expect(html).toContain('href="/"');
    expect(html).toContain('target="_self"');
    expect(html).toContain('menu-home');
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
