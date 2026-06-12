import { useEffect, useRef, useState } from 'preact/hooks';
import type { SearchEntry } from '@clean-jsdoc-theme/utils';
import { FAVORITE_KEY, MAX_FAVORITES, MAX_RECENT, RECENT_KEY } from './constants';
import type { SavedSearch } from './types';
import { loadSaved, saveSaved, toSaved, withSaved } from './utils';

export interface SavedSearches {
  recents: SavedSearch[];
  favorites: SavedSearch[];
  /** Record a selected result as a recent (skipped if it's already a favorite). */
  recordRecent: (entry: SavedSearch) => void;
  /** Promote a recent to a favorite (moves it out of the recent list). */
  addFavorite: (entry: SavedSearch) => void;
  removeRecent: (slug: string) => void;
  removeFavorite: (slug: string) => void;
}

/**
 * Recent + favorite searches, persisted to localStorage (issue #137). Hydrated
 * on mount (client only, so SSR stays pure) and pruned against the search index
 * once it loads, so a saved link can't point at a page that no longer exists.
 * Writes are synchronous and ref-backed, so a list change lands before any
 * navigation that follows a selection.
 */
export function useSavedSearches(entries: SearchEntry[] | null): SavedSearches {
  const [recents, setRecents] = useState<SavedSearch[]>([]);
  const [favorites, setFavorites] = useState<SavedSearch[]>([]);
  const recentsRef = useRef(recents);
  const favoritesRef = useRef(favorites);
  recentsRef.current = recents;
  favoritesRef.current = favorites;

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setRecents(loadSaved(RECENT_KEY, MAX_RECENT));
    setFavorites(loadSaved(FAVORITE_KEY, MAX_FAVORITES));
  }, []);

  const persistRecents = (next: SavedSearch[]) => {
    recentsRef.current = next;
    saveSaved(RECENT_KEY, next);
    setRecents(next);
  };
  const persistFavorites = (next: SavedSearch[]) => {
    favoritesRef.current = next;
    saveSaved(FAVORITE_KEY, next);
    setFavorites(next);
  };

  const recordRecent = (e: SavedSearch) => {
    if (favoritesRef.current.some((f) => f.slug === e.slug)) return;
    persistRecents(withSaved(recentsRef.current, toSaved(e), MAX_RECENT));
  };
  const addFavorite = (e: SavedSearch) => {
    persistFavorites(withSaved(favoritesRef.current, toSaved(e), MAX_FAVORITES));
    persistRecents(recentsRef.current.filter((r) => r.slug !== e.slug));
  };
  const removeRecent = (slug: string) =>
    persistRecents(recentsRef.current.filter((r) => r.slug !== slug));
  const removeFavorite = (slug: string) =>
    persistFavorites(favoritesRef.current.filter((r) => r.slug !== slug));

  // Once the index loads, drop saved searches whose page no longer exists.
  useEffect(() => {
    if (!entries) return;
    const valid = new Set(entries.map((e) => e.slug));
    const prunedRecents = recentsRef.current.filter((r) => valid.has(r.slug));
    if (prunedRecents.length !== recentsRef.current.length) persistRecents(prunedRecents);
    const prunedFavorites = favoritesRef.current.filter((r) => valid.has(r.slug));
    if (prunedFavorites.length !== favoritesRef.current.length) persistFavorites(prunedFavorites);
  }, [entries]);

  return { recents, favorites, recordRecent, addFavorite, removeRecent, removeFavorite };
}
