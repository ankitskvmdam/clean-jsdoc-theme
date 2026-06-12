export interface CtrlKProps {
  basePath: string;
  /**
   * URL of the JSON search index dwar emits (one `SearchEntry` per non-hidden
   * page). Fetched lazily on first open. When omitted, the palette opens but
   * reports an empty index.
   */
  searchIndexUrl?: string;
}

/**
 * A persisted search — the minimal slice of a `SearchEntry` needed to render the
 * row and re-open the page. Stored in localStorage so recent and favorite
 * searches survive across sessions (issue #137).
 */
export interface SavedSearch {
  slug: string;
  title: string;
  context?: string;
  excerpt?: string;
  description?: string;
}

/** Which saved list a row belongs to. */
export type SavedKind = 'favorite' | 'recent';
