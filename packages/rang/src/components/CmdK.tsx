import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Search } from 'lucide-preact';
import type { SearchEntry } from '@clean-jsdoc-theme/utils';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { fuzzySearchMulti, highlightSegments, type FuzzyResult } from './search-utils';

export interface CmdKProps {
  basePath: string;
  /**
   * URL of the JSON search index dwar emits (one {@link SearchEntry} per
   * non-hidden page). Fetched lazily on first open. When omitted, the palette
   * opens but reports an empty index.
   */
  searchIndexUrl?: string;
}

/** Result-list cap — fuzzySearch already limits, this keeps the DOM small too. */
const MAX_RESULTS = 25;

/** Render a title with its fuzzy-matched characters emphasized. */
function Highlighted({ text, positions }: { text: string; positions: number[] }) {
  return (
    <>
      {highlightSegments(text, positions).map((seg, i) =>
        seg.match ? (
          <mark key={i} class="bg-transparent font-semibold text-primary">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

export function CmdK({ basePath: _basePath, searchIndexUrl }: CmdKProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  // Search index: `null` until fetched. Fetched once, lazily, on first open.
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const openRef = useRef(open);
  const activeRef = useRef(active);

  // Match across fields, not just the title: descriptions and full page content
  // (member names, README prose) are searchable, with the title weighted highest
  // so a title hit still ranks above a body-only hit. The title field drives
  // highlighting. `context` (a member entry's parent page) is matched too, so
  // typing the class name surfaces its members.
  const results: FuzzyResult<SearchEntry>[] = useMemo(
    () =>
      entries
        ? fuzzySearchMulti(
            query,
            entries,
            [
              { get: (e) => e.title, weight: 1, highlight: true },
              { get: (e) => e.context, weight: 0.6 },
              { get: (e) => e.description, weight: 0.5 },
              { get: (e) => e.content, weight: 0.35 },
            ],
            MAX_RESULTS
          )
        : [],
    [query, entries]
  );
  const resultsRef = useRef(results);

  openRef.current = open;
  activeRef.current = active;
  resultsRef.current = results;

  // Lazily load the index the first time the palette opens. A failed/missing
  // fetch resolves to an empty index rather than throwing — search just shows
  // "no results" instead of breaking the page.
  useEffect(() => {
    if (!open || entries !== null || !searchIndexUrl) return;
    let cancelled = false;
    fetch(searchIndexUrl)
      .then((r) => (r.ok ? (r.json() as Promise<SearchEntry[]>) : []))
      .then((data) => {
        if (!cancelled) setEntries(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entries, searchIndexUrl]);

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
          window.location.href = `/${target.item.slug}`;
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

  // Keep the active row scrolled into view as arrow keys move it.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const hasQuery = query.trim().length > 0;

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
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          class="m-0 max-h-80 list-none overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <li class="px-2 py-6 text-center text-sm text-muted-foreground">
              {hasQuery ? 'No matching pages' : 'Type to search the docs'}
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.item.slug}
                role="option"
                aria-selected={i === active}
                class={`rounded px-3 py-2 text-sm ${i === active ? 'bg-accent' : ''}`}
                onMouseMove={() => setActive(i)}
              >
                <a href={`/${r.item.slug}`} class="block text-foreground no-underline">
                  <span class="block">
                    <Highlighted text={r.item.title} positions={r.match.positions} />
                    {/* Member hits show their parent page as an inline crumb. */}
                    {r.item.context ? (
                      <span class="ml-2 text-xs text-muted-foreground">in {r.item.context}</span>
                    ) : null}
                  </span>
                  {!r.item.context && (r.item.excerpt || r.item.description) ? (
                    <span class="mt-0.5 block truncate text-xs text-muted-foreground">
                      {r.item.excerpt || r.item.description}
                    </span>
                  ) : null}
                </a>
              </li>
            ))
          )}
        </ul>
        <div class="flex items-center justify-between border-t border-border p-2 text-xs text-muted-foreground">
          <span class="px-1">↑↓ to navigate · ↵ to open · esc to close</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
}
