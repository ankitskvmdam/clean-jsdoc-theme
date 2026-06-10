/**
 * Theme contract — tokens, component overrides, and the top-level ThemeConfig.
 *
 * Per Q8: override fields accept either a Preact component (JS-only entry
 * points) or a file path string (JSON/CLI-friendly; dwar dynamically imports +
 * esbuild-compiles at render time).
 */

import type { ComponentType } from 'preact';
import type { SiteName } from './site-name';

/** A single color palette. Values may be any CSS color (the theme uses oklch). */
export interface ThemeColors {
  bg: string;
  bgMuted: string;
  fg: string;
  fgMuted: string;
  accent: string;
  accentFg: string;
  border: string;
}

/** Visual design tokens consumed by both Tailwind generation and runtime themes. */
export interface ThemeTokens {
  /** The light-mode palette (also the `:root` default). */
  colors: ThemeColors;
  /**
   * Explicit dark-mode palette, emitted under `[data-theme="dark"]`. Any omitted
   * key falls back to the corresponding `colors` value. When absent entirely,
   * dark mode falls back to a bg/fg swap of `colors`.
   */
  darkColors?: Partial<ThemeColors>;
  fonts: {
    /** Google Fonts family name for headings, e.g. `"Source Serif 4"`. */
    heading: string;
    /** Google Fonts family name for body text, e.g. `"Roboto"`. */
    body: string;
    /** Monospace font-family stack. Not loaded from Google Fonts. */
    mono: string;
  };
  shiki: {
    light: string;
    dark: string;
  };
  /** Path or URL to a logo image. */
  logo?: string;
  /**
   * Site identity shown in the header, footer, and `<title>` suffix. Either
   * plain text, or a per-theme logo image set (`{ default, dark, light }`).
   */
  siteName?: SiteName;
}

/**
 * One selectable action in the copy-page button's dropdown, in render order:
 * `copy` (copy markdown), `view` (open the .md), and the "Open in …" links.
 */
export type CopyPageAction = 'copy' | 'view' | 'claude' | 'chatgpt' | 'perplexity';

/** Copy-page button configuration. */
export interface CopyPageConfig {
  /** Whether to render the button at all. Defaults to `true`. */
  enabled?: boolean;
  /**
   * Which dropdown actions to show, in order. Omit for all of them; pass a
   * subset to trim the menu (e.g. drop `view` or `claude`); pass `[]` to show
   * just the primary "Copy page" button with no dropdown.
   */
  actions?: CopyPageAction[];
}

/**
 * Component override: either a Preact component, or a file path (string) that
 * dwar will compile + import at render time. See Q8.
 */
export type Override<P> = ComponentType<P> | string;

/** Optional per-slot component overrides. Anything omitted uses rang's default. */
export interface ComponentOverrides {
  Sidebar?: Override<unknown>;
  TOC?: Override<unknown>;
  Header?: Override<unknown>;
  Footer?: Override<unknown>;
  Layout?: Override<unknown>;
  /** MDX component map — keys are MDX element names (e.g. `h1`, `code`, `Callout`). */
  // Different MDX elements legitimately accept different prop shapes; the map is heterogeneous.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mdxComponents?: Record<string, ComponentType<any>>;
}

/** Top-level theme configuration handed to dwar.render. */
export interface ThemeConfig {
  tokens: ThemeTokens;
  components?: ComponentOverrides;
  /** Sidebar layout strategy. */
  sidebarLayout?: 'tree' | 'flat';
  /** Base path under which the site is served (e.g. `/docs/`). */
  basePath?: string;
  /**
   * Custom prompt for the copy-page button's "Open in ChatGPT/Claude/Perplexity"
   * actions. `{siteName}`, `{url}`, and `{mdUrl}` (the page's raw Markdown link)
   * placeholders are substituted at click time. Only the prompt + links are sent
   * (never the page body — the AI fetches `{mdUrl}`). Omit for a sensible default.
   */
  aiPrompt?: string;
  /** Copy-page button config (enabled + which dropdown actions). Defaults to on, all actions. */
  copyPage?: CopyPageConfig;
  /**
   * Inline custom CSS. Emitted as a `<style>` in `<head>` AFTER the theme
   * stylesheet (and after any `customCssLinks`), so it can override theme
   * styles. Raw CSS — not escaped beyond a `</style>` break-out guard.
   */
  customCss?: string;
  /**
   * Stylesheet hrefs to `<link>` in `<head>`, after the theme stylesheet (so
   * they can override). For custom CSS files: the bridge copies each file to a
   * content-hashed asset (`_assets/<name>.<hash>.css`) and passes its served
   * href here — so `render()` stays pure (no file I/O) and an unchanged file
   * keeps a stable, cacheable URL. Linked in array order.
   */
  customCssLinks?: string[];
  /**
   * Inline custom JS. Emitted as a classic `<script>` just before `</body>`,
   * after the theme's own scripts. Raw JS — guarded only against a `</script>`
   * break-out.
   */
  customJs?: string;
  /**
   * Script srcs to reference (classic `<script src>`) just before `</body>`,
   * after the theme's own scripts. For custom JS files: the bridge copies each
   * to a content-hashed asset (`_assets/<name>.<hash>.js`) and passes its href
   * here. Referenced in array order.
   */
  customJsLinks?: string[];
}
