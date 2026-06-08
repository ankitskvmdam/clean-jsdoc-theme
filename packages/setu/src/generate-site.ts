import { createHash } from 'node:crypto';
import type { Heading as MdastHeading, Root } from 'mdast';
import {
  slugifyHeading,
  slugifyPath,
  type Frontmatter,
  type Heading,
  type NavNode,
  type Page,
  type PageKind,
} from '@clean-jsdoc-theme/utils';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { bucketClassMembers, getContainerView, type ContainerView } from './class-view';
import { filterDoclets } from './doclet';
import { containerViewToMdast } from './mdast/class-view';
import type { DocletBlocksOptions } from './mdast/doclet';
import { resolveLinkTags } from './mdast/link-tags';
import { toMdx } from './mdx';

/** JSDoc separator characters that delimit name parts in a longname. */
const LONGNAME_SEPARATORS = /[.#~:]+/g;

/**
 * Split a JSDoc longname into the parts used for path slugging. The separators
 * `.`, `#`, `~`, `:` are replaced with whitespace, then the string is split
 * and empties are dropped. This preserves distinctness — `module:Foo~Bar` and
 * `Foo.Bar` produce different part arrays even after slugification because
 * `module` becomes a leading segment in the former.
 */
export function splitLongnameForSlug(longname: string): string[] {
  return longname.replace(LONGNAME_SEPARATORS, ' ').split(/\s+/).filter((p) => p.length > 0);
}

/** Concatenate the text content of a heading node's inline children. */
function headingText(node: MdastHeading): string {
  let out = '';
  for (const child of node.children) {
    if (child.type === 'text' || child.type === 'inlineCode') {
      out += child.value;
    }
  }
  return out;
}

/**
 * Walk an mdast tree and emit a `Heading` per h2..h6 in document order, with
 * IDs slugified through a per-page registry so duplicates dedupe consistently
 * with what the renderer will produce. h1 (page title) is skipped.
 */
export function extractHeadings(tree: Root): Heading[] {
  const registry = new Map<string, number>();
  const out: Heading[] = [];
  for (const node of tree.children) {
    if (node.type !== 'heading') continue;
    if (node.depth < 2 || node.depth > 6) continue;
    const t = headingText(node).trim();
    if (!t) continue;
    out.push({
      depth: node.depth as 2 | 3 | 4 | 5 | 6,
      text: t,
      id: slugifyHeading(t, registry),
    });
  }
  return out;
}

/** Strip HTML tags from a string and collapse whitespace; cheap, not a parser. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the unique longnames of the given `kind` in the collection that have
 * a documented doclet. Dedupes on longname and skips undocumented doclets.
 */
export function enumerateLongnamesByKind(
  collection: TJSDocSaltyCollection<TDoclet>,
  kind: PageKind,
): string[] {
  const doclets = collection({ kind }).get();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of doclets) {
    if (!d.longname || seen.has(d.longname)) continue;
    if (d.undocumented) continue;
    seen.add(d.longname);
    out.push(d.longname);
  }
  return out;
}

/** Returns the unique class longnames in the collection that have a canonical doclet. */
export function enumerateClassLongnames(collection: TJSDocSaltyCollection<TDoclet>): string[] {
  return enumerateLongnamesByKind(collection, 'class');
}

/** Per-render threading options shared by every container/globals page. */
interface RenderOptions {
  sourceLink?: DocletBlocksOptions['sourceLink'];
  resolveLink?: DocletBlocksOptions['resolveLink'];
  resolveTutorial?: DocletBlocksOptions['resolveTutorial'];
}

/**
 * Render an already-built {@link ContainerView} into a {@link Page}. This is the
 * one place a container's mdast is assembled → link tags resolved → serialized,
 * so the two-pass build in `generateSite` can reuse the view from its dedup pass
 * (rather than rebuilding it). When `resolveLink` is provided, every `{@link}` /
 * `@see` reference in the tree is rewritten to a real anchor before `toMdx`;
 * without a resolver the output is byte-identical to the pre-link-resolution
 * builder.
 */
