/**
 * @clean-jsdoc-theme/dwar
 *
 * Renders a SiteManifest into HTML/CSS/JS files (Preact + MDX + Tailwind v4 +
 * esbuild islands), and provides a separate post-write hook for Pagefind.
 *
 * Phase 1: types + stubs. Real rendering lands in Phase 4.
 */

import type {
  RenderOptions,
  RenderResult,
  SiteManifest,
} from '@clean-jsdoc-theme/utils';

export const DWAR_PACKAGE_VERSION = '5.0.0-alpha.0';

/**
 * Render a SiteManifest to in-memory output files. Pure: dwar does not write
 * to disk. Callers persist `result.files` themselves, then optionally call
 * `runPagefindAgainstDir` against the destination.
 *
 * Phase 1: stub.
 */
export async function render(
  _manifest: SiteManifest,
  _opts: RenderOptions,
): Promise<RenderResult> {
  throw new Error('Not implemented — Phase 4');
}

/**
 * Run Pagefind against an already-written site directory. Separated from
 * `render` per Q5 so the search index is always built against the real
 * on-disk artifacts (post-write, never against in-memory drafts).
 *
 * Phase 1: stub.
 */
export async function runPagefindAgainstDir(_destination: string): Promise<void> {
  throw new Error('Not implemented — Phase 4');
}

// Re-export boundary types so consumers (e.g. publish.ts) can pull them from
// dwar alone without also importing from utils.
export type {
  OutputFile,
  RenderOptions,
  RenderResult,
  SiteManifest,
  Page,
  PageKind,
  Frontmatter,
  Heading,
  NavNode,
  SearchEntry,
  ThemeConfig,
  ThemeTokens,
  ComponentOverrides,
  Override,
  IslandName,
  IslandPropsMap,
} from '@clean-jsdoc-theme/utils';
