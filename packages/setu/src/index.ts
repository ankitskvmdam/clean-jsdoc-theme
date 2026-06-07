import { validateCollectionOrThrow } from './validate';
import {
  buildContainerPage,
  buildGlobalsPage,
  buildNav,
  computeBuildId,
  enumerateLongnamesByKind,
} from './generate-site';
import {
  buildReadmePage,
  buildTutorialPages,
  type TutorialInput,
} from './guide-view';
import { buildSourceModel, type SourceFileInput } from './source-view';
import type { NavNode, Page, PageKind, SiteManifest, TDoclet } from '@clean-jsdoc-theme/utils';

/**
 * API container kinds that each get a standalone page, in nav display order.
 * Iterating module→namespace→class→interface→mixin→typedef means a documented
 * container (e.g. a module) wins a slug collision over a later kind. Typedefs
 * are mechanically identical to other containers: they go through the same
 * `buildContainerPage`/`getContainerView` path. A typedef's body (its `@type`,
 * `@property` list, and `@param`/`@returns` for function-signature typedefs)
 * renders via `containerViewToMdast`'s class-level `docletBlocks` call, which
 * only skips params/returns for the `class` kind.
 */
const CONTAINER_KINDS: readonly PageKind[] = [
  'module',
  'namespace',
  'class',
  'interface',
  'mixin',
  'typedef',
];

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
  /**
   * Project source files to render as read-only `kind: 'source'` viewer pages.
   * When supplied, each class member + the class itself gets a "Source:
   * file:line" link resolved against these files.
   */
  sources?: SourceFileInput[];
}

/**
 * Build a `SiteManifest` from a JSDoc salty collection. This is the boundary
 * setu→dwar entry point. API pages cover the container kinds in
 * {@link CONTAINER_KINDS} (module/namespace/class/interface/mixin/typedef) plus
 * one aggregated "Globals" page for global-scope symbols that don't get their
 * own page; the README (home page) and tutorials are rendered when supplied via
 * {@link GenerateSiteOptions}.
 */
export function generateSite(
  collection: unknown,
  opts?: GenerateSiteOptions,
): SiteManifest {
  validateCollectionOrThrow(collection);

  // Source viewer model (pages + nav + the doclet→source link resolver). Built
  // first so its `resolve` can be threaded into each class page's mdast.
  const sourceModel = opts?.sources?.length ? buildSourceModel(opts.sources) : null;
  // `resolve` keys off a doclet's `meta`; adapt it to the `(doclet) => link`
  // shape `sourceLink` expects.
  const sourceLink = sourceModel
    ? (doclet: TDoclet) => sourceModel.resolve(doclet.meta)
    : undefined;

  // Container API pages, one per documented container symbol. Kinds are
  // iterated in CONTAINER_KINDS order; a `seenSlugs` guard skips later pages
  // that collide on slug (e.g. a module that also surfaces as a class for the
  // same symbol), so the earlier — documented-container — kind wins.
  const apiPages: Page[] = [];
  const seenSlugs = new Set<string>();
  for (const kind of CONTAINER_KINDS) {
    for (const longname of enumerateLongnamesByKind(collection, kind)) {
      const page = buildContainerPage(collection, longname, kind, sourceLink);
      if (!page) continue;
      if (seenSlugs.has(page.slug)) {
        console.warn(
          `[setu] skipping duplicate page slug "${page.slug}" (${kind} ${longname})`,
        );
        continue;
      }
      seenSlugs.add(page.slug);
      apiPages.push(page);
    }
  }

  // One aggregated "Globals" page: every global-scope symbol that doesn't get
  // its own container/typedef page, each rendered as a member section. Added
  // before buildNav so it groups under "Globals" alongside the container pages.
  const globalsPage = buildGlobalsPage(collection);
  if (globalsPage && !seenSlugs.has(globalsPage.slug)) {
    seenSlugs.add(globalsPage.slug);
    apiPages.push(globalsPage);
  }

  const pages: Page[] = [];
  const nav: NavNode[] = [];

  // README → home page (slug ''), listed first as an ungrouped "Home" link.
  const home = opts?.readme ? buildReadmePage(opts.readme, opts.pkg) : null;
  if (home) {
    pages.push(home);
    nav.push({ label: 'Home', slug: home.slug });
  }

  // API pages, grouped by kind (Modules, Namespaces, Classes, …).
  pages.push(...apiPages);
  nav.push(...buildNav(apiPages));

  // Tutorials → guide pages under "Tutorials".
  if (opts?.tutorials && opts.tutorials.length > 0) {
    const { pages: tutorialPages, nav: tutorialNav } = buildTutorialPages(opts.tutorials);
    pages.push(...tutorialPages);
    nav.push(...tutorialNav);
  }

  // Source files → hidden viewer pages + a "Source Files" index in the nav.
  if (sourceModel) {
    pages.push(...sourceModel.pages, sourceModel.indexPage);
    nav.push(sourceModel.navNode);
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
  buildContainerPage,
  buildGlobalsPage,
  buildNav,
  computeBuildId,
  enumerateClassLongnames,
  enumerateLongnamesByKind,
  extractHeadings,
  splitLongnameForSlug,
} from './generate-site';

export {
  buildReadmePage,
  buildTutorialPages,
  TUTORIALS_GROUP,
  type TutorialInput,
} from './guide-view';

export {
  buildSourceModel,
  detectLanguage,
  type SourceFileInput,
  type SourceModel,
} from './source-view';
