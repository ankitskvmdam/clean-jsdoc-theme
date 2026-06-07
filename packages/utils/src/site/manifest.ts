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
  /**
   * Absolute URL for an external menu link (e.g. a GitHub/npm link). Mutually
   * exclusive with `slug`; when set, the entry opens in a new tab.
   */
  href?: string;
  /** True for an external link entry (`href` set) — render with `target="_blank"`. */
  external?: boolean;
  /**
   * Icon for the entry (menu items only), as a prefixed `source:code` string:
   * `simpleicons:<slug>` renders from `cdn.simpleicons.org` (CSS dark/light
   * swap), and `lucide:<name>` renders from the bundled lucide set (`home`,
   * `code-xml`, `globe`, `mail`, `external-link`; an unknown name →
   * `external-link`).
   */
  icon?: string;
  /**
   * True for a top-region menu entry. The sidebar renders all menu entries above
   * the API sections, with a divider between.
   */
  menu?: boolean;
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
