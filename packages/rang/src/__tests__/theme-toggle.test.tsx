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

  it('defaults to System after hydration', async () => {
    const { findByText } = render(<ThemeToggle />);
    const systemBtn = await findByText('System');
    await Promise.resolve();
    expect(systemBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking Dark updates dataset.theme and localStorage', async () => {
    const { findByText } = render(<ThemeToggle />);
    const darkBtn = await findByText('Dark');
    fireEvent.click(darkBtn);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(globalThis.localStorage.getItem('theme')).toBe('dark');
    expect(darkBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking System clears dataset.theme but persists the choice', async () => {
    const { findByText } = render(<ThemeToggle />);
    fireEvent.click(await findByText('Dark'));
    fireEvent.click(await findByText('System'));
    expect(document.documentElement.dataset.theme).toBe('');
    expect(globalThis.localStorage.getItem('theme')).toBe('system');
  });
});
