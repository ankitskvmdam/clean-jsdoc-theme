import type { SiteName } from '@clean-jsdoc-theme/utils';
import { resolveSiteLogo, siteNameText } from '@clean-jsdoc-theme/utils';
import { cn } from '../lib/cn';

export interface BrandProps {
  /** Plain text, or a per-theme logo image set. */
  siteName?: SiteName;
  /** Text fallback when `siteName` carries no logo (typically `pkg.name`). */
  fallback?: string;
  /** Classes for the text-label variant. */
  textClass?: string;
  /** Classes for the logo `<img>` variant. */
  logoClass?: string;
  /**
   * Classes for an element wrapping the logo image(s). Only applies to the logo
   * variant — when set, the `<img>`(s) are wrapped in a `<span>` carrying these
   * classes, giving a stable container to style (padding, background, rounding)
   * regardless of the single- vs dark/light-pair rendering. Omit for no wrapper.
   */
  containerClass?: string;
}

/**
 * Site identity — renders either the site name as text or a logo image,
 * depending on whether `siteName` is a string or a `{ default, dark, light }`
 * set. Used by the header, footer, and mobile nav so the text/logo decision and
 * the dark/light image swap live in one place.
 *
 * Dark/light is handled with CSS only: both images render and the `dark:`
 * variant (rebound to `[data-theme="dark"]`, set pre-paint by the theme script)
 * toggles which is shown — no JS, no flash, nothing to hydrate. A single
 * supplied image (or `light === dark`) renders one `<img>` with no toggle.
 */
export function Brand({ siteName, fallback, textClass, logoClass, containerClass }: BrandProps) {
  const logo = resolveSiteLogo(siteName);
  const name = siteNameText(siteName, fallback) ?? 'Documentation';

  if (!logo) {
    return <span class={textClass}>{name}</span>;
  }

  const image =
    logo.light === logo.dark ? (
      <img src={logo.light} alt={name} class={logoClass} />
    ) : (
      <>
        <img src={logo.light} alt={name} class={cn(logoClass, 'dark:hidden')} />
        <img src={logo.dark} alt={name} class={cn(logoClass, 'hidden dark:inline-block')} />
      </>
    );

  // Only wrap when a container class is supplied, so the default DOM (bare
  // `<img>` / image pair as direct children) is unchanged for existing callers.
  return containerClass ? <span class={containerClass}>{image}</span> : image;
}
