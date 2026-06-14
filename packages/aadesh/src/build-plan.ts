/**
 * Per-locale build planning (pure): map the locale config + the site's output
 * dir / base path to one render target per locale. The default locale renders
 * unprefixed (at the root destination, base path `/…`); every other locale
 * renders under a `/<locale>` segment — both in the output directory and in the
 * link base path (the plan §1: "Locale = top path segment, default unprefixed").
 */

import { normalizeBasePath, withBase, type LocaleConfig } from '@clean-jsdoc-theme/utils';
import { join } from 'node:path';

/** One locale's render target. */
export interface LocaleBuild {
  code: string;
  /** Display name (for the switcher), if configured. */
  name?: string;
  isDefault: boolean;
  /** Output directory for this locale's site. */
  destination: string;
  /** Base-path prefix for this locale's links. */
  basePath: string;
}

export interface BuildPlanOptions {
  locales: readonly LocaleConfig[];
  defaultLocale: string;
  /** The site's base output directory (from the config). */
  destination: string;
  /** The site's base path (from the config); defaults to `/`. */
  basePath?: string;
}

/**
 * Compute the render target for every configured locale. Deterministic, in
 * configured order. The default locale: `{ destination, basePath }` as-is
 * (unprefixed). Others: `destination/<code>` + `basePath` joined with `/<code>`.
 */
export function localeBuildPlan(opts: BuildPlanOptions): LocaleBuild[] {
  const base = normalizeBasePath(opts.basePath);
  return opts.locales.map(({ code, name }) => {
    const isDefault = code === opts.defaultLocale;
    return {
      code,
      ...(name ? { name } : {}),
      isDefault,
      destination: isDefault ? opts.destination : join(opts.destination, code),
      basePath: isDefault ? base : withBase(base, `/${code}`),
    };
  });
}
