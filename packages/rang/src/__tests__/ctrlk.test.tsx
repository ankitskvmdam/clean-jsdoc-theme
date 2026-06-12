import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { CtrlK } from '../components/CtrlK';

// Give Preact's microtask-scheduled effects a chance to attach window listeners
// before we dispatch the global keydown.
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

const RECENT_KEY = 'clean-jsdoc-theme:recent-searches';
const FAVORITE_KEY = 'clean-jsdoc-theme:favorite-searches';

describe('CtrlK', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
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

  describe('recent searches', () => {
    const index = [
      { slug: 'queue', title: 'Queue', excerpt: 'A job queue.' },
      { slug: 'dataprocessor', title: 'DataProcessor', excerpt: 'Processes data.' },
    ];
    const stubIndex = () =>
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(index) })
      );

    it('shows the recent list (not the empty prompt) when the palette opens', async () => {
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify([{ slug: 'dataprocessor', title: 'DataProcessor' }])
      );
      stubIndex();
      const { findByRole, findByText, queryByText } = render(
        <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
      );
      await flush();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      await findByRole('dialog');

      await findByText('Recent');
      const link = (await findByText('DataProcessor')).closest('a');
      expect(link?.getAttribute('href')).toBe('/dataprocessor');
      expect(queryByText(/Type to search/)).toBeNull();
    });

    it('records a selected result into localStorage', async () => {
      stubIndex();
      const { findByRole, findAllByRole, getByLabelText } = render(
        <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
      );
      await flush();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      await findByRole('dialog');
      await waitFor(() => expect(localStorage).toBeTruthy());

      fireEvent.input(getByLabelText('Search query'), { target: { value: 'dp' } });
      const options = await findAllByRole('option');
      // Clicking a result records it (the <a>'s onClick fires before navigation).
      fireEvent.click(options[0].querySelector('a')!);

      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ slug: 'dataprocessor', title: 'DataProcessor' });
    });

    it('removes a recent via its × button and persists the removal', async () => {
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify([
          { slug: 'queue', title: 'Queue' },
          { slug: 'dataprocessor', title: 'DataProcessor' },
        ])
      );
      stubIndex();
      const { findByRole, findByLabelText, queryByText } = render(
        <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
      );
      await flush();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      await findByRole('dialog');

      fireEvent.click(await findByLabelText('Remove Queue from recent searches'));

      await waitFor(() => expect(queryByText('Queue')).toBeNull());
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      expect(stored.map((r: { slug: string }) => r.slug)).toEqual(['dataprocessor']);
    });

    it('prunes recents whose page is no longer in the index (issue #137 validation)', async () => {
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify([
          { slug: 'gone', title: 'Removed Page' },
          { slug: 'dataprocessor', title: 'DataProcessor' },
        ])
      );
      stubIndex();
      const { findByRole, findByText, queryByText } = render(
        <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
      );
      await flush();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      await findByRole('dialog');

      // The valid recent survives; the stale one is dropped from the UI + storage.
      await findByText('DataProcessor');
      await waitFor(() => expect(queryByText('Removed Page')).toBeNull());
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      expect(stored.map((r: { slug: string }) => r.slug)).toEqual(['dataprocessor']);
    });

    it('shows favorites in their own section above recents', async () => {
      localStorage.setItem(FAVORITE_KEY, JSON.stringify([{ slug: 'queue', title: 'Queue' }]));
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify([{ slug: 'dataprocessor', title: 'DataProcessor' }])
      );
      stubIndex();
      const { findByRole, findByText } = render(
        <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
      );
      await flush();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      await findByRole('dialog');

      await findByText('Favorite');
      await findByText('Recent');
      expect((await findByText('Queue')).closest('a')?.getAttribute('href')).toBe('/queue');
    });

    it('promotes a recent to favorites via its ★ button, moving it between lists', async () => {
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify([{ slug: 'dataprocessor', title: 'DataProcessor' }])
      );
      stubIndex();
      const { findByRole, findByLabelText } = render(
        <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
      );
      await flush();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      await findByRole('dialog');

      fireEvent.click(await findByLabelText('Save DataProcessor to favorites'));

      await waitFor(() => {
        const favs = JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]');
        expect(favs.map((r: { slug: string }) => r.slug)).toEqual(['dataprocessor']);
      });
      // …and it leaves the recent list.
      expect(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')).toEqual([]);
    });

    it('does not record a favorited page as a recent when selected', async () => {
      localStorage.setItem(
        FAVORITE_KEY,
        JSON.stringify([{ slug: 'dataprocessor', title: 'DataProcessor' }])
      );
      stubIndex();
      const { findByRole, findByText } = render(
        <CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />
      );
      await flush();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      await findByRole('dialog');

      fireEvent.click((await findByText('DataProcessor')).closest('a')!);
      // A favorite stays in favorites only — not duplicated into recents.
      expect(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')).toEqual([]);
    });
  });
});
