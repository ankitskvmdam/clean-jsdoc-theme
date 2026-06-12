import { useMemo } from 'preact/hooks';
import type { SearchEntry } from '@clean-jsdoc-theme/utils';
import { fuzzySearchMulti, type FuzzyResult } from '../search-utils';
import { MAX_RESULTS } from './constants';

/**
 * Fuzzy-match `query` across a {@link SearchEntry}'s fields — not just the title:
 * descriptions and full page content (member names, README prose) are searchable
 * too, with the title weighted highest so a title hit still ranks above a
 * body-only hit. The title field drives highlighting; `context` (a member
 * entry's parent page) is matched so typing the class name surfaces its members.
 */
export function useSearchResults(
  query: string,
  entries: SearchEntry[] | null
): FuzzyResult<SearchEntry>[] {
  return useMemo(
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
}
