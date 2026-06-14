/**
 * dwar.render result + options. Note: no `embedSearchIndex` — Pagefind runs in
 * a separate post-write step (`runPagefindAgainstDir`). See Q5.
 */

import type { SearchEntry } from './manifest';
import type { ThemeConfig } from './theme';

/** A single emitted file. `path` is forward-slash, relative to destination root. */
export interface OutputFile {
  path: string;
  contents: string | Uint8Array;
}

/** A page that failed to render and was skipped, with the reason. */
export interface RenderError {
  /** Slug of the page that failed. */
  slug: string;
  /** The error message (e.g. an MDX compile failure). */
  message: string;
}

/** Aggregated result returned by `dwar.render`. Pure — no I/O is performed here. */
export interface RenderResult {
  files: OutputFile[];
  /** Entries that callers should hand to Pagefind after writing files. */
  search?: SearchEntry[];
  /**
   * Pages that failed to render and were skipped. A single bad page (e.g. MDX
   * that won't compile) must not abort the whole build — render() collects the
   * failures here so the caller can surface them. Empty when all pages render.
   */
  errors?: RenderError[];
  stats: {
    /** Pages successfully rendered (excludes any in `errors`). */
    pageCount: number;
    assetCount: number;
    cssBytes: number;
    jsBytes: number;
    durationMs: number;
  };
}

/**
 * Options to `dwar.render`. There is intentionally no `embedSearchIndex` flag:
 * search index generation is a separate step (`runPagefindAgainstDir`) that
 * runs against the already-written output directory. See Q5.
 */
export interface RenderOptions {
  theme: ThemeConfig;
  /**
   * Destination directory. Used only for resolving paths inside output `OutputFile.path`
   * entries — dwar never writes files itself.
   */
  destination?: string;
  /**
   * Optional directory for an on-disk cache of the bundled island chunks. When
   * set, dwar caches the esbuild island bundle keyed on a content hash of its
   * inputs (rang's compiled output + the island entry sources + the preact
   * version), so a warm rebuild whose inputs are unchanged skips the ~0.4s
   * esbuild step — the big win for the `jsdoc --watch`/dev loop. This is the
   * one place render() touches disk and is opt-in: omit it (the default) and
   * render() stays pure. The bridge (the I/O layer) supplies it, typically
   * `<project>/node_modules/.cache/clean-jsdoc-theme`.
   */
  islandCacheDir?: string;
  /**
   * Map from a doc image `src` (the root-relative `/_assets/<name>.<hash>.svg`
   * the bridge rewrote it to) to that SVG's raw markup. When an `<img>`'s `src`
   * is in this map, rang inlines the SVG into the page instead of `<img>`-ing it
   * — so its `[data-theme="dark"]` styles follow the theme toggle (an
   * `<img>`-loaded SVG only sees the OS `prefers-color-scheme`). The bridge reads
   * the SVGs (the I/O layer); render() just looks them up, staying pure.
   */
  inlineSvgs?: Record<string, string>;
  /**
   * Active-locale info for a localized build (aadesh `build`). When present, dwar
   * renders chrome in this locale — it wraps the SSR page tree in bhasha's
   * `LanguageProvider` and seeds each island root from the per-page payload, and
   * sets `<html lang>`. Absent for a normal single-locale build, so that path's
   * output stays byte-identical.
   */
  locale?: RenderLocale;
}

/** Active-locale chrome translations for a localized render. See {@link RenderOptions.locale}. */
export interface RenderLocale {
  /** Active locale code (also the `<html lang>`). */
  code: string;
  /** Default locale code — the fallback for any untranslated chrome key. */
  defaultLocale: string;
  /** Chrome translations: full `chrome.*` key → translated string (non-empty only). */
  messages: Record<string, string>;
  /**
   * The UN-prefixed site base path (the default locale's base), used to build the
   * language switcher's cross-locale URLs — `<siteBasePath>/<locale>/<slug>` for a
   * non-default locale, `<siteBasePath>/<slug>` for the default. Distinct from
   * `theme.basePath`, which is already prefixed with the active locale.
   */
  siteBasePath?: string;
  /**
   * All configured locales (code + display label) for the switcher. When two or
   * more are present, dwar mounts a `language-switcher` island in the header.
   */
  locales?: Array<{ code: string; label: string }>;
}
