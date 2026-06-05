import { useEffect, useRef, useState } from 'preact/hooks';
import { Search } from 'lucide-preact';
import { Button } from './Button';
import { Dialog } from './Dialog';

export interface CmdKProps {
  basePath: string;
}

interface SearchResult {
  slug: string;
  title: string;
}

export function CmdK({ basePath: _basePath }: CmdKProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openRef = useRef(open);
  const activeRef = useRef(active);

  // Phase 3 search is a stub — dwar's Phase 4 work wires Pagefind into this.
  const results: SearchResult[] = [];
  const resultsRef = useRef(results);

  openRef.current = open;
  activeRef.current = active;
  resultsRef.current = results;

  // Global shortcuts: Cmd/Ctrl+K toggles; arrows + Enter drive the result list
  // while open. (Escape, focus trap, and focus restore are handled by Dialog.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (isToggle) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (!openRef.current) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (resultsRef.current.length === 0) return;
        e.preventDefault();
        setActive((prev) => {
          const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
          return (next + resultsRef.current.length) % resultsRef.current.length;
        });
      } else if (e.key === 'Enter') {
        const target = resultsRef.current[activeRef.current];
        if (target) {
          window.location.href = `/${target.slug}`;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus the search input once the dialog has mounted (Dialog focuses the panel
  // first; this rAF runs after, so the input ends up focused).
  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Search"
        title="Search (Ctrl K)"
      >
        <Search size={18} aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen} align="top" showClose={false} label="Search">
        <div class="border-b border-border p-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onInput={(e) => {
              setQuery((e.currentTarget as HTMLInputElement).value);
              setActive(0);
            }}
            placeholder="Search docs..."
            class="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search query"
          />
        </div>
        <ul role="listbox" class="m-0 max-h-80 list-none overflow-y-auto p-2">
          {results.length === 0 ? (
            <li class="px-2 py-4 text-center text-sm text-muted-foreground">
              No results — search is wired in Phase 4
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.slug}
                role="option"
                aria-selected={i === active}
                class={`rounded px-3 py-2 text-sm ${i === active ? 'bg-accent' : ''}`}
              >
                <a href={`/${r.slug}`} class="block text-foreground">
                  {r.title}
                </a>
              </li>
            ))
          )}
        </ul>
        <div class="flex justify-end border-t border-border p-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close (Esc)
          </Button>
        </div>
      </Dialog>
    </>
  );
}
