import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { Settings } from '../components/Settings';

describe('Settings', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    document.documentElement.style.removeProperty('font-size');
    document.documentElement.style.removeProperty('--clean-line-height');
  });

  afterEach(() => cleanup());

  it('renders an icon trigger and no dialog initially', () => {
    const { getByRole, queryByRole } = render(<Settings />);
    expect(getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(queryByRole('dialog')).toBeNull();
  });

  it('opens the dialog on click and closes on Escape', async () => {
    const { getByRole, queryByRole, findByRole } = render(<Settings />);
    fireEvent.click(getByRole('button', { name: 'Settings' }));
    await findByRole('dialog');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await waitFor(() => expect(queryByRole('dialog')).toBeNull());
  });

  it('closes the dialog via the close button', async () => {
    const { getByRole, queryByRole, findByRole } = render(<Settings />);
    fireEvent.click(getByRole('button', { name: 'Settings' }));
    const dialog = await findByRole('dialog');
    fireEvent.click(dialog.querySelector('button')!); // first button = close
    await waitFor(() => expect(queryByRole('dialog')).toBeNull());
  });

  it('applies and persists the font size choice', async () => {
    const { getByRole, findByRole } = render(<Settings />);
    fireEvent.click(getByRole('button', { name: 'Settings' }));
    await findByRole('dialog');

    fireEvent.click(getByRole('button', { name: 'Large' }));
    expect(document.documentElement.style.fontSize).toBe('18px');
    expect(globalThis.localStorage.getItem('clean-font-size')).toBe('lg');
  });

  it('applies and persists the line spacing choice', async () => {
    const { getByRole, findByRole } = render(<Settings />);
    fireEvent.click(getByRole('button', { name: 'Settings' }));
    await findByRole('dialog');

    fireEvent.click(getByRole('button', { name: 'Relaxed' }));
    expect(document.documentElement.style.getPropertyValue('--clean-line-height')).toBe('1.8');
    expect(globalThis.localStorage.getItem('clean-line-spacing')).toBe('relaxed');
  });
});
