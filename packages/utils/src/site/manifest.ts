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
   * `simpleicons:<slug>` renders the `cdn.simpleicons.org` glyph painted with
   * the `fg` theme token (CSS-masked, so it swaps light/dark on its own), and
   * `lucide:<name>` renders from the bundled lucide set (`home`,
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

/**
 * A single entry in the fuzzy search index the `cmdk` palette fetches.
 *
 * A page entry has `slug` = the page slug and `title` = the page title; a
 * **member entry** has `slug` = `page#heading-anchor` (a deep link to a member /
 * field / method heading), `title` = the member name, and `context` = the parent
 * page title. `description` + `content` are matched (so README prose, member
 * descriptions, and identifiers are all findable), not just the title; `excerpt`
 * is shown under page hits.
 */
export interface SearchEntry {
  slug: string;
  title: string;
  /** Short plain-text snippet shown under a page hit. */
  excerpt?: string;
  /** Page/member description — matched, and used as a member hit's subtitle. */
  description?: string;
  /** Full plain-text body (identifiers preserved) — matched, never displayed. */
  content?: string;
  /** For a member entry, the parent page title (shown as the hit's context). */
  context?: string;
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