export function renderContainerPage(
  view: ContainerView,
  kind: PageKind,
  longname: string,
  slug: string,
  { sourceLink, resolveLink, resolveTutorial }: RenderOptions = {},
): Page {
  const tree = containerViewToMdast(view, { sourceLink, resolveLink, resolveTutorial });
  if (resolveLink) resolveLinkTags(tree, resolveLink);

  const title = view.doclet.name ?? view.doclet.longname ?? longname;
  const description = view.doclet.classdesc
    ? stripHtml(view.doclet.classdesc)
    : view.doclet.description
      ? stripHtml(view.doclet.description)
      : undefined;

  const frontmatter: Frontmatter = {
    title,
    kind,
    longname: view.doclet.longname ?? longname,
    ...(description ? { description } : {}),
  };

  const body = toMdx(tree, { frontmatter });
  const headings = extractHeadings(tree);

  return { slug, frontmatter, body, mdast: tree, headings };
}

/**
 * Build a single container page (class/interface/mixin/module/namespace);
 * returns null if no container view of `kind` can be built for `longname`.
 * Delegates to {@link renderContainerPage}. The optional `resolveLink` resolves
 * cross-references; omit it for byte-identical legacy output.
 */
export function buildContainerPage(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  kind: PageKind,
  sourceLink?: DocletBlocksOptions['sourceLink'],
  resolveLink?: DocletBlocksOptions['resolveLink'],
): Page | null {
  const view = getContainerView(collection, longname, kind);
  if (!view) return null;
  const slug = slugifyPath(splitLongnameForSlug(longname));
  return renderContainerPage(view, kind, longname, slug, { sourceLink, resolveLink });
}

/**
 * Build a single class page; returns null if the class view cannot be built.
 * Thin alias over {@link buildContainerPage} with `kind: 'class'`.
 */
export function buildClassPage(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  sourceLink?: DocletBlocksOptions['sourceLink'],
): Page | null {
  return buildContainerPage(collection, longname, 'class', sourceLink);
}

/** Kinds that already render as their own standalone page, excluded from the globals page. */
const GLOBALS_EXCLUDED_KINDS = new Set([
  'class',
  'interface',
  'mixin',
  'module',
  'namespace',
  'typedef',
]);

/** Stable slug for the aggregated globals page. */
const GLOBALS_SLUG = 'global';

/**
 * Build the synthetic "Globals" {@link ContainerView} + its slug, or `null` when
 * there are no qualifying global-scope symbols. This is the view-building half of
 * {@link buildGlobalsPage}, split out so `generateSite` can register the globals
 * page into the link registry during its dedup pass before any body is rendered.
 */
export function buildGlobalsView(
  collection: TJSDocSaltyCollection<TDoclet>,
): { view: ContainerView; slug: string } | null {
  const globals = filterDoclets(collection({ scope: 'global' }).get());
  const remainder = globals.filter((d) => !GLOBALS_EXCLUDED_KINDS.has(d.kind ?? ''));
  if (remainder.length === 0) return null;

  const buckets = bucketClassMembers(remainder);
  const view: ContainerView = {
    doclet: { kind: 'global', name: 'Globals' } as unknown as TDoclet,
    kind: 'global',
    augments: [],
    constructorParams: [],
    ...buckets,
  };
  return { view, slug: GLOBALS_SLUG };
}

/**
 * Build the single aggregated "Globals" page: every global-scope symbol that
 * does not already get its own page (functions, members, constants, enums,
 * events) rendered as a member section on one synthetic container. Returns
 * `null` when there are no qualifying globals. Renders through
 * {@link renderContainerPage}; pass `resolveLink` to resolve cross-references in
 * the globals' prose.
 */
export function buildGlobalsPage(
  collection: TJSDocSaltyCollection<TDoclet>,
  sourceLink?: DocletBlocksOptions['sourceLink'],
  resolveLink?: DocletBlocksOptions['resolveLink'],
): Page | null {
  const built = buildGlobalsView(collection);
  if (!built) return null;
  const page = renderContainerPage(built.view, 'global', 'Globals', built.slug, {
    sourceLink,
    resolveLink,
  });
  // The globals page carries no per-symbol longname in its frontmatter.
  delete page.frontmatter.longname;
  return page;
}

/**
 * API page kind → sidebar section label. Kinds without a mapping fall into the
 * "Other" section ({@link OTHER_SECTION}), appended after the ordered sections.
 */
