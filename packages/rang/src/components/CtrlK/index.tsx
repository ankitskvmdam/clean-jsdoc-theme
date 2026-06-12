import { useEffect, useRef, useState } from 'preact/hooks';
import { withBase } from '@clean-jsdoc-theme/utils';
import { useListKeyboardNav } from '../../hooks/use-list-keyboard-nav';
import { Dialog } from '../Dialog';
import { SearchFooter } from './SearchFooter';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { SearchTrigger } from './SearchTrigger';
import { useSavedSearches } from './use-saved-searches';
import { useSearchIndex } from './use-search-index';
import { useSearchResults } from './use-search-results';
import type { CtrlKProps, SavedSearch } from './types';

export type { CtrlKProps, SavedSearch, SavedKind } from './types';

/**
 * The `cmdk` island: a command-palette search over the fetched index, with
 * persisted recent + favorite searches. Composed from small pieces — see the
 * sibling files for each section, the saved-search store (`useSavedSearches`),
 * and the reusable list keyboard navigation (`useListKeyboardNav`).
 */
export function CtrlK({ basePath, searchIndexUrl }: CtrlKProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useSearchIndex(open, searchIndexUrl);
  const results = useSearchResults(query, entries);
  const { recents, favorites, recordRecent, addFavorite, removeRecent, removeFavorite } =
    useSavedSearches(entries);

  const hasQuery = query.trim().length > 0;
  // What arrow/Enter navigate, in render order: results while querying, else
  // favorites then recents (so the active index lines up with the rows).
  const navItems: SavedSearch[] = hasQuery ? results.map((r) => r.item) : [...favorites, ...recents];

  // Enter on the active row records it, then navigates. Rows handle their own
  // click via a real `<a href>`, so this path is keyboard selection only.
  const selectActive = (index: number) => {
    const item = navItems[index];
    if (!item) return;
    recordRecent(item);
    window.location.href = withBase(basePath, '/' + item.slug);
  };

  const { active, setActive } = useListKeyboardNav({
    enabled: open,
    count: navItems.length,
    onSelect: selectActive,
  });

  // Ctrl/Cmd K toggles the palette from anywhere (metaKey for macOS). Escape,
  // focus trap, and focus restore are handled by Dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus the input + reset the active row each time the palette opens (Dialog
  // focuses the panel first; the rAF runs after, so the input ends up focused).
  useEffect(() => {
    if (open) {
      setActive(0);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, setActive]);

  return (
    <>
      <SearchTrigger open={open} onOpen={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen} align="top" showClose={false} label="Search">
        <SearchInput
          value={query}
          inputRef={inputRef}
          onValueChange={(v) => {
            setQuery(v);
            setActive(0);
          }}
        />
        <SearchResults
          basePath={basePath}
          hasQuery={hasQuery}
          results={results}
          favorites={favorites}
          recents={recents}
          active={active}
          onActivate={setActive}
          onRecord={recordRecent}
          onFavorite={addFavorite}
          onRemoveRecent={removeRecent}
          onRemoveFavorite={removeFavorite}
        />
        <SearchFooter onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
