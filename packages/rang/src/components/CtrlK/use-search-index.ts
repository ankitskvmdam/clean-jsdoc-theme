import { useEffect, useState } from 'preact/hooks';
import type { SearchEntry } from '@clean-jsdoc-theme/utils';

/**
 * Lazily fetch the JSON search index the first time `open` becomes true. Returns
 * `null` until loaded; a failed/missing fetch resolves to `[]` so search shows
 * "no results" instead of breaking the page.
 */
export function useSearchIndex(open: boolean, searchIndexUrl?: string): SearchEntry[] | null {
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);

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

  return entries;
}
