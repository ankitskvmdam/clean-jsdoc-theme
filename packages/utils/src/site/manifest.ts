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
   * TypeDoc-only: when set on a branch node, the sidebar auto-opens it if ANY
   * descendant (not just a direct child) is the current page. JSDoc never sets
   * this — its branches keep the legacy direct-children-only auto-open check, so
   * JSDoc SSR output stays byte-identical. See rang's `NavEntry`.
   */
  deepExpand?: boolean;
  /**
   * Absolute URL for an external menu link (e.g. a GitHub/npm link). Mutually
   * exclusive with `slug`; when set, the entry opens in a new tab.
   */
  href?: string;
  /** True for an external link entry (`href` set) — render with `target="_blank"`. */
  external?: boolean;
  /**
   * Link `target` attribute for a menu entry (e.g. `_blank`, `_self`). When
   * omitted, an external entry still defaults to `_blank`; an internal one omits
   * the attribute.
   */
  target?: string;
  /** Extra CSS class(es) merged onto a menu entry's rendered link. */
  class?: string;
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

/**
 * One translatable API string in the locale-independent template setu emits.
 *
 * Every translatable doclet prose field (a description, a `@summary`, an
 * `@example` caption) becomes a slot keyed by the symbol's longname + field path
 * (bhasha's `apiSlotKey`). The slot carries the default-locale `sourceText` and a
 * content `hash` (bhasha's `sourceHash`) so aadesh can extract a catalog skeleton
 * and detect when a source string drifts (stale translation). Locale-invariant:
 * the same slot key appears on every build of the same symbol+field, so a
 * translation tracks its source across rebuilds. Names, type strings, enum
 * values, and `@example` code are NOT slots — they stay locale-invariant.
 */
export interface SlotEntry {
  /** Stable catalog key — `api.<longname>#<field>` (bhasha `apiSlotKey`). */
  key: string;
  /** The default-locale source string this slot renders (HTML or Markdown). */
  sourceText: string;
  /** Content hash of `sourceText` (bhasha `sourceHash`) for staleness detection. */
  hash: string;
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
  /**
   * The translatable API slots collected during this build — the
   * locale-independent template aadesh extracts catalogs from. setu always
   * populates it (possibly empty); dwar ignores it. A build *stamped* for a
   * locale carries the same slot set (keys/sources are locale-invariant); only
   * the page bodies differ. See {@link SlotEntry}.
   */
  slots?: SlotEntry[];
  /**
   * Top-level sidebar section labels that render as collapse toggles (the
   * resolved `collapsibleSidebarSections` opt). Populated by setu (default: all
   * present sections). dwar threads it into the sidebar/mobile-nav island props;
   * rang renders a header as a toggle when its label is in this list. An empty
   * list means every header is static (today's behavior).
   */
  collapsibleGroups?: string[];
}

/** Current schema version of the {@link ExtractManifest}. */
export const EXTRACT_MANIFEST_VERSION = 1;

/**
 * The minimal artifact the theme's localization **extract mode** writes to disk
 * for aadesh: just the translatable API slot template (chrome strings come from
 * bhasha's catalog, so they aren't duplicated here). aadesh spawns the jsdoc/
 * typedoc pipeline with the theme signaled to emit this — instead of rendering —
 * then builds the per-locale catalogs from it. Regenerate-on-build, never
 * committed. See the localization plan, §4.
 */
export interface ExtractManifest {
  /** Schema version ({@link EXTRACT_MANIFEST_VERSION}). */
  version: number;
  /** The translatable API slots (longname+field keyed, with source + hash). */
  slots: SlotEntry[];
}

/** Project a built {@link SiteManifest} down to the {@link ExtractManifest} aadesh reads. */
export function toExtractManifest(manifest: SiteManifest): ExtractManifest {
  return { version: EXTRACT_MANIFEST_VERSION, slots: manifest.slots ?? [] };
}

/** Current schema version of the {@link BuildSpec}. */
export const BUILD_SPEC_VERSION = 1;

/**
 * The per-locale render instruction aadesh writes for the theme's **build mode**
 * (the localization plan §4: "template + filled catalogs → setu stamp → dwar
 * render → per-locale sites"). aadesh spawns the pipeline once per locale with
 * the theme pointed at this spec; the theme stamps the API translations
 * (`setu.stampSite`) and renders to `destination` with `basePath`. The default
 * locale renders unprefixed (`basePath: '/'`); others under `/<locale>`.
 */
export interface BuildSpec {
  /** Schema version ({@link BUILD_SPEC_VERSION}). */
  version: number;
  /** Locale code being rendered. */
  locale: string;
  /** Default locale code — the fallback for untranslated chrome/API. */
  defaultLocale: string;
  /**
   * `api.*` key → translated string, fed to `setu.stampSite`. Empty/omitted
   * entries fall back to the source text. The default locale typically passes
   * `{}` (identity → live source).
   */
  apiMessages: Record<string, string>;
  /**
   * `chrome.*` key → translated UI string, fed to dwar's `RenderOptions.locale`
   * so chrome renders in the locale (SSR + island seeding). The default locale
   * typically passes `{}` (identity → English fallback).
   */
  chromeMessages: Record<string, string>;
  /** Output directory for this locale's site. */
  destination: string;
  /** Base-path prefix for this locale's links — `/<locale>`, or `/` for the default. */
  basePath: string;
  /**
   * The UN-prefixed site base path (the default locale's base), for the language
   * switcher's cross-locale URLs. Same across every locale in the build.
   */
  siteBasePath: string;
  /** All configured locales (code + optional display name) — feeds the switcher. */
  locales: Array<{ code: string; name?: string }>;
  /**
   * Absolute path of this locale's docs-overlay directory (a sibling
   * `docs.<locale>/` of the configured `opts.docs`), when one exists. The bridge
   * overlays its files over the default docs by path — a translated doc wins, a
   * missing one falls back to the default. Omitted when the locale has no overlay
   * (the default-locale + untranslated locales render the default docs).
   */
  docsDir?: string;
}
