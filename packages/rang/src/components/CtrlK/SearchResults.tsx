import { useEffect, useRef } from 'preact/hooks';
import { useTranslation } from '@clean-jsdoc-theme/bhasha';
import type { SearchEntry } from '@clean-jsdoc-theme/utils';
import type { FuzzyResult } from '../search-utils';
import type { SavedSearch } from './types';
import { ResultRow } from './ResultRow';
import { SavedSections } from './SavedSections';

export interface SearchResultsProps {
  basePath: string;
  hasQuery: boolean;
  results: FuzzyResult<SearchEntry>[];
  favorites: SavedSearch[];
  recents: SavedSearch[];
  active: number;
  onActivate: (index: number) => void;
  /** Record a selection (rows navigate via their own `<a href>`). */
  onRecord: (item: SavedSearch) => void;
  onFavorite: (item: SavedSearch) => void;
  onRemoveRecent: (slug: string) => void;
  onRemoveFavorite: (slug: string) => void;
}

/**
 * The scrollable listbox: fuzzy results while there's a query, otherwise the
 * favorite/recent sections. Owns the active-row scroll-into-view behavior.
 */
export function SearchResults({
  basePath,
  hasQuery,
  results,
  favorites,
  recents,
  active,
  onActivate,
  onRecord,
  onFavorite,
  onRemoveRecent,
  onRemoveFavorite,
}: SearchResultsProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLUListElement | null>(null);

  // Keep the active row scrolled into view as arrow keys move it.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label={t('chrome.search.resultsLabel')}
      class="m-0 max-h-80 list-none overflow-y-auto p-2"
    >
      {hasQuery ? (
        results.length === 0 ? (
          <li class="px-2 py-6 text-center text-sm text-muted-foreground">
            {t('chrome.search.noResults')}
          </li>
        ) : (
          results.map((r, i) => (
            <ResultRow
              key={r.item.slug}
              basePath={basePath}
              result={r}
              active={i === active}
              onActivate={() => onActivate(i)}
              onRecord={() => onRecord(r.item)}
            />
          ))
        )
      ) : (
        <SavedSections
          basePath={basePath}
          favorites={favorites}
          recents={recents}
          active={active}
          onActivate={onActivate}
          onRecord={onRecord}
          onFavorite={onFavorite}
          onRemoveRecent={onRemoveRecent}
          onRemoveFavorite={onRemoveFavorite}
        />
      )}
    </ul>
  );
}
