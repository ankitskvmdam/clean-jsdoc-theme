import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { ThemeToggle } from '../components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('defaults to light after hydration', async () => {
    const { findByRole } = render(<ThemeToggle />);
    const btn = await findByRole('button');
    await Promise.resolve();

    expect(document.documentElement.dataset.theme).toBe('light');
    // The label advertises the *next* mode you'd switch to.
    expect(btn.getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('toggles light → dark → light, updating dataset.theme and localStorage', async () => {
    const { findByRole } = render(<ThemeToggle />);
    const btn = await findByRole('button');
    await Promise.resolve();

    fireEvent.click(btn); // light → dark
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(globalThis.localStorage.getItem('theme')).toBe('dark');
    expect(btn.getAttribute('aria-label')).toBe('Switch to light theme');

    fireEvent.click(btn); // dark → light
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
    expect(btn.getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('honors a stored dark preference on hydration', async () => {
    globalThis.localStorage.setItem('theme', 'dark');
    const { findByRole } = render(<ThemeToggle />);
    const btn = await findByRole('button');
    await Promise.resolve();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(btn.getAttribute('aria-label')).toBe('Switch to light theme');
  });
});