const SECTION_FOR_KIND: Partial<Record<PageKind, string>> = {
  class: 'Classes',
  module: 'Modules',
  namespace: 'Namespaces',
  mixin: 'Mixins',
  interface: 'Interfaces',
  typedef: 'Typedefs',
  global: 'Globals',
};

/** Catch-all section label for page kinds with no explicit mapping. */
const OTHER_SECTION = 'Other';

/** Section label tutorial/guide nav entries are grouped under. */
export const TUTORIALS_SECTION = 'Tutorials';

/**
 * Default sidebar section order, used when the consumer supplies no
 * `sectionOrder`. Includes forward-looking sections (Externals, Events) that
 * have no pages yet; empty sections are simply skipped. A section absent from
 * the effective order is omitted from the sidebar entirely.
 */
export const DEFAULT_SECTION_ORDER: readonly string[] = [
  'Classes',
  'Modules',
  'Externals',
  'Events',
  'Namespaces',
  'Mixins',
  'Interfaces',
  'Typedefs',
  'Globals',
  'Tutorials',
];

/** The sidebar section a page belongs to, by its kind. */
function sectionForPage(page: Page): string {
  return SECTION_FOR_KIND[page.frontmatter.kind] ?? OTHER_SECTION;
}

/** Built-in `id` for the home menu entry (resolved against the README home page). */
export const HOME_MENU_ID = 'home';
/** Built-in `id`s for the source-files menu entry (`source` preferred, `sourceFile` accepted). */
export const SOURCE_MENU_IDS = ['source', 'sourceFile'] as const;

// Default icons (prefixed `source:code`) when a menu entry supplies none.
const HOME_ICON = 'lucide:home';
const SOURCE_ICON = 'lucide:code-xml';
const EXTERNAL_ICON = 'lucide:external-link';

/**
 * A single sidebar **menu** entry from the consumer's `menu` config. The menu is
 * a top region above the API sections (see {@link assembleNav}); each entry is a
 * built-in link (`home` / `source`) or an external link, and renders with an
 * icon.
 *
 * - `id === 'home'` → the README home page (icon defaults to `house`).
 * - `id === 'source'` (or `sourceFile`) → the Source Files index (icon defaults
 *   to `code-xml`).
 * - otherwise → an external link to `link` (or `href`), opening in a new tab.
 *
 * `icon` is a prefixed `source:code` string — `simpleicons:<slug>` (CDN) or
 * `lucide:<name>` (bundled set), see {@link NavNode.icon}. When omitted it
 * defaults by role: home→`lucide:home`, source→`lucide:code-xml`,
 * external→`lucide:external-link`.
 */
export interface MenuItem {
  /** Built-in id (`home` / `source`), or — for an external link — its Simple Icons slug. */
  id?: string;
  /** Display text. Defaults to the built-in label or the link URL. */
  title?: string;
  /** External link URL. */
  link?: string;
  /** External link URL — accepted as an alias for {@link MenuItem.link}. */
  href?: string;
  /** Icon name/slug for the entry. */
  icon?: string;
}

/** Inputs for {@link assembleNav}: the per-source nav pieces + the section order. */
export interface AssembleNavOptions {
  /** API pages, grouped into sections by kind and alphabetized within each. */
  apiPages?: readonly Page[];
  /** Tutorial nav entries (kept in tree order under "Tutorials"). */
  tutorials?: readonly NavNode[];
  /** Home nav entry — always first, ungrouped, regardless of `sectionOrder`. */
  home?: NavNode;
  /** "Source Files" nav entry — always last, ungrouped, regardless of `sectionOrder`. */
  source?: NavNode;
  /**
   * Section labels to render, in order. Acts as BOTH a filter and an ordering:
   * a section absent here is dropped from the sidebar. Defaults to
   * {@link DEFAULT_SECTION_ORDER}. Ignored when {@link AssembleNavOptions.menu}
   * is set.
   */
  sectionOrder?: readonly string[];
  /**
   * Top-region sidebar menu, in order — rendered above the API sections, with a
   * divider between. When set, it OWNS the home/source links: the auto Home
   * (first) and Source Files (last) entries are suppressed and render only if
   * listed here (`id: 'home'` / `id: 'source'`). External links appear inline.
   * The API sections below are still ordered by `sectionOrder`. Each entry
   * carries an icon. See {@link MenuItem}.
   */
  menu?: readonly MenuItem[];
  /**
   * Club related entries within each section into a one-level parent/child tree,
   * grouping by the path segment before the first `/` in their label (e.g.
   * `queue`, `queue/Queue`, `queue/types` collapse under a `queue` parent). A
   * prefix shared by only one entry is left flat (so a lone `strings/format`
   * keeps its full label). See {@link clubNavTree}. Off by default.
   */
  clubSidebarItems?: boolean;
}

