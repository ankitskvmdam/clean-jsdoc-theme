/**
 * Theme contract — tokens, component overrides, and the top-level ThemeConfig.
 *
 * Per Q8: override fields accept either a Preact component (JS-only entry
 * points) or a file path string (JSON/CLI-friendly; dwar dynamically imports +
 * esbuild-compiles at render time).
 */

import type { ComponentType } from 'preact';

/** Visual design tokens consumed by both Tailwind generation and runtime themes. */
export interface ThemeTokens {
  colors: {
    bg: string;
    bgMuted: string;
    fg: string;
    fgMuted: string;
    accent: string;
    accentFg: string;
    border: string;
  };
  fonts: {
    /** Google Fonts family name for headings, e.g. `"IBM Plex Serif"`. */
    heading: string;
    /** Google Fonts family name for body text, e.g. `"IBM Plex Sans"`. */
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
  /** Site name shown in header / page title suffix. */
  siteName?: string;
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
}
