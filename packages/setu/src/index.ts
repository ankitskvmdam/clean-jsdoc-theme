import { validateCollectionOrThrow } from './validate';
import {
  assembleNav,
  buildGlobalsView,
  computeBuildId,
  enumerateLongnamesByKind,
  renderContainerPage,
  splitLongnameForSlug,
  type MenuItem,
} from './generate-site';
import { getContainerView, mergeContainerViews, type ContainerView } from './class-view';
import { slugifyPath } from '@clean-jsdoc-theme/utils';
import { makeLinkResolver, registerContainerView, type LinkRegistry } from './link-registry';
import {
  buildDocPages,
  buildReadmePage,
  buildTutorialPages,
  makeTutorialResolver,
  type DocInput,
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
  /**
   * Longnames of later same-slug containers whose views were merged into this
   * one. Registered as aliases so the merged-away namepath still resolves to
   * this page (see the registry pass).
   */
  aliases: string[];
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
   * Doc inputs from the bridge's docs-directory walk (already read off disk;
   * setu does no I/O). Each becomes a prose page at its clean (unprefixed) slug
   * via {@link buildDocPages}, grouped by its frontmatter/directory group. A root
   * `index.md` (`path === 'index'`) becomes the home page, overriding the README
   * home. A doc whose slug would shadow the home or an existing API/source/
   * tutorial page is skipped (see the collision handling in `generateSite`).
   */
  docs?: DocInput[];
  /**
   * Top-level doc-group display order — the doc-group slice of the generalized
   * sidebar `sectionOrder`. Threaded into {@link assembleNav} so the doc-group
   * sidebar sections render in this order (after the API sections). The
   * companion sidebar plan generalizes this; here it simply orders the doc
   * groups consistently with how `sectionOrder` orders the rest.
   */
  docGroups?: string[];
  /**
   * Group label assigned to a doc page that carries no frontmatter/directory
   * group. Forwarded to {@link buildDocPages}.
   */
  defaultDocGroup?: string;
  /**
   * Project source files to render as read-only `kind: 'source'` viewer pages.
   * When supplied, each class member + the class itself gets a "Source:
   * file:line" link resolved against these files.
   */
  sources?: SourceFileInput[];
  /**
   * When `true`, `Source: file:line` links point at the doclet's raw comment
   * line instead of the first line of the declaration. Defaults to `false` (jump
   * to the code). See {@link SourceModelOptions.linkToComment}.
   */
  sourceLinkToComment?: boolean;
  /**
   * Sidebar sections to render, in order (e.g. `["Classes", "Tutorials"]`).
   * Acts as BOTH a filter and an ordering — a section omitted here is dropped
   * from the sidebar. "Home" (when a README exists) and "Source Files" (when
   * source pages are emitted) are always present and not controlled by this.
   * Defaults to `DEFAULT_SECTION_ORDER` when absent or empty. Ignored when
   * `menu` is set.
   */
  sectionOrder?: string[];
  /**
   * Full sidebar menu, in order. When set, takes precedence over `sectionOrder`
   * and controls the entire sidebar: Home / Source Files appear only if their
   * ids (`home` / `sourceFile`) are listed, sections only if named, and external
   * links render inline. Each entry can carry an icon. See {@link MenuItem}.
   */
  menu?: MenuItem[];
  /**
   * Club related sidebar entries within each section into a one-level
   * parent/child tree, grouping by the path segment before the first `/` (e.g.
   * `queue`, `queue/Queue`, `queue/types` collapse under a `queue` parent). A
   * prefix used by only one entry is left flat. Applies to every section,
   * tutorials included. Off by default. See {@link clubNavTree}.
   */
  clubSidebarItems?: boolean;
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
  const sourceModel = opts?.sources?.length
    ? buildSourceModel(opts.sources, { linkToComment: opts.sourceLinkToComment ?? false })
    : null;
  // `resolve` keys off a doclet's `meta`; adapt it to the `(doclet) => link`
  // shape `sourceLink` expects.
  const sourceLink = sourceModel
    ? (doclet: TDoclet) => sourceModel.resolve(doclet.meta)
    : undefined;

  // --- Pass 1: collect specs (single dedup pass) ---------------------------
  //
  // Iterate CONTAINER_KINDS in order, building each container's view + slug.
  // When a later container collides on slug with one already seen (e.g. a
  // `@module` symbol JSDoc emits as both `~Name` and `.Name` class doclets), we
  // MERGE the colliding view into the existing spec instead of dropping it (see
  // `mergeContainerViews`) — so neither doclet's classdesc, constructor params,
  // relations, nor members are lost. The first-seen kind/slug/longname win; the
  // merged-away longname is recorded in `aliases` for registry aliasing. This is
  // the ONE place dedup happens: the surviving specs drive both the registry
  // build and the render pass, so the registry's slugs can never diverge from
  // the emitted pages.
  const specs: ContainerSpec[] = [];
  const specsBySlug = new Map<string, ContainerSpec>();
  for (const kind of CONTAINER_KINDS) {
    for (const longname of enumerateLongnamesByKind(collection, kind)) {
      const view = getContainerView(collection, longname, kind);
      if (!view) continue;
      const slug = slugifyPath(splitLongnameForSlug(longname));
      const existing = specsBySlug.get(slug);
      if (existing) {
        // Merge into the existing page (mutated in place so both `specs` and
        // `specsBySlug` see it); record the merged-away longname as an alias.
        existing.view = mergeContainerViews(existing.view, view);
        existing.aliases.push(longname);
        continue;
      }
      const spec: ContainerSpec = { kind, longname, view, slug, aliases: [] };
      specsBySlug.set(slug, spec);
      specs.push(spec);
    }
  }

  // One aggregated "Globals" page: every global-scope symbol that doesn't get
  // its own container/typedef page, each rendered as a member section. Appended
  // to the spec list. Globals is synthetic, so it must NOT merge into a real
  // container — if its slug ('global') somehow collides with one, skip it.
  const globals = buildGlobalsView(collection);
  if (globals && !specsBySlug.has(globals.slug)) {
    const spec: ContainerSpec = {
      kind: 'global',
      longname: 'Globals',
      view: globals.view,
      slug: globals.slug,
      aliases: [],
    };
    specsBySlug.set(globals.slug, spec);
    specs.push(spec);
  }

  // --- Pass 2: registry, then resolver -------------------------------------
  //
  // Populate the link registry from the EXACT surviving spec set (so registry
  // slugs always match real output), THEN build the resolver. The registry is
  // fully populated before any page body renders, so forward references (page A
  // → symbol B enumerated after A) resolve. Mirrors how `sourceLink` is built
  // first and threaded into pages.
  const registry: LinkRegistry = new Map();
  for (const s of specs) {
    registerContainerView(registry, s.view, s.slug);
    // Merged-away longnames resolve to the surviving page (first-wins guard).
    for (const alias of s.aliases) if (!registry.has(alias)) registry.set(alias, { slug: s.slug });
  }
  const resolveLink = makeLinkResolver(registry);

  // `@tutorial <name>` resolver, derived from the tutorial tree (name → guide
  // page). Built here so it threads into every API page's render alongside
  // `resolveLink`; the guide pages themselves are built further below.
  const resolveTutorial = opts?.tutorials?.length
    ? makeTutorialResolver(opts.tutorials)
    : undefined;

  // --- Pass 3: render -------------------------------------------------------
  //
  // Render each surviving spec from its already-built view (views are not
  // rebuilt), threading `sourceLink`, the registry-backed `resolveLink`, and the
  // `@tutorial` resolver.
  const apiPages: Page[] = specs.map((s) =>
    renderContainerPage(s.view, s.kind, s.longname, s.slug, {
      sourceLink,
      resolveLink,
      resolveTutorial,
    }),
  );

  const pages: Page[] = [];
  // Slugs already claimed by API + globals pages. Doc pages may not shadow these
  // (nor the home slug, nor tutorial/source slugs added below). On a clash a doc
  // is skipped — setu stays resilient and never throws (mirrors how a colliding
  // synthetic globals page is skipped above, and how the bridge logs skips).
  const claimedSlugs = new Set<string>(apiPages.map((p) => p.slug));

  // Build doc pages (the docs directory) up front — BEFORE choosing the home
  // page — because a root `index.md` produces a `kind: 'index'` page at slug ''
  // that overrides the README home. Built with the same resolver as tutorials/
  // README so prose cross-references resolve. The home page (if any) is split out
  // and handled alongside the README below; the rest are filtered for slug
  // collisions and merged into the page set + a `docNav` for the sidebar.
  let docHome: Page | undefined;
  const docPages: Page[] = [];
  let docNav: NavNode[] = [];
  if (opts?.docs && opts.docs.length > 0) {
    const built = buildDocPages(
      opts.docs,
      { defaultDocGroup: opts.defaultDocGroup },
      resolveLink,
    );
    const droppedSlugs = new Set<string>();
    for (const page of built.pages) {
      if (page.slug === '' && page.frontmatter.kind === 'index') {
        // Root index.md → the home page (overrides the README home, below).
        docHome = page;
        continue;
      }
      // A doc may not shadow the home or an already-claimed API/source slug.
      if (page.slug === '' || claimedSlugs.has(page.slug)) {
        droppedSlugs.add(page.slug);
        // Non-fatal: skip deterministically and warn (the bridge surfaces logs).
        console.warn(
          `[setu] skipping doc page: slug "${page.slug}" collides with an existing page`,
        );
        continue;
      }
      claimedSlugs.add(page.slug);
      docPages.push(page);
    }
    // Drop nav entries for the skipped doc pages so the sidebar matches the
    // emitted pages (a dropped slug never reaches the manifest).
    docNav = built.nav.filter((n) => n.slug !== undefined && !droppedSlugs.has(n.slug));
  }

  // README → home page (slug ''), the always-first ungrouped "Home" link. A root
  // `index.md` (docHome) takes precedence over the README home when present.
  // Rendered with the same resolver so prose cross-references resolve too.
  const readmeHome = opts?.readme ? buildReadmePage(opts.readme, opts.pkg, resolveLink) : null;
  const home = docHome ?? readmeHome;
  let homeNav: NavNode | undefined;
  if (home) {
    pages.push(home);
    homeNav = { label: 'Home', slug: home.slug };
  }

  // API pages, grouped into sidebar sections by kind.
  pages.push(...apiPages);

  // Tutorials → guide pages under "Tutorials". Same resolver for cross-refs.
  let tutorialNav: NavNode[] = [];
  if (opts?.tutorials && opts.tutorials.length > 0) {
    const built = buildTutorialPages(opts.tutorials, resolveLink);
    // Tutorials slug under `tutorials/<name>`; on the off chance one collides
    // with an API/doc page, skip it (keep slugs unique across the manifest).
    for (const page of built.pages) {
      if (claimedSlugs.has(page.slug)) continue;
      claimedSlugs.add(page.slug);
      pages.push(page);
    }
    tutorialNav = built.nav.filter((n) => n.slug === undefined || claimedSlugs.has(n.slug));
  }

  // Doc pages → prose pages grouped by their doc-group (added after tutorials,
  // matching the prose-page ordering).
  pages.push(...docPages);

  // Source files → hidden viewer pages + a "Source Files" index in the nav.
  let sourceNav: NavNode | undefined;
  if (sourceModel) {
    pages.push(...sourceModel.pages, sourceModel.indexPage);
    sourceNav = sourceModel.navNode;
  }

  // Assemble the sidebar: Home first, then the API/Tutorials/doc-group sections
  // in the configured (or default) order, then Source Files last. `sectionOrder`
  // both filters and orders the API/Tutorials sections; `docGroups` orders the
  // doc-group sections (appended after the API sections).
  const nav = assembleNav({
    apiPages,
    tutorials: tutorialNav,
    docs: docNav,
    docGroups: opts?.docGroups,
    home: homeNav,
    source: sourceNav,
    sectionOrder: opts?.sectionOrder,
    menu: opts?.menu,
    clubSidebarItems: opts?.clubSidebarItems ?? false,
  });

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
  assembleNav,
  buildClassPage,
  buildContainerPage,
  buildGlobalsPage,
  buildGlobalsView,
  buildNav,
  clubNavTree,
  computeBuildId,
  DEFAULT_SECTION_ORDER,
  DOCS_SECTION,
  enumerateClassLongnames,
  enumerateLongnamesByKind,
  extractHeadings,
  HOME_MENU_ID,
  renderContainerPage,
  SOURCE_MENU_IDS,
  splitLongnameForSlug,
  TUTORIALS_SECTION,
  type AssembleNavOptions,
  type MenuItem,
} from './generate-site';

export {
  buildDocPages,
  buildReadmePage,
  buildTutorialPages,
  makeTutorialResolver,
  parseFrontmatter,
  tutorialsToDocInputs,
  TUTORIALS_GROUP,
  type BuildDocPagesOptions,
  type DocInput,
  type ResolvedTutorial,
  type TutorialInput,
} from './guide-view';

export {
  buildSourceModel,
  detectLanguage,
  firstCodeLine,
  type SourceFileInput,
  type SourceModel,
  type SourceModelOptions,
} from './source-view';
