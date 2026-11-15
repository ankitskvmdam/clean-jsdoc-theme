import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'preact-render-to-string';
import { render as mount, cleanup, waitFor, fireEvent } from '@testing-library/preact';
import { CtrlK } from '../components/CtrlK';
import { PageNav } from '../components/PageNav';

// #333: a class named `Index` is written to `index/index.html`. A link to `/index`
// is served as the home page's `index.html` by hosts like GitHub Pages, so every
// link to that page must carry the trailing slash: `/index/`.

const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const RECENT_KEY = 'clean-jsdoc-theme:recent-searches:en';
const INDEX = [
  { slug: 'index', title: 'Index', excerpt: 'A class named Index.' },
  { slug: 'dataprocessor', title: 'DataProcessor', excerpt: 'Processes data.' },
];

/** Mount the palette with a stubbed search index and open it with Ctrl K. */
async function openPalette() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(INDEX) })
  );
  const view = mount(<CtrlK basePath="/" searchIndexUrl="/_assets/search-index.abc.json" />);
  await flush();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  await view.findByRole('dialog');
  return view;
}

describe('links to a page whose slug is index carry a trailing slash (#333)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('the prev/next pager links the Index class to its own page', () => {
    const html = render(<PageNav prev={{ slug: 'index', title: 'Index' }} />);
    expect(html).toContain('href="/index/"');
    expect(html).not.toContain('href="/index"');
  });

  it('a search result links the Index class to its own page', async () => {
    const { findAllByRole, getByLabelText } = await openPalette();
    fireEvent.input(getByLabelText('Search query'), { target: { value: 'Index' } });
    const options = await findAllByRole('option');
    const hrefs = options.map((o) => o.querySelector('a')?.getAttribute('href'));
    expect(hrefs).toContain('/index/');
    expect(hrefs).not.toContain('/index');
  });

  it('a saved (recent) search links the Index class to its own page', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ slug: 'index', title: 'Index' }]));
    const { findByText } = await openPalette();
    await findByText('Recent');
    const link = (await findByText('Index')).closest('a');
    expect(link?.getAttribute('href')).toBe('/index/');
  });

  it('pressing Enter on the Index result navigates to its own page', async () => {
    const location = { href: '' };
    vi.spyOn(window, 'location', 'get').mockReturnValue(location as unknown as Location);
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ slug: 'index', title: 'Index' }]));
    const { findByText } = await openPalette();
    await findByText('Index');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await waitFor(() => expect(location.href).toBe('/index/'));
  });
});
