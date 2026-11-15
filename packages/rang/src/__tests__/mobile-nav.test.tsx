import { describe, it, expect, afterEach } from 'vitest';
import { render as mount, fireEvent, cleanup } from '@testing-library/preact';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { MobileNav } from '../components/MobileNav';

// Flat, grouped nav — the shape setu's buildNav emits.
const FLAT: NavNode[] = [
  { label: 'CoreSchema', slug: 'module/coreschema', group: 'Modules', order: 0 },
  { label: 'BaseEntity', slug: 'baseentity', group: 'Classes', order: 2 },
  { label: 'DataProcessor', slug: 'dataprocessor', group: 'Classes', order: 2 },
];

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
  { label: 'Other', slug: 'other', group: 'Modules' },
];

/** Mount the island and open the drawer, as a tap on the header button does. */
function openDrawer(nav: NavNode[], currentSlug: string): HTMLElement {
  const { getByLabelText, getByRole } = mount(<MobileNav nav={nav} currentSlug={currentSlug} />);
  fireEvent.click(getByLabelText('Open navigation'));
  return getByRole('dialog');
}

describe('MobileNav drawer marks the current page (#303)', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('marks the current page link, and only that one', () => {
    const drawer = openDrawer(FLAT, 'dataprocessor');
    const current = drawer.querySelectorAll('a[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe('DataProcessor');
    expect(current[0].getAttribute('href')).toBe('/dataprocessor');
  });

  it('gives the current link the same active treatment the desktop sidebar uses', () => {
    const drawer = openDrawer(FLAT, 'dataprocessor');
    const current = drawer.querySelector('a[aria-current="page"]')!;
    const other = drawer.querySelector('a[href="/baseentity"]')!;
    expect(current.className).not.toBe(other.className);
  });

  it("opens the current page's parent item so the marked link is visible", () => {
    const drawer = openDrawer(CLUB, 'module/queue-queue');
    const toggle = drawer.querySelector('button[aria-expanded]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const current = drawer.querySelector('a[aria-current="page"]')!;
    expect(current.textContent).toBe('Queue');
  });

  it('marks nothing when the current page is not in the nav', () => {
    const drawer = openDrawer(FLAT, 'elsewhere');
    expect(drawer.querySelectorAll('a[aria-current="page"]')).toHaveLength(0);
  });
});
