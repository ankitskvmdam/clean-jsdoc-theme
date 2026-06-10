import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { CopyBtn } from '../components/CopyBtn';

describe('CopyBtn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('writes the supplied text on click and flips the label to "Copied!"', async () => {
    const { getByRole, findByText } = render(<CopyBtn text="hello" />);
    const writeText = globalThis.navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    const button = getByRole('button');

    fireEvent.click(button);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'));
    const confirmation = await findByText('Copied!');
    expect(confirmation).toBeTruthy();
  });

  it('reverts label after the success window', async () => {
    const { getByRole, findByText, queryByText } = render(<CopyBtn text="hi" />);
    fireEvent.click(getByRole('button'));
    await findByText('Copied!');
    vi.advanceTimersByTime(2100);
    await vi.waitFor(() => expect(queryByText('Copied!')).toBeNull());
  });
});
