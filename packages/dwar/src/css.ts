/**
 * CSS pipeline. Emits a single output file containing two layers:
 *
 *   1. Theme variables — derived from `ThemeTokens`, scoped at `:root` with a
 *      `[data-theme="dark"]` override block. The dark override is a bg/fg swap
 *      because `ThemeTokens` doesn't yet carry a light/dark token pair;
 *      expanding the tokens to encode both modes is a later concern.
 *
 *   2. Utility classes — real Tailwind v4 output, compiled ONCE at dwar's own
 *      build time (scripts/build-css.mjs) and inlined as `UTILITY_CSS` in
 *      src/generated/utility-css.ts. Tailwind never runs at the consumer's
 *      `jsdoc` build, so `render()` stays pure (no fs, no async pipeline) and
 *      users never configure Tailwind. The utility layer is fully determined by
 *      rang's + dwar's component source; only the theme-token block below is
 *      dynamic per user config.
 */

import type { ThemeTokens } from '@clean-jsdoc-theme/utils';
import { UTILITY_CSS } from './generated/utility-css';

export interface CssBuildResult {
  /** Forward-slash relative path. */
  path: string;
  contents: string;
}

export function buildThemeVariableCss(tokens: ThemeTokens): string {
  const { colors, fonts, darkColors } = tokens;
  // Emitted minified (no whitespace/comments) — the utility layer downstream is
  // already minified, so the whole stylesheet ships compact.
  const root =
    `:root{` +
    `--clean-bg:${colors.bg};` +
    `--clean-bg-muted:${colors.bgMuted};` +
    `--clean-fg:${colors.fg};` +
    `--clean-fg-muted:${colors.fgMuted};` +
    `--clean-accent:${colors.accent};` +
    `--clean-accent-fg:${colors.accentFg};` +
    `--clean-border:${colors.border};` +
    // Content links are pure black (light) / white (dark) by design — not the
    // grey fg. The underline inherits this via currentColor.
    `--clean-link:oklch(0 0 0);` +
    `--clean-font-heading:'${fonts.heading}',Georgia,serif;` +
    `--clean-font-body:'${fonts.body}',system-ui,sans-serif;` +
    `--clean-font-mono:${fonts.mono};` +
    `}`;

  let dark: string;
  if (darkColors) {
    // Explicit dark palette: any omitted key falls back to the light value.
    const d = { ...colors, ...darkColors };
    dark =
      `[data-theme="dark"]{` +
      `--clean-bg:${d.bg};` +
      `--clean-bg-muted:${d.bgMuted};` +
      `--clean-fg:${d.fg};` +
      `--clean-fg-muted:${d.fgMuted};` +
      `--clean-accent:${d.accent};` +
      `--clean-accent-fg:${d.accentFg};` +
      `--clean-border:${d.border};` +
      `--clean-link:oklch(1 0 0);` +
      `}`;
  } else {
    // No explicit dark palette: fall back to a bg/fg swap of the light palette.
    dark =
      `[data-theme="dark"]{` +
      `--clean-bg:${colors.fg};` +
      `--clean-bg-muted:${colors.fgMuted};` +
      `--clean-fg:${colors.bg};` +
      `--clean-fg-muted:${colors.bgMuted};` +
      `--clean-link:oklch(1 0 0);` +
      `}`;
  }

  return `${root}${dark}`;
}

export function buildCss(tokens: ThemeTokens, buildId: string): CssBuildResult {
  const contents = `${buildThemeVariableCss(tokens)}${UTILITY_CSS}`;
  return {
    path: `_assets/styles.${buildId}.css`,
    contents,
  };
}
