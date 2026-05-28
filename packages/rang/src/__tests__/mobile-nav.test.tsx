import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import type { NavNode } from '@clean-jsdoc-theme/utils';
import { MobileNav } from '../components/MobileNav';

const nav: NavNode[] = [
  { label: 'Home', slug: 'index' },
  { label: 'Guide', slug: 'guide' },
];

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('MobileNav', () => {
  afterEach(() => cleanup());

  it('opens the drawer when the hamburger is clicked', async () => {
    const { getByLabelText, getByRole } = render(<MobileNav nav={nav} currentSlug="index" />);
    fireEvent.click(getByLabelText('Open navigation menu'));
    await flush();
    const dialog = getByRole('dialog');
    expect(dialog).toBeTruthy();
    const container = dialog.parentElement;
    expect(container?.getAttribute('aria-hidden')).toBe('false');
  });

  it('closes the drawer on Escape', async () => {
    const { getByLabelText, getByRole } = render(<MobileNav nav={nav} currentSlug="index" />);
    fireEvent.click(getByLabelText('Open navigation menu'));
    await flush();
    const container = getByRole('dialog').parentElement;
    expect(container?.getAttribute('aria-hidden')).toBe('false');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await waitFor(() => expect(container?.getAttribute('aria-hidden')).toBe('true'));
  });

  it('closes the drawer when the close button is clicked', async () => {
    const { getByLabelText, getByRole } = render(<MobileNav nav={nav} currentSlug="index" />);
    fireEvent.click(getByLabelText('Open navigation menu'));
    await flush();
    const container = getByRole('dialog').parentElement;
    expect(container?.getAttribute('aria-hidden')).toBe('false');

    fireEvent.click(getByLabelText('Close navigation menu'));
    await waitFor(() => expect(container?.getAttribute('aria-hidden')).toBe('true'));
  });
});
