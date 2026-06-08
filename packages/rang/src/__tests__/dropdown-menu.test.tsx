import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/DropdownMenu';

function Menu({ onCopy }: { onCopy?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onCopy}>Copy page</DropdownMenuItem>
        <DropdownMenuItem href="https://example.com/chat">Open in ChatGPT</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  afterEach(() => cleanup());

  it('is closed by default — trigger present, no menu', () => {
    const { getByRole, queryByRole } = render(<Menu />);
    const trigger = getByRole('button', { name: 'Open' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(queryByRole('menu')).toBeNull();
  });

  it('opens on trigger click and renders its items', () => {
    const { getByRole, getAllByRole } = render(<Menu />);
    fireEvent.click(getByRole('button', { name: 'Open' }));
    expect(getByRole('menu')).toBeTruthy();
    expect(getByRole('button', { name: 'Open' }).getAttribute('aria-expanded')).toBe('true');
    expect(getAllByRole('menuitem')).toHaveLength(2);
  });

  it('fires onSelect and closes when an item is chosen', async () => {
    const onCopy = vi.fn();
    const { getByRole, queryByRole } = render(<Menu onCopy={onCopy} />);
    fireEvent.click(getByRole('button', { name: 'Open' }));
    fireEvent.click(getByRole('menuitem', { name: 'Copy page' }));
    expect(onCopy).toHaveBeenCalledOnce();
    await waitFor(() => expect(queryByRole('menu')).toBeNull());
  });

  it('renders a link item as an anchor', () => {
    const { getByRole } = render(<Menu />);
    fireEvent.click(getByRole('button', { name: 'Open' }));
    const link = getByRole('menuitem', { name: 'Open in ChatGPT' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('https://example.com/chat');
  });

  it('closes on Escape', async () => {
    const { getByRole, queryByRole } = render(<Menu />);
    fireEvent.click(getByRole('button', { name: 'Open' }));
    expect(getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(queryByRole('menu')).toBeNull());
  });

  it('closes on an outside pointerdown', async () => {
    const { getByRole, queryByRole } = render(
      <div>
        <Menu />
        <button type="button">outside</button>
      </div>,
    );
    fireEvent.click(getByRole('button', { name: 'Open' }));
    expect(getByRole('menu')).toBeTruthy();
    fireEvent.pointerDown(getByRole('button', { name: 'outside' }));
    await waitFor(() => expect(queryByRole('menu')).toBeNull());
  });
});
