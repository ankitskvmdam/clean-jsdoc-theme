import { useEffect, useRef, useState } from 'preact/hooks';

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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  const activeRef = useRef(active);

  // Phase 3 search is a stub — dwar's Phase 4 work wires Pagefind into this.
  const results: SearchResult[] = [];
  const resultsRef = useRef(results);

  openRef.current = open;
  activeRef.current = active;
  resultsRef.current = results;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (isToggle) {
        e.preventDefault();
        openerRef.current = (document.activeElement as HTMLElement | null) ?? null;
        setOpen((v) => !v);
        return;
      }
      if (!openRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
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

  useEffect(() => {
    if (open) {
      // Focus the input on the next tick so the dialog has mounted.
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } else if (openerRef.current) {
      openerRef.current.focus();
    }
  }, [open]);

  // Trap focus inside the dialog while it's open. Tabbing past the last
  // focusable wraps to the first, and vice-versa.
  const onTrapKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openerRef.current = (document.activeElement as HTMLElement | null) ?? null;
          setOpen(true);
        }}
        class="inline-flex items-center gap-2 rounded border border-[var(--clean-border)] bg-[var(--clean-bg-muted)] px-3 py-1 text-sm text-[var(--clean-fg-muted)] hover:bg-[var(--clean-bg)]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>Search</span>
        <kbd class="hidden rounded border border-[var(--clean-border)] bg-[var(--clean-bg)] px-1 py-0.5 text-xs sm:inline">Ctrl K</kbd>
      </button>
      {open && (
        <div
          class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onKeyDown={onTrapKey}
            class="w-full max-w-lg rounded-lg border border-[var(--clean-border)] bg-[var(--clean-bg)] shadow-xl"
          >
            <div class="border-b border-[var(--clean-border)] p-3">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onInput={(e) => {
                  setQuery((e.currentTarget as HTMLInputElement).value);
                  setActive(0);
                }}
                placeholder="Search docs..."
                class="w-full rounded border border-[var(--clean-border)] bg-[var(--clean-bg-muted)] px-3 py-2 text-sm text-[var(--clean-fg)] outline-none focus:border-[var(--clean-accent)]"
                aria-label="Search query"
              />
            </div>
            <ul role="listbox" class="m-0 max-h-80 list-none overflow-y-auto p-2">
              {results.length === 0 ? (
                <li class="px-2 py-4 text-center text-sm text-[var(--clean-fg-muted)]">
                  No results — search is wired in Phase 4
                </li>
              ) : (
                results.map((r, i) => (
                  <li
                    key={r.slug}
                    role="option"
                    aria-selected={i === active}
                    class={`rounded px-3 py-2 text-sm ${i === active ? 'bg-[var(--clean-bg-muted)]' : ''}`}
                  >
                    <a href={`/${r.slug}`} class="block text-[var(--clean-fg)]">
                      {r.title}
                    </a>
                  </li>
                ))
              )}
            </ul>
            <div class="flex justify-end border-t border-[var(--clean-border)] p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                class="rounded px-2 py-1 text-xs text-[var(--clean-fg-muted)] hover:bg-[var(--clean-bg-muted)]"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
