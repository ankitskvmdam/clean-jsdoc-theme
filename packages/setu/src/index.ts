import { validateCollectionOrThrow } from './validate';
import {
  buildClassPage,
  buildNav,
  computeBuildId,
  enumerateClassLongnames,
} from './generate-site';
import type { Page, SiteManifest } from '@clean-jsdoc-theme/utils';

/** Build-side options. */
export interface GenerateSiteOptions {
  /** Optional package metadata to embed in the manifest. */
  pkg?: SiteManifest['pkg'];
}

/**
 * Build a `SiteManifest` from a JSDoc salty collection. This is the boundary
 * setu→dwar entry point. Only `kind: 'class'` doclets are rendered today;
 * other kinds are deferred (see architecture's "What's next").
 */
export function generateSite(
  collection: unknown,
  _opts?: GenerateSiteOptions,
): SiteManifest {
  validateCollectionOrThrow(collection);

  const pages: Page[] = [];
  for (const longname of enumerateClassLongnames(collection)) {
    const page = buildClassPage(collection, longname);
    if (page) pages.push(page);
  }

  const manifest: SiteManifest = {
    pages,
    nav: buildNav(pages),
    buildId: computeBuildId(pages),
  };
  if (_opts?.pkg) manifest.pkg = _opts.pkg;
  return manifest;
}

/**
 * Backwards-compatible thin wrapper around `generateSite` that returns each
 * page body as a string. Kept so the legacy `generateMdx` test/import surface
 * keeps working until callers are migrated.
 */
export function generateMdx(collection: unknown): string[] {
  return generateSite(collection).pages.map((p) => p.body);
}

export {
  buildClassPage,
  buildNav,
  computeBuildId,
  enumerateClassLongnames,
  extractHeadings,
  splitLongnameForSlug,
} from './generate-site';