/** Child label for the entry that IS the bare prefix (e.g. the `queue` module). */
const CLUB_ROOT_CHILD_LABEL = 'index';

/**
 * Club a section's entries into a one-level parent/child tree by the path
 * segment before the first `/` in each label. A prefix shared by ≥2 entries
 * becomes a non-navigable parent branch whose children are the entries with
 * their prefix stripped (`queue/Queue` → `Queue`); the entry that IS the bare
 * prefix (`queue`) becomes an `index` child, sorted first. A prefix with a
 * single entry is NOT clubbed — it stays flat with its original label (so a lone
 * `strings/format` is untouched). First-occurrence order of prefixes is
 * preserved, so an already-sorted (or tree-ordered) section keeps its order.
 */
export function clubNavTree(nodes: readonly NavNode[]): NavNode[] {
  const groups = new Map<string, NavNode[]>();
  for (const node of nodes) {
    const slash = node.label.indexOf('/');
    const prefix = slash === -1 ? node.label : node.label.slice(0, slash);
    const bucket = groups.get(prefix);
    if (bucket) bucket.push(node);
    else groups.set(prefix, [node]);
  }

  const out: NavNode[] = [];
  for (const [prefix, members] of groups) {
    if (members.length < 2) {
      // Single entry under this prefix → never clubbed; keep it verbatim.
      out.push(members[0]);
      continue;
    }
    const children = members
      .map((m) => ({
        ...m,
        label: m.label === prefix ? CLUB_ROOT_CHILD_LABEL : m.label.slice(prefix.length + 1),
      }))
      // The bare-prefix entry (`index`) leads; the rest stay alphabetized.
      .sort((a, b) => {
        if (a.label === CLUB_ROOT_CHILD_LABEL) return -1;
        if (b.label === CLUB_ROOT_CHILD_LABEL) return 1;
        return a.label.localeCompare(b.label);
      });
    // The parent is a label-only branch (no slug → not navigable).
    out.push({ label: prefix, group: members[0].group, children });
  }
  return out;
}

/**
 * Assemble the final sidebar nav from its parts, honoring `sectionOrder`.
 *
 * Home (if any) is always emitted first and Source Files (if any) always last;
 * neither is controlled by `sectionOrder`. The sections in between follow the
 * effective order exactly — a label not listed is omitted, so passing
 * `["Classes", "Tutorials"]` renders only those two sections. API entries are
 * sorted alphabetically within their section; tutorial entries keep their tree
 * order. Any page kind with no section mapping is collected under "Other" and
 * appended after the ordered sections (a safety net; in practice empty).
 *
 * Each node's `order` mirrors its emission position (section index), so the
 * monotonic-order invariant holds; the sidebar itself renders in array order.
 */
