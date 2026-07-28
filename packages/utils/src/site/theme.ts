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
  /** Code-block header strip background. Optional — defaults to a neutral surface. */
  codeHeaderBg?: string;
  /** Code-block header label text (the `CODE`/filename label). Optional. */
  codeHeaderFg?: string;
  /** Highlighted code-line background (`@playground` / `highlight=`). Optional. */
  codeHighlightBg?: string;
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
 * A single custom `<meta>` tag, expressed as its attribute map — each key/value
 * pair becomes one HTML attribute (`{ name, content }`, `{ property, content }`,
 * `{ "http-equiv", content }`, `{ charset }`, …). Emitted into `<head>` on every
 * page (see `ThemeConfig.meta`).
 */
export type MetaTag = Record<string, string>;

/**
 * One selectable action in the copy-page button's dropdown, in render order:
 * `copy` (copy markdown), `view` (open the .md), and the "Open in …" links.
 */
export type CopyPageAction = 'copy' | 'view' | 'claude' | 'chatgpt' | 'perplexity';

/**
 * Scrollbar presentation mode (see `ThemeConfig.scrollbar`):
 *  - `styled`  — overlay bar, invisible at rest, painting only while scrolling
 *    (`.clean-scrolling`) or on hover. The default.
 *  - `visible` — the same thin themed bar, but always shown (no idle-hide).
 *  - `native`  — no scrollbar styling; the browser's own scrollbar (issue #281).
 */
export type ScrollbarMode = 'styled' | 'visible' | 'native';

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
 * Previous/next page navigation configuration. The footer pager links each
 * content page to its neighbors in sidebar reading order.
 */
export interface PageNavConfig {
  /** Whether to render the prev/next pager at all. Defaults to `true`. */
  enabled?: boolean;
}

/** The code-playground providers an `@example` / prose fence can be opened in. */
export type PlaygroundProvider = 'codepen' | 'jsfiddle' | 'codesandbox';

/**
 * Code-playground configuration. `enabled` gates the feature; the per-provider
 * records are the **site-wide** runtime options forwarded to each provider when
 * a code block is opened (CodePen `js_external`/`js_pre_processor`/…, JSFiddle
 * `resources`/`wrap`, CodeSandbox dependencies). They're passed verbatim to the
 * browser island via dwar's page payload — there are no per-example overrides at
 * this layer (a block only picks *which* providers).
 */
export interface PlaygroundConfig {
  /** Whether the playground feature is active at all. */
  enabled?: boolean;
  /** Site-wide CodePen "define" prefill options. */
  codepen?: Record<string, unknown>;
  /** Site-wide JSFiddle post options. */
  jsfiddle?: Record<string, unknown>;
  /** Site-wide CodeSandbox define options. */
  codesandbox?: Record<string, unknown>;
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
   * Favicon URL, emitted as `<link rel="icon">` in every page's `<head>`. This
   * is the **resolved** href: the opts layer accepts a file path, but the bridge
   * copies it to a content-hashed `_assets/` asset and threads only the served
   * URL here, so `render()` stays pure (no file I/O). dwar derives the link
   * `type` from the extension (`.svg` → `image/svg+xml`, …). Omit for none — an
   * SVG favicon needs this link (browsers only auto-discover a root `favicon.ico`).
   */
  favicon?: string;
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
   * Previous/next page pager shown at the foot of each content page, linking to
   * the adjacent pages in sidebar reading order. Defaults to on; pass
   * `{ enabled: false }` to opt out.
   */
  pageNav?: PageNavConfig;
  /**
   * Scrollbar presentation. `styled` (default) is the overlay bar that hides at
   * rest; `visible` keeps the themed bar always shown; `native` disables all
   * scrollbar styling and uses the browser's own scrollbar. dwar sets a
   * `data-scrollbar` attribute on `<html>` from this and (in `styled` only)
   * injects the idle-hide script. Omit for `styled`.
   */
  scrollbar?: ScrollbarMode;
  /**
   * Code-playground config: which providers a code block can be opened in
   * (CodePen / JSFiddle / CodeSandbox) plus their site-wide runtime options.
   * dwar serializes this into a per-page JSON payload the `playground` island
   * reads — so `render()` stays pure (it only serializes config it's handed).
   * Omit (or `{ enabled: false }`) to leave the feature off.
   */
  playground?: PlaygroundConfig;
  /**
   * Author-supplied footer HTML, rendered into rang's footer slot in place of
   * the default `Footer` on every page. This is the **resolved** value: the
   * opts layer accepts `string | { file }`, but the bridge reads the file form
   * from disk and threads only the final string here, so `render()` stays pure.
   * Trusted, author-controlled HTML (rendered verbatim, like v4's
   * `theme_opts.footer`); style it via `customCss`/`customCssLinks`. Omit for
   * the default footer.
   */
  footer?: string;
  /**
   * Site-wide custom `<meta>` tags, emitted into every page's `<head>`. Each
   * entry is an attribute map (`{ name, content }`, `{ property, content }`,
   * etc.). dwar emits its own defaults (charset, viewport, the auto
   * description) first, then these — de-duping by identifying attribute
   * (`name` / `property` / `http-equiv` / `charset`) so an author tag replaces
   * the theme's competing default rather than duplicating it. Values are
   * escaped; invalid attribute names are dropped. Site-wide (no per-page meta).
   */
  meta?: MetaTag[];
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
