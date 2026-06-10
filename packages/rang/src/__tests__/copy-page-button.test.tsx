import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import { CopyPageButton } from '../components/CopyPageButton';

const MD = '# Title\n\nbody text';

describe('CopyPageButton', () => {
  let writeText: ReturnType<typeof vi.fn>;
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(MD) })
    );
    openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('copies the page markdown and shows "Copied" feedback', async () => {
    const { getByRole, findByRole } = render(<CopyPageButton mdUrl="/foo/index.md" />);
    fireEvent.click(getByRole('button', { name: /Copy page/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(MD));
    expect(fetch).toHaveBeenCalledWith('/foo/index.md');
    await findByRole('button', { name: /Copied/ });
  });

  it('opens a dropdown with the five actions', () => {
    const { getByRole, getAllByRole } = render(<CopyPageButton mdUrl="/foo/index.md" />);
    fireEvent.click(getByRole('button', { name: /More copy options/ }));
    const labels = getAllByRole('menuitem').map((i) => i.textContent);
    expect(labels[0]).toContain('Copy page');
    expect(labels[1]).toContain('View Markdown');
    expect(labels[2]).toContain('Open in Claude');
    expect(labels[3]).toContain('Open in ChatGPT');
    expect(labels[4]).toContain('Open in Perplexity');
  });

  it('opens Claude with the prompt + md link only (never the page body)', async () => {
    const { getByRole } = render(<CopyPageButton mdUrl="/foo/index.md" siteName="Acme Docs" />);
    fireEvent.click(getByRole('button', { name: /More copy options/ }));
    fireEvent.click(getByRole('menuitem', { name: /Open in Claude/ }));
    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith('https://claude.ai/new?q=')).toBe(true);
    const q = decodeURIComponent(url.slice('https://claude.ai/new?q='.length));
    const absMd = new URL('/foo/index.md', window.location.href).href;
    expect(q).toContain('Acme Docs'); // {siteName} substituted
    expect(q).toContain(absMd); // {mdUrl} → absolute raw link
    expect(q).not.toContain(MD); // the page body is NOT embedded
  });

  it('uses a custom prompt (with {siteName}/{mdUrl}) for ChatGPT when provided', async () => {
    const { getByRole } = render(
      <CopyPageButton
        mdUrl="/x/index.md"
        prompt="Read {mdUrl} for {siteName}"
        siteName="Acme Docs"
      />
    );
    fireEvent.click(getByRole('button', { name: /More copy options/ }));
    fireEvent.click(getByRole('menuitem', { name: /Open in ChatGPT/ }));
    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith('https://chatgpt.com/?q=')).toBe(true);
    const q = decodeURIComponent(url.slice('https://chatgpt.com/?q='.length));
    const absMd = new URL('/x/index.md', window.location.href).href;
    expect(q).toBe(`Read ${absMd} for Acme Docs`);
  });

  it('opens Perplexity with the md link, not the page body', async () => {
    const { getByRole } = render(<CopyPageButton mdUrl="/foo/index.md" siteName="Acme Docs" />);
    fireEvent.click(getByRole('button', { name: /More copy options/ }));
    fireEvent.click(getByRole('menuitem', { name: /Open in Perplexity/ }));
    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith('https://www.perplexity.ai/search?q=')).toBe(true);
    const q = decodeURIComponent(url.slice('https://www.perplexity.ai/search?q='.length));
    expect(q).toContain(new URL('/foo/index.md', window.location.href).href);
    expect(q).not.toContain(MD);
  });

  it('"View Markdown" opens the .md url in a new tab', () => {
    const { getByRole } = render(<CopyPageButton mdUrl="/foo/index.md" />);
    fireEvent.click(getByRole('button', { name: /More copy options/ }));
    fireEvent.click(getByRole('menuitem', { name: /View Markdown/ }));
    expect(openSpy).toHaveBeenCalledWith('/foo/index.md', '_blank', 'noopener,noreferrer');
  });

  it('shows only the configured dropdown actions, in order', () => {
    const { getByRole, getAllByRole } = render(
      <CopyPageButton mdUrl="/foo/index.md" actions={['copy', 'claude']} />
    );
    fireEvent.click(getByRole('button', { name: /More copy options/ }));
    const labels = getAllByRole('menuitem').map((i) => i.textContent);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain('Copy page');
    expect(labels[1]).toContain('Open in Claude');
  });

  it('renders just the primary button (no dropdown) when actions is empty', () => {
    const { getByRole, queryByRole } = render(
      <CopyPageButton mdUrl="/foo/index.md" actions={[]} />
    );
    expect(getByRole('button', { name: /Copy page/ })).toBeTruthy();
    // No dropdown trigger and nothing to open.
    expect(queryByRole('button', { name: /More copy options/ })).toBeNull();
  });
});
