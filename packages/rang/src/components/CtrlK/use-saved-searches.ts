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
 * The active locale code from `<html lang>` (dwar sets it per built site). Used
 * to scope saved-search keys per locale, since every locale shares one origin's
 * localStorage but its saved slugs/titles only resolve against that locale's
 * search index (issue: switching language wiped/overwrote the lists).
 */
function currentLocale(): string {
  if (typeof document === 'undefined') return 'en';
  return document.documentElement.lang || 'en';
}

/** Suffix a base storage key with the active locale (`…:recent-searches:ja`). */
function scopedKey(base: string): string {
  return `${base}:${currentLocale()}`;
}

/**
 * Recent + favorite searches, persisted to localStorage (issue #137). Hydrated
 * on mount (client only, so SSR stays pure) and pruned against the search index
 * once it loads, so a saved link can't point at a page that no longer exists.
 * Writes are synchronous and ref-backed, so a list change lands before any
 * navigation that follows a selection. The storage keys are **scoped per locale**
 * so each language keeps its own independent lists that survive a switch.
 */
export function useSavedSearches(entries: SearchEntry[] | null): SavedSearches {
  const [recents, setRecents] = useState<SavedSearch[]>([]);
  const [favorites, setFavorites] = useState<SavedSearch[]>([]);
  const recentsRef = useRef(recents);
  const favoritesRef = useRef(favorites);
  recentsRef.current = recents;
  favoritesRef.current = favorites;
  // Locale-scoped keys, resolved once on the client (the ref initializer runs at
  // the hydration render, where `document.documentElement.lang` is available).
  const recentKey = useRef(scopedKey(RECENT_KEY)).current;
  const favoriteKey = useRef(scopedKey(FAVORITE_KEY)).current;

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setRecents(loadSaved(recentKey, MAX_RECENT));
    setFavorites(loadSaved(favoriteKey, MAX_FAVORITES));
  }, [recentKey, favoriteKey]);

  const persistRecents = (next: SavedSearch[]) => {
    recentsRef.current = next;
    saveSaved(recentKey, next);
    setRecents(next);
  };
  const persistFavorites = (next: SavedSearch[]) => {
    favoritesRef.current = next;
    saveSaved(favoriteKey, next);
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