export function assembleNav({
  apiPages = [],
  tutorials = [],
  home,
  source,
  sectionOrder,
  menu,
  clubSidebarItems = false,
}: AssembleNavOptions): NavNode[] {
  // Bucket every section's entries by label.
  const bySection = new Map<string, NavNode[]>();
  const push = (label: string, node: NavNode): void => {
    const bucket = bySection.get(label);
    if (bucket) bucket.push(node);
    else bySection.set(label, [node]);
  };

  for (const p of apiPages) {
    const label = sectionForPage(p);
    push(label, { label: p.frontmatter.title, slug: p.slug, group: label });
  }
  for (const t of tutorials) push(TUTORIALS_SECTION, { ...t, group: TUTORIALS_SECTION });

  // API sections are alphabetized within the section; tutorials keep tree order.
  for (const [label, items] of bySection) {
    if (label !== TUTORIALS_SECTION) items.sort((a, b) => a.label.localeCompare(b.label));
  }

  // Optionally club each section's entries into prefix-grouped subtrees. Done
  // after sorting so club order follows the section order; applies uniformly to
  // every section (API + Tutorials), in both menu and section mode below.
  if (clubSidebarItems) {
    for (const [label, items] of bySection) bySection.set(label, clubNavTree(items));
  }

  const order =
    sectionOrder && sectionOrder.length > 0 ? sectionOrder : DEFAULT_SECTION_ORDER;
  const out: NavNode[] = [];

  if (menu && menu.length > 0) {
    // Menu mode: the menu items form the top region (home/source/externals);
    // they OWN the home/source links (auto Home/Source are suppressed). The API
    // sections still follow `sectionOrder`, below a divider the sidebar draws.
    menu.forEach((item, i) => {
      const node = resolveMenuItem(item, home, source, i);
      if (node) out.push(node);
    });
    appendSections(out, bySection, order);
    return out;
  }

  // Section mode: Home first, ordered sections, Source Files last (no icons).
  if (home) out.push({ ...home, order: -1 });
  appendSections(out, bySection, order);
  if (source) out.push({ ...source, order: order.length + 1 });
  return out;
}

/**
 * Append the API/Tutorials section entries to `out`, in `order`. Sections absent
 * from `order` are dropped — EXCEPT the catch-all "Other" bucket (unmapped
 * kinds), appended last so content never vanishes silently. Mutates `out`.
 */
function appendSections(
  out: NavNode[],
  bySection: Map<string, NavNode[]>,
  order: readonly string[]
): void {
  const seen = new Set<string>();
  order.forEach((label, i) => {
    const items = bySection.get(label);
    if (!items || items.length === 0) return;
    for (const item of items) out.push({ ...item, order: i });
    seen.add(label);
  });

  if (!seen.has(OTHER_SECTION)) {
    const other = bySection.get(OTHER_SECTION);
    if (other && other.length > 0) {
      for (const item of other) out.push({ ...item, order: order.length });
    }
  }
}

/**
 * Resolve one {@link MenuItem} into a top-region nav node, or `null` to skip it.
 *
 * `id: 'home'` / `id: 'source'` (or `sourceFile`) resolve to the built-in home /
 * source link — skipped when that target doesn't exist. Everything else is an
 * external link to `link` (or `href`); an entry with neither a built-in id nor a
 * link is skipped. Icons: an explicit `icon` always wins; home/source fall back
 * to `house` / `code-xml`; an external link falls back to its `id` as a Simple
 * Icons slug, then to `external-link`. Each node is flagged `menu: true`.
 */
function resolveMenuItem(
  item: MenuItem,
  home: NavNode | undefined,
  source: NavNode | undefined,
  order: number
): NavNode | null {
  const title = item.title?.trim();
  const id = item.id?.trim();
  const icon = item.icon?.trim();

  if (id === HOME_MENU_ID) {
    if (!home) return null;
    return { ...home, label: title || home.label, icon: icon || HOME_ICON, menu: true, order };
  }
  if (id && (SOURCE_MENU_IDS as readonly string[]).includes(id)) {
    if (!source) return null;
    return { ...source, label: title || source.label, icon: icon || SOURCE_ICON, menu: true, order };
  }

  // External link.
  const link = (item.link ?? item.href)?.trim();
  if (link) {
    return {
      label: title || link,
      href: link,
      external: true,
      icon: icon || EXTERNAL_ICON,
      menu: true,
      order,
    };
  }

  return null;
}

/**
 * Nav grouped by page kind in the default section order. Thin wrapper over
 * {@link assembleNav} kept for callers that only need the API section nav.
 */
export function buildNav(pages: readonly Page[]): NavNode[] {
  return assembleNav({ apiPages: pages });
}

/**
 * `{timestamp}-{hash}` where the hash is a stable digest over slugs + bodies.
 * The timestamp prefix changes per build; the hash suffix is content-stable.
 */
export function computeBuildId(pages: readonly Page[]): string {
  const hash = createHash('sha256');
  for (const page of pages) {
    hash.update(page.slug);
    hash.update('\0');
    hash.update(page.body);
    hash.update('\0');
  }
  return `${Date.now().toString(36)}-${hash.digest('hex').slice(0, 8)}`;
}
