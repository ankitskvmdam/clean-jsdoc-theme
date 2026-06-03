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
  const { colors, fonts } = tokens;
  const root =
    `:root {\n` +
    `  --clean-bg: ${colors.bg};\n` +
    `  --clean-bg-muted: ${colors.bgMuted};\n` +
    `  --clean-fg: ${colors.fg};\n` +
    `  --clean-fg-muted: ${colors.fgMuted};\n` +
    `  --clean-accent: ${colors.accent};\n` +
    `  --clean-accent-fg: ${colors.accentFg};\n` +
    `  --clean-border: ${colors.border};\n` +
    `  --clean-font-heading: '${fonts.heading}', Georgia, serif;\n` +
    `  --clean-font-body: '${fonts.body}', system-ui, sans-serif;\n` +
    `  --clean-font-mono: ${fonts.mono};\n` +
    `}\n`;

  // ThemeTokens carries a single palette. Dark mode flips bg/fg and
  // bgMuted/fgMuted; the rest stays.
  const dark =
    `[data-theme="dark"] {\n` +
    `  --clean-bg: ${colors.fg};\n` +
    `  --clean-bg-muted: ${colors.fgMuted};\n` +
    `  --clean-fg: ${colors.bg};\n` +
    `  --clean-fg-muted: ${colors.bgMuted};\n` +
    `}\n`;

  return `${root}${dark}`;
}

export function buildCss(tokens: ThemeTokens, buildId: string): CssBuildResult {
  const head = `/* clean-jsdoc-theme/dwar — generated CSS, buildId=${buildId} */\n`;
  const contents = `${head}${buildThemeVariableCss(tokens)}${UTILITY_CSS}\n`;
  return {
    path: `_assets/styles.${buildId}.css`,
    contents,
  };
}
