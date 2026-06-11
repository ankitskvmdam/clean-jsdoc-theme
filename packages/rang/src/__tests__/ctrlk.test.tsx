import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { CtrlK } from '../components/CtrlK';

// Give Preact's microtask-scheduled effects a chance to attach window listeners
// before we dispatch the global keydown.
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('CtrlK', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens on Ctrl K and closes on Escape', async () => {
    const { queryByRole, findByRole } = render(<CtrlK basePath="/" />);
    await flush();
    expect(queryByRole('dialog')).toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await findByRole('dialog');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await waitFor(() => expect(queryByRole('dialog')).toBeNull());
  });

  it('opens on Ctrl K', async () => {
    const { findByRole } = render(<CtrlK basePath="/" />);
    await flush();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    const dialog = await findByRole('dialog');
    expect(dialog).toBeTruthy();
  });

  it('prompts to search when no index is available', async () => {
    const { findByText } = render(<CtrlK basePath="/" />);
    await flush();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    const msg = await findByText(/Type to search/);
    expect(msg).toBeTruthy();
  });

  it('fetches the index on open and fuzzy-matches the query', async () => {
    const index = [
      { slug: 'module/queue-queue/queue', title: 'Queue', excerpt: 'A job queue.' },
      { slug: 'dataprocessor', title: 'DataProcessor', excerpt: 'Processes data.' },
      { slug: 'baseentity', title: 'BaseEntity', excerpt: '' },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(index),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { findByRole, findAllByRole, getByLabelText } = render(
      <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
    );
    await flush();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await findByRole('dialog');

    // The index is fetched from the given URL on first open.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/_assets/search-index.abc.json'));

    // A fuzzy query ("dp") matches DataProcessor (D…P) but not Queue/BaseEntity.
    // The title renders as highlighted segments, so assert via the option's link.
    fireEvent.input(getByLabelText('Search query'), { target: { value: 'dp' } });
    const options = await findAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].querySelector('a')?.getAttribute('href')).toBe('/dataprocessor');
  });

  it('prefixes result links with basePath when set', async () => {
    const index = [{ slug: 'dataprocessor', title: 'DataProcessor', excerpt: 'Processes data.' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(index),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { findByRole, findAllByRole, getByLabelText } = render(
      <CtrlK basePath="/docs" searchIndexUrl="/docs/_assets/search-index.abc.json" />
    );
    await flush();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await findByRole('dialog');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.input(getByLabelText('Search query'), { target: { value: 'dp' } });
    const options = await findAllByRole('option');
    expect(options[0].querySelector('a')?.getAttribute('href')).toBe('/docs/dataprocessor');
  });
});
