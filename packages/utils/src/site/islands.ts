/**
 * Island registry — every interactive piece on a rendered page corresponds to
 * one entry here. dwar bundles each island as a separate ESM chunk; rang
 * provides the implementations. Keep this list in sync with rang's
 * `ISLAND_REGISTRY` export.
 */

import type { Heading } from './page';
import type { NavNode } from './manifest';
import type { SiteName } from './site-name';
import type { CopyPageAction } from './theme';

/** Stable string IDs for each island. The string is used as the `data-island` attribute. */
export type IslandName =
  | 'sidebar'
  | 'mobile-nav'
  | 'toc'
  | 'toc-mobile'
  | 'cmdk'
  | 'code-tabs'
  | 'copy-btn'
  | 'copy-page'
  | 'theme-toggle'
  | 'settings'
  | 'language-switcher'
  | 'code-viewer'
  | 'embed'
  | 'tabs';

/** Type-safe prop bag per island. Server-render and hydration share this map. */
export interface IslandPropsMap {
  sidebar: { nav: NavNode[]; currentSlug: string; basePath?: string };
  'mobile-nav': { nav: NavNode[]; currentSlug: string; siteName?: SiteName; basePath?: string };
  toc: { headings: Heading[] };
  'toc-mobile': { headings: Heading[] };
  cmdk: { basePath: string; searchIndexUrl?: string };
  'code-tabs': { tabs: Array<{ label: string; lang: string; code: string }> };
  'copy-btn': { text: string };
  // The copy-page split button: `mdUrl` is the page's companion .md; `siteName`
  // + `prompt` feed the "Open in ChatGPT/Claude" message ({siteName}/{url} are
  // substituted at click time, the page markdown is appended after). `actions`
  // picks which dropdown items appear (omit for all; `[]` for none).
  'copy-page': { mdUrl: string; siteName?: string; prompt?: string; actions?: CopyPageAction[] };
  'theme-toggle': Record<string, never>;
  settings: Record<string, never>;
  // The language switcher (localized builds only): a globe dropdown of links to
  // the current page in each locale. `href` per option is the page's URL in that
  // locale (default unprefixed, others under `/<locale>`), computed by dwar.
  'language-switcher': {
    locales: Array<{ code: string; label: string; href: string }>;
    current: string;
  };
  // No `code` field: the source body is read from the DOM `<pre>` at hydration
  // time rather than passed through the JSON props payload.
  'code-viewer': { language: string; filename?: string; highlightLine?: number };
  // In-content island (like `copy-btn`): the `<Embed>` config lives in the
  // marker's `data-*` attributes, not the JSON props payload, so the prop bag
  // is empty here. The loader reads `data-*` back into `EmbedProps` at hydrate.
  embed: Record<string, never>;
  // In-content island (like `embed`): the `<Tabs>`/`<Tab>` markup — the tablist
  // buttons and panels — is fully SSR-rendered inside the marker, so there is no
  // JSON props payload. The island enhancer reads the tabs/panels back out of
  // the DOM and wires up click/keyboard switching.
  tabs: Record<string, never>;
}
