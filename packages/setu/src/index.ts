import { validateCollectionOrThrow } from './validate';
import {
  buildGlobalsView,
  buildNav,
  computeBuildId,
  enumerateLongnamesByKind,
  renderContainerPage,
  splitLongnameForSlug,
} from './generate-site';
import { getContainerView, type ContainerView } from './class-view';
import { slugifyPath } from '@clean-jsdoc-theme/utils';
import { makeLinkResolver, registerContainerView, type LinkRegistry } from './link-registry';
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

/**
 * A surviving container page from the dedup pass: its kind, source longname, the
 * already-built {@link ContainerView}, and its computed slug. Carried from pass 1
 * (dedup + registry) into pass 3 (render) so the view is built exactly once and
 * the registry's slugs always match the emitted pages.
 */
interface ContainerSpec {
  kind: PageKind;
  longname: string;
  view: ContainerView;
  slug: string;
}

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

  // --- Pass 1: collect specs (single dedup pass) ---------------------------
  //
  // Iterate CONTAINER_KINDS in order, building each container's view + slug.
  // A `seenSlugs` guard skips later pages that collide on slug (e.g. a module
  // that also surfaces as a class for the same symbol), so the earlier —
  // documented-container — kind wins. This is the ONE place dedup happens: the
  // surviving specs drive both the registry build and the render pass, so the
  // registry's slugs can never diverge from the emitted pages.
  const specs: ContainerSpec[] = [];
  const seenSlugs = new Set<string>();
  for (const kind of CONTAINER_KINDS) {
    for (const longname of enumerateLongnamesByKind(collection, kind)) {
      const view = getContainerView(collection, longname, kind);
      if (!view) continue;
      const slug = slugifyPath(splitLongnameForSlug(longname));
      if (seenSlugs.has(slug)) {
        console.warn(
          `[setu] skipping duplicate page slug "${slug}" (${kind} ${longname})`,
        );
        continue;
      }
      seenSlugs.add(slug);
      specs.push({ kind, longname, view, slug });
    }
  }

  // One aggregated "Globals" page: every global-scope symbol that doesn't get
  // its own container/typedef page, each rendered as a member section. Appended
  // to the spec list (guarded by the same `seenSlugs`) so it groups under
  // "Globals" alongside the container pages.
  const globals = buildGlobalsView(collection);
  if (globals && !seenSlugs.has(globals.slug)) {
    seenSlugs.add(globals.slug);
    specs.push({ kind: 'global', longname: 'Globals', view: globals.view, slug: globals.slug });
  }

  // --- Pass 2: registry, then resolver -------------------------------------
  //
  // Populate the link registry from the EXACT surviving spec set (so registry
  // slugs always match real output), THEN build the resolver. The registry is
  // fully populated before any page body renders, so forward references (page A
  // → symbol B enumerated after A) resolve. Mirrors how `sourceLink` is built
  // first and threaded into pages.
  const registry: LinkRegistry = new Map();
  for (const s of specs) registerContainerView(registry, s.view, s.slug);
  const resolveLink = makeLinkResolver(registry);

  // --- Pass 3: render -------------------------------------------------------
  //
  // Render each surviving spec from its already-built view (views are not
  // rebuilt), threading both `sourceLink` and the registry-backed `resolveLink`.
  const apiPages: Page[] = specs.map((s) =>
    renderContainerPage(s.view, s.kind, s.longname, s.slug, { sourceLink, resolveLink }),
  );

  const pages: Page[] = [];
  const nav: NavNode[] = [];

  // README → home page (slug ''), listed first as an ungrouped "Home" link.
  // Rendered with the same resolver so prose cross-references resolve too.
  const home = opts?.readme ? buildReadmePage(opts.readme, opts.pkg, resolveLink) : null;
  if (home) {
    pages.push(home);
    nav.push({ label: 'Home', slug: home.slug });
  }

  // API pages, grouped by kind (Modules, Namespaces, Classes, …).
  pages.push(...apiPages);
  nav.push(...buildNav(apiPages));

  // Tutorials → guide pages under "Tutorials". Same resolver for cross-refs.
  if (opts?.tutorials && opts.tutorials.length > 0) {
    const { pages: tutorialPages, nav: tutorialNav } = buildTutorialPages(
      opts.tutorials,
      resolveLink,
    );
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
  buildGlobalsView,
  buildNav,
  computeBuildId,
  enumerateClassLongnames,
  enumerateLongnamesByKind,
  extractHeadings,
  renderContainerPage,
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
