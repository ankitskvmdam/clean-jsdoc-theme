/**
 * Island registry — every interactive piece on a rendered page corresponds to
 * one entry here. dwar bundles each island as a separate ESM chunk; rang
 * provides the implementations. Keep this list in sync with rang's
 * `ISLAND_REGISTRY` export.
 */

import type { Heading } from './page';
import type { NavNode } from './manifest';
import type { SiteName } from './site-name';

/** Stable string IDs for each island. The string is used as the `data-island` attribute. */
export type IslandName =
  | 'sidebar'
  | 'mobile-nav'
  | 'toc'
  | 'toc-mobile'
  | 'cmdk'
  | 'code-tabs'
  | 'copy-btn'
  | 'theme-toggle'
  | 'settings'
  | 'code-viewer';

/** Type-safe prop bag per island. Server-render and hydration share this map. */
export interface IslandPropsMap {
  sidebar: { nav: NavNode[]; currentSlug: string };
  'mobile-nav': { nav: NavNode[]; currentSlug: string; siteName?: SiteName; basePath?: string };
  toc: { headings: Heading[] };
  'toc-mobile': { headings: Heading[] };
  cmdk: { basePath: string };
  'code-tabs': { tabs: Array<{ label: string; lang: string; code: string }> };
  'copy-btn': { text: string };
  'theme-toggle': Record<string, never>;
  settings: Record<string, never>;
  // No `code` field: the source body is read from the DOM `<pre>` at hydration
  // time rather than passed through the JSON props payload.
  'code-viewer': { language: string; filename?: string; highlightLine?: number };
}
