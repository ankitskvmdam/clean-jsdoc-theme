/**
 * SiteManifest — the boundary object setu emits and dwar consumes.
 */

import type { Page } from './page';

/** Recursive nav tree node. Leaves have `slug`; branches have `children`. */
export interface NavNode {
  label: string;
  slug?: string;
  children?: NavNode[];
  /** Optional grouping label; sibling nodes sharing a group render together. */
  group?: string;
  /** Sort order within siblings. */
  order?: number;
}

/** A single entry handed to Pagefind's index builder. */
export interface SearchEntry {
  slug: string;
  title: string;
  excerpt?: string;
}

/** What setu hands to dwar. Self-contained: dwar should not re-read the doclet DB. */
export interface SiteManifest {
  pages: Page[];
  nav: NavNode[];
  /** Package.json fields exposed for rendering (header, footer, OG tags, ...). */
  pkg?: {
    name?: string;
    version?: string;
    description?: string;
    repository?: string;
    homepage?: string;
  };
  /** Stable per-build identifier (e.g. timestamp + content hash) for cache busting. */
  buildId: string;
}
