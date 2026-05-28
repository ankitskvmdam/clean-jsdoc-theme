import { validateCollectionOrThrow } from './validate';
import type { SiteManifest } from '@clean-jsdoc-theme/utils';

/** Build-side options. Phase 1 is types-only; concrete options come in Phase 2. */
export interface GenerateSiteOptions {
  /** Optional package metadata to embed in the manifest. */
  pkg?: SiteManifest['pkg'];
}

/**
 * Build a `SiteManifest` from a JSDoc salty collection. This is the boundary
 * setu→dwar entry point.
 *
 * Phase 1: stub. Phase 2 will replace the body with the real implementation.
 */
export function generateSite(
  collection: unknown,
  _opts?: GenerateSiteOptions,
): SiteManifest {
  validateCollectionOrThrow(collection);
  throw new Error('Not implemented — Phase 2');
}

/**
 * Backwards-compatible thin wrapper around `generateSite` that returns each
 * page body as a string. Kept so the legacy `generateMdx` test/import surface
 * keeps working until callers are migrated.
 */
export function generateMdx(collection: unknown): string[] {
  return generateSite(collection).pages.map((p) => p.body);
}
