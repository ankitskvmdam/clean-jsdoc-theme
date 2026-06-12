import type { SavedSearch } from './types';

/** Trim a SearchEntry/saved entry down to the fields a saved row needs. */
export function toSaved(e: SavedSearch): SavedSearch {
  return {
    slug: e.slug,
    title: e.title,
    ...(e.context ? { context: e.context } : {}),
    ...(e.excerpt ? { excerpt: e.excerpt } : {}),
    ...(e.description ? { description: e.description } : {}),
  };
}

/** Read + shape-validate a saved list from localStorage; `[]` on any failure. */
export function loadSaved(key: string, cap: number): SavedSearch[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is SavedSearch =>
          !!e &&
          typeof (e as SavedSearch).slug === 'string' &&
          typeof (e as SavedSearch).title === 'string'
      )
      .map(toSaved)
      .slice(0, cap);
  } catch {
    return [];
  }
}

/** Persist a saved list (best-effort — ignore storage/quota errors). */
export function saveSaved(key: string, list: SavedSearch[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage unavailable (private mode / quota) — saved searches are best-effort */
  }
}

/** Insert `entry` at the front, dedup by slug, capped to `cap`. */
export function withSaved(list: SavedSearch[], entry: SavedSearch, cap: number): SavedSearch[] {
  return [entry, ...list.filter((e) => e.slug !== entry.slug)].slice(0, cap);
}
