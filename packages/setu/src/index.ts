import { validateCollectionOrThrow } from './validate';
import {
  buildClassPage,
  buildNav,
  computeBuildId,
  enumerateClassLongnames,
} from './generate-site';
import {
  buildReadmePage,
  buildTutorialPages,
  type TutorialInput,
} from './guide-view';
import type { NavNode, Page, SiteManifest } from '@clean-jsdoc-theme/utils';

/** Build-side options. */
export interface GenerateSiteOptions {
  /** Optional package metadata to embed in the manifest. */
  pkg?: SiteManifest['pkg'];
  /**
   * Project README as HTML (JSDoc renders it from Markdown into `opts.readme`).
   * Rendered as the site home page (`index.html`).
   */
  readme?: string;
  /**
   * Tutorial tree, normalized from JSDoc's `--tutorials` resolver. Rendered as
   * guide pages under "Tutorials", preserving the resolved order.
   */
  tutorials?: TutorialInput[];
}

/**
 * Build a `SiteManifest` from a JSDoc salty collection. This is the boundary
 * setu→dwar entry point. API pages cover `kind: 'class'` only today (other
 * kinds are deferred); the README (home page) and tutorials are rendered when
 * supplied via {@link GenerateSiteOptions}.
 */
export function generateSite(
  collection: unknown,
  opts?: GenerateSiteOptions,
): SiteManifest {
  validateCollectionOrThrow(collection);

  const classPages: Page[] = [];
  for (const longname of enumerateClassLongnames(collection)) {
    const page = buildClassPage(collection, longname);
    if (page) classPages.push(page);
  }

  const pages: Page[] = [];
  const nav: NavNode[] = [];

  // README → home page (slug ''), listed first as an ungrouped "Home" link.
  const home = opts?.readme ? buildReadmePage(opts.readme, opts.pkg) : null;
  if (home) {
    pages.push(home);
    nav.push({ label: 'Home', slug: home.slug });
  }

  // API pages, grouped by kind (Classes, …).
  pages.push(...classPages);
  nav.push(...buildNav(classPages));

  // Tutorials → guide pages under "Tutorials".
  if (opts?.tutorials && opts.tutorials.length > 0) {
    const { pages: tutorialPages, nav: tutorialNav } = buildTutorialPages(opts.tutorials);
    pages.push(...tutorialPages);
    nav.push(...tutorialNav);
  }

  const manifest: SiteManifest = {
    pages,
    nav,
    buildId: computeBuildId(pages),
  };
  if (opts?.pkg) manifest.pkg = opts.pkg;
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

export {
  buildReadmePage,
  buildTutorialPages,
  TUTORIALS_GROUP,
  type TutorialInput,
} from './guide-view';
