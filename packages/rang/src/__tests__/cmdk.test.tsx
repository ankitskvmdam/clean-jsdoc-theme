import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/preact';
import { CmdK } from '../components/CmdK';

// Give Preact's microtask-scheduled effects a chance to attach window listeners
// before we dispatch the global keydown.
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('CmdK', () => {
  afterEach(() => cleanup());

  it('opens on Cmd+K and closes on Escape', async () => {
    const { queryByRole, findByRole } = render(<CmdK basePath="/" />);
    await flush();
    expect(queryByRole('dialog')).toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    await findByRole('dialog');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await waitFor(() => expect(queryByRole('dialog')).toBeNull());
  });

  it('opens on Ctrl+K', async () => {
    const { findByRole } = render(<CmdK basePath="/" />);
    await flush();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    const dialog = await findByRole('dialog');
    expect(dialog).toBeTruthy();
  });

  it('shows the Phase 4 stub message when there are no results', async () => {
    const { findByText } = render(<CmdK basePath="/" />);
    await flush();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    const msg = await findByText(/No results/);
    expect(msg).toBeTruthy();
  });
});
