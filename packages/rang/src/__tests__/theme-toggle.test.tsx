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

  it('defaults to system after hydration', async () => {
    const { findByRole } = render(<ThemeToggle />);
    const btn = await findByRole('button');
    await Promise.resolve();
    expect(btn.getAttribute('aria-label')).toBe('Theme: system');
  });

  it('cycles system → light → dark, updating dataset.theme and localStorage', async () => {
    const { findByRole } = render(<ThemeToggle />);
    const btn = await findByRole('button');
    await Promise.resolve();

    fireEvent.click(btn); // system → light
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
    expect(btn.getAttribute('aria-label')).toBe('Theme: light');

    fireEvent.click(btn); // light → dark
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(globalThis.localStorage.getItem('theme')).toBe('dark');
    expect(btn.getAttribute('aria-label')).toBe('Theme: dark');
  });

  it('cycling back to system clears dataset.theme but persists the choice', async () => {
    const { findByRole } = render(<ThemeToggle />);
    const btn = await findByRole('button');
    await Promise.resolve();

    fireEvent.click(btn); // light
    fireEvent.click(btn); // dark
    fireEvent.click(btn); // system
    expect(document.documentElement.dataset.theme).toBe('');
    expect(globalThis.localStorage.getItem('theme')).toBe('system');
  });
});
