/**
 * Site name / logo contract. `siteName` is either plain text (shown in the
 * header, footer, and `<title>` suffix) or a logo image set with per-theme
 * sources.
 */

/**
 * A logo image set. Values are image sources — a URL, a `data:` URI, or (when
 * processed by the bridge) a path it copies into the output. At least one key
 * must be set for a logo to render.
 */
export interface SiteLogo {
  /** Used when the active theme has no dedicated image. */
  default?: string;
  /** Used under the dark theme (falls back to `default`). */
  dark?: string;
  /** Used under the light theme (falls back to `default`). */
  light?: string;
  /**
   * Text label for the logo — used as the image `alt` and the `<title>` (browser
   * tab) suffix. Falls back to `pkg.name` when omitted.
   */
  alt?: string;
}

/** Either plain text or a per-theme logo image set. */
export type SiteName = string | SiteLogo;

/**
 * Text label for the site — used for the `<title>` suffix, image `alt`, and the
 * footer when no logo applies. Returns the string form directly; for a logo set
 * its `alt`, then the supplied fallback (typically `pkg.name`).
 */
export function siteNameText(
  siteName: SiteName | undefined,
  fallback?: string,
): string | undefined {
  if (typeof siteName === 'string') return siteName;
  return siteName?.alt ?? fallback;
}

/**
 * Resolve the per-theme logo sources, or `null` when `siteName` carries no
 * image (plain text or an empty set). Each theme falls back to `default`, then
 * to the other theme's image, so a single supplied image is reused everywhere
 * rather than leaving a theme with no logo.
 */
export function resolveSiteLogo(
  siteName: SiteName | undefined,
): { light: string; dark: string } | null {
  if (!siteName || typeof siteName === 'string') return null;
  const { default: def, dark, light } = siteName;
  const lightSrc = light ?? def ?? dark;
  const darkSrc = dark ?? def ?? light;
  if (!lightSrc || !darkSrc) return null;
  return { light: lightSrc, dark: darkSrc };
}
