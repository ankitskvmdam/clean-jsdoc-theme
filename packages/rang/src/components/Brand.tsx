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
export function Brand({ siteName, fallback, textClass, logoClass }: BrandProps) {
  const logo = resolveSiteLogo(siteName);
  const name = siteNameText(siteName, fallback) ?? 'Documentation';

  if (!logo) {
    return <span class={textClass}>{name}</span>;
  }

  if (logo.light === logo.dark) {
    return <img src={logo.light} alt={name} class={logoClass} />;
  }

  return (
    <>
      <img src={logo.light} alt={name} class={cn(logoClass, 'dark:hidden')} />
      <img src={logo.dark} alt={name} class={cn(logoClass, 'hidden dark:inline-block')} />
    </>
  );
}
