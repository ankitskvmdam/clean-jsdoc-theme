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
import {
  KNOWN_PROVIDERS,
  parsePlaygroundSpec,
  resolvePlaygroundOpts,
  type PlaygroundOpts,
} from './playground';
import { resolveLinkTags } from './mdast/link-tags';
import { resolveSlotText } from './slots';
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
  return longname
    .replace(LONGNAME_SEPARATORS, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 0);
}

/**
 * Parse an API symbol's `@category` tag — the explicit sidebar group for its
 * page, optionally with `key=value` options. `@category Core/Parsing order=1`
 * arrives as `doclet.tags = [{ title:'category', text:'Core/Parsing order=1' }]`
 * (JSDoc keeps unknown block tags); the first one wins.
 *
 * The leading whitespace-delimited tokens form the `group` path (a `/`-path that
 * nests the symbol, `Core` ▸ `Parsing`); parsing switches to options at the first
 * token containing `=`. Today the only option is `order` — the within-group sort
 * key, mirroring a doc page's `frontmatter.order`: it positions the page among
 * its sibling leaves AND its subgroup among sibling branches (a branch sorts by
 * the min `order` of the pages inside it; see {@link buildGroupTree}).
 *
 * Returns `undefined` when the symbol carries no `@category` (the page then falls
 * back to its kind section, see {@link sectionForPage}) or the path is empty; a
 * missing/non-numeric `order` is left `undefined` (the page sorts last,
 * alphabetically, exactly as an untagged one would).
 */
function parseCategory(doclet: {
  tags?: { title?: string; text?: string }[];
}): { group: string; order?: number } | undefined {
  const tag = doclet.tags?.find((t) => t.title === 'category');
  const text = tag?.text?.trim();
  if (!text) return undefined;

  const tokens = text.split(/\s+/);
  const pathTokens: string[] = [];
  const options = new Map<string, string>();
  for (const token of tokens) {
    const eq = token.indexOf('=');
    // The path is the leading run of plain tokens; the first `key=value` token
    // (and everything after it) is options. A space in a category name therefore
    // stays part of the path — `@category Getting Started order=1` groups under
    // "Getting Started" — as long as it precedes the first option.
    if (eq > 0 && pathTokens.length > 0) {
      options.set(token.slice(0, eq).toLowerCase(), token.slice(eq + 1));
    } else {
      pathTokens.push(token);
    }
  }

  const group = pathTokens.join(' ').trim();
  if (!group) return undefined;

  const orderText = options.get('order');
  const orderNum = orderText !== undefined ? Number(orderText) : NaN;
  const order = Number.isFinite(orderNum) ? orderNum : undefined;
  return order !== undefined ? { group, order } : { group };
}

/**
 * Read a standalone `@order N` block tag → a finite sort key, or `undefined`.
 *
 * Unlike the inline `@category … order=` option (which only a symbol carrying a
 * category can use), `@order` positions ANY documented symbol — including a
 * plain `@module`/`@class`/`@namespace` that lives in its kind section
 * (Modules, Classes, …) rather than a `@category` group. It is an unknown tag
 * (needs `tags.allowUnknownTags`, exactly as `@category` already relies on), so
 * JSDoc hands us its text untouched; the built-in name-bearing tags can't carry
 * the same `key=value` (trailing text pollutes the name or is dropped). A
 * missing/non-numeric value is left `undefined` (the page sorts last,
 * alphabetically), exactly as an untagged one would.
 */
function readOrder(doclet: { tags?: { title?: string; text?: string }[] }): number | undefined {
  const tag = doclet.tags?.find((t) => t.title === 'order');
  const text = tag?.text?.trim();
  if (!text) return undefined;
  const num = Number(text);
  return Number.isFinite(num) ? num : undefined;
}

/** Site-wide playground enablement passed into {@link generateSite}. */
export interface PlaygroundSiteConfig {
  /** Opt every `@example` in (using {@link PlaygroundSiteConfig.providers}). */
  enableForAllExamples?: boolean;
  /** Default provider set + order for a bare `@playground` / `enableForAllExamples`. */
  providers?: PlaygroundOpts['providers'];
}

/**
 * Build the per-doclet `@playground` resolver from the site-wide config — the
 * §3.3 resolution table. A doclet's `@playground` tag (parsed via
 * {@link parsePlaygroundSpec}) wins: an explicit provider list is used as-is, a
 * bare tag falls back to the default set, and `none`/`off` opts out (but still
 * wraps for a `filename`/`highlight`). With no tag, `enableForAllExamples` opts
 * the example in with the default set; otherwise no wrapper. Returns `undefined`
 * when there is no config at all (feature off → byte-identical output).
 */
export function makePlaygroundResolver(
  config: PlaygroundSiteConfig | undefined
): ((doclet: TDoclet) => PlaygroundOpts | null) | undefined {
  if (!config) return undefined;
  const defaults = config.providers && config.providers.length > 0 ? config.providers : [...KNOWN_PROVIDERS];
  const enableAll = config.enableForAllExamples ?? false;
  return (doclet: TDoclet) => {
    const tag = doclet.tags?.find((t) => t.title === 'playground');
    if (tag) {
      const raw = typeof tag.value === 'string' ? tag.value : (tag.text ?? '');
      return resolvePlaygroundOpts(parsePlaygroundSpec(raw), defaults);
    }
    if (enableAll) return { providers: [...defaults], highlight: [] };
    return null;
  };
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

/** Read a string attribute off an mdast-mdx JSX element node. */
function jsxAttr(
  node: { attributes?: { name?: string; value?: unknown }[] },
  name: string
): string | undefined {
  const attr = node.attributes?.find((a) => a.name === name);
  return typeof attr?.value === 'string' ? attr.value : undefined;
}

/**
 * Walk an mdast tree and emit a `Heading` per h{minDepth}..h6 in document order,
 * with IDs slugified through a per-page registry so duplicates dedupe
 * consistently with what the renderer will produce.
 *
 * h1 handling is adaptive: a lone h1 is the page title and is skipped
 * (`minDepth` stays 2). But when a page has *two or more* h1s the author is
 * using h1 as section structure rather than as a title, so they're surfaced
 * like any other heading (`minDepth` drops to 1) and join the dedup registry.
 * dwar's slug pass makes the exact same count-then-decide choice, so the
 * `#id` numbering stays identical on both sides.
 *
 * `<MemberHeading>` JSX nodes (setu's signature headings) are also picked up:
 * their explicit `id`/`name`/`depth` attributes become the entry directly, and
 * they do NOT touch the dedup registry — mirroring dwar's slug pass, which skips
 * them (they carry an explicit id), so the `-1`/`-2` numbering of real markdown
 * headings stays in sync between the two. Members are never h1, so this branch
 * is unaffected by the adaptive `minDepth`.
 */
export function extractHeadings(tree: Root): Heading[] {
  let h1Count = 0;
  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 1) h1Count++;
  }
  const minDepth = h1Count >= 2 ? 1 : 2;

  const registry = new Map<string, number>();
  const out: Heading[] = [];
  for (const node of tree.children) {
    if (node.type === 'mdxJsxFlowElement' && (node as { name?: string }).name === 'MemberHeading') {
      const id = jsxAttr(node, 'id');
      const text = jsxAttr(node, 'name');
      const depth = Number(jsxAttr(node, 'depth'));
      if (id && text && depth >= 2 && depth <= 6) {
        out.push({ depth: depth as 2 | 3 | 4 | 5 | 6, text, id });
      }
      continue;
    }
    if (node.type !== 'heading') continue;
    if (node.depth < minDepth || node.depth > 6) continue;
    const t = headingText(node).trim();
    if (!t) continue;
    out.push({
      depth: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
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
  kind: PageKind
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
  /** Translatable-prose slot resolver (collect + per-locale translate). */
  slots?: DocletBlocksOptions['slots'];
  /** Per-doclet `@playground` resolver (see {@link makePlaygroundResolver}). */
  playgroundFor?: DocletBlocksOptions['playgroundFor'];
  /** Document-model flavor; `'typedoc'` switches member sections + module index. */
  flavor?: 'jsdoc' | 'typedoc';
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
  { sourceLink, resolveLink, resolveTutorial, slots, playgroundFor, flavor }: RenderOptions = {}
): Page {
  const tree = containerViewToMdast(view, {
    sourceLink,
    resolveLink,
    resolveTutorial,
    slots,
    playgroundFor,
    flavor,
  });
  if (resolveLink) resolveLinkTags(tree, resolveLink);

  const title = view.doclet.name ?? view.doclet.longname ?? longname;
  // The frontmatter description (page <meta> + search excerpt) is derived from
  // the same source as the body description, so it tracks the same `…#description`
  // slot — a stamped locale localizes the excerpt too, not just the visible prose.
  // Identity by default → byte-identical (stripHtml of the unchanged source). Key
  // off `view.doclet.longname` (NOT the `longname` param fallback) so the
  // frontmatter and the body's `descriptionBlocks` always resolve the SAME key —
  // otherwise a doclet without a longname could localize the excerpt but not the
  // body. Both short-circuit to the source when the longname is absent.
  const descriptionSource = resolveSlotText(
    slots,
    view.doclet.longname,
    'description',
    view.doclet.classdesc ?? view.doclet.description
  );
  const description = descriptionSource ? stripHtml(descriptionSource) : undefined;

  // `@category` (if any) becomes the sidebar group — possibly a `/`-path that
  // nests the page (`Core/Parsing` → Core ▸ Parsing) — and its `order=` option
  // (if any) the within-group sort key. Untagged symbols carry no group and fall
  // back to their kind section in `sectionForPage`. The globals page's synthetic
  // doclet has no tags, so it stays ungrouped as before.
  const category = parseCategory(view.doclet);
  // The within-group sort key. `@category … order=` wins when present (the more
  // specific, co-located declaration); otherwise a standalone `@order N` tag
  // applies — so a plain `@module`/`@class` with no category can still position
  // itself in its kind section. Both feed the same `frontmatter.order`.
  const order = category?.order ?? readOrder(view.doclet);

  const frontmatter: Frontmatter = {
    title,
    kind,
    longname: view.doclet.longname ?? longname,
    ...(description ? { description } : {}),
    ...(category ? { group: category.group } : {}),
    ...(order !== undefined ? { order } : {}),
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
  resolveLink?: DocletBlocksOptions['resolveLink']
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
  sourceLink?: DocletBlocksOptions['sourceLink']
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
  flavor: 'jsdoc' | 'typedoc' = 'jsdoc'
): { view: ContainerView; slug: string } | null {
  const globals = filterDoclets(collection({ scope: 'global' }).get());
  // Under the typedoc flavor, enums/functions/variables each get their own
  // standalone page, so they must NOT also land on the aggregated Globals page.
  const excluded =
    flavor === 'typedoc'
      ? new Set([...GLOBALS_EXCLUDED_KINDS, 'enum', 'function', 'variable'])
      : GLOBALS_EXCLUDED_KINDS;
  const remainder = globals.filter((d) => !excluded.has(d.kind ?? ''));
  if (remainder.length === 0) return null;

  const buckets = bucketClassMembers(remainder);
  const view: ContainerView = {
    doclet: { kind: 'global', name: 'Globals' } as unknown as TDoclet,
    kind: 'global',
    augments: [],
    constructorParams: [],
    constructorParamNames: [],
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
  resolveLink?: DocletBlocksOptions['resolveLink']
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
  enum: 'Enumerations',
  function: 'Functions',
  variable: 'Variables',
  global: 'Globals',
};

/**
 * The kind → section label, flavor-aware. Only `typedef` differs: TypeDoc calls
 * it "Type Aliases" (matching default TypeDoc), JSDoc keeps "Typedefs". Every
 * other label is identical across flavors. Kinds with no mapping return
 * `undefined` (the caller falls back to {@link OTHER_SECTION}).
 */
function sectionForKind(kind: PageKind, flavor: 'jsdoc' | 'typedoc'): string | undefined {
  if (flavor === 'typedoc' && kind === 'typedef') return 'Type Aliases';
  return SECTION_FOR_KIND[kind];
}

/** Catch-all section label for page kinds with no explicit mapping. */
const OTHER_SECTION = 'Other';

/** Section label tutorial/guide nav entries are grouped under. */
export const TUTORIALS_SECTION = 'Tutorials';

/**
 * Fallback section label for a doc page that carries no `group` (no frontmatter
 * group, no directory group, no `defaultDocGroup`). Docs that DO carry a group
 * become their own section under that group's label.
 */
export const DOCS_SECTION = 'Docs';

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

/**
 * Default sidebar section order under the typedoc flavor — matching default
 * TypeDoc's module-index ordering (Enumerations, Classes, Interfaces, Type
 * Aliases, Functions, Variables, then containers). Used when the consumer
 * supplies no `sectionOrder`.
 */
export const TYPEDOC_SECTION_ORDER: readonly string[] = [
  'Enumerations',
  'Classes',
  'Interfaces',
  'Type Aliases',
  'Functions',
  'Variables',
  'Namespaces',
  'Mixins',
  'Modules',
  'Globals',
  'Tutorials',
];

/**
 * The full `group` **path** a page belongs to. An explicit `frontmatter.group`
 * (from an API `@category` tag, or a doc/tutorial page's frontmatter) wins and
 * may be a `/`-path that nests the page; otherwise the page falls back to its
 * kind section label (today's behavior for untagged API symbols). The first
 * path segment is the top-level group (the bold sidebar title); see
 * {@link buildGroupTree}.
 */
function sectionForPage(page: Page, flavor: 'jsdoc' | 'typedoc'): string {
  return page.frontmatter.group ?? sectionForKind(page.frontmatter.kind, flavor) ?? OTHER_SECTION;
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
 *
 * `target` and `class` are optional link presentation: `target` overrides the
 * link target (an external entry still defaults to `_blank`), and `class` adds
 * CSS class(es) to the rendered link.
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
  /**
   * Link `target` attribute (e.g. `_blank`, `_self`). Overrides the default — an
   * external link still defaults to `_blank` when this is omitted.
   */
  target?: string;
  /** Extra CSS class(es) merged onto the rendered menu link. */
  class?: string;
}

/** Inputs for {@link assembleNav}: the per-source nav pieces + the section order. */
export interface AssembleNavOptions {
  /** API pages, grouped into sections by kind and alphabetized within each. */
  apiPages?: readonly Page[];
  /** Tutorial nav entries (kept in tree order under "Tutorials"). */
  tutorials?: readonly NavNode[];
  /**
   * Doc nav entries (the docs directory). Each is bucketed into a section by its
   * OWN `group` (a doc with no group falls into {@link DOCS_SECTION}); entries
   * keep their input order within a section (not alphabetized), like tutorials.
   * The doc-group section labels render in {@link AssembleNavOptions.docGroups}
   * order — after the API sections, before Source Files — when those labels are
   * not already pinned by `sectionOrder`.
   */
  docs?: readonly NavNode[];
  /**
   * Top-level doc-group display order — the doc-group slice of the generalized
   * sidebar `sectionOrder`. Doc-group section labels listed here render in this
   * order; doc groups not listed are appended after them in first-seen order.
   * Folded into the effective section order alongside `sectionOrder` (which
   * stays the authority for any label it lists).
   */
  docGroups?: readonly string[];
  /** Home nav entry — always first, ungrouped, regardless of `sectionOrder`. */
  home?: NavNode;
  /** "Source Files" nav entry — always last, ungrouped, regardless of `sectionOrder`. */
  source?: NavNode;
  /**
   * Top-level group labels to render, in order — one unified list mixing
   * `@category` names, doc-group names, and kind labels (e.g.
   * `["Getting Started", "Core", "Classes", "Globals"]`). For *kind* labels this
   * acts as BOTH a filter and an ordering (a kind label absent here is dropped).
   * Category/doc groups it omits are NOT dropped — they render after the listed
   * labels, alphabetically (doc groups pinned by `docGroups` keep that order).
   * Defaults to {@link DEFAULT_SECTION_ORDER}. Ignored when
   * {@link AssembleNavOptions.menu} is set.
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
  /**
   * Document-model flavor. `'typedoc'` resolves kind labels with TypeDoc names
   * (`Type Aliases`) and defaults to {@link TYPEDOC_SECTION_ORDER} when no
   * `sectionOrder` is given; `'jsdoc'` (default) keeps the JSDoc labels +
   * {@link DEFAULT_SECTION_ORDER}.
   */
  flavor?: 'jsdoc' | 'typedoc';
}

/** Child label for the entry that IS the bare prefix (e.g. the `queue` module). */
const CLUB_ROOT_CHILD_LABEL = 'index';

/**
 * One flattened sidebar entry, before nested-group assembly. Carries the leaf
 * {@link NavNode} (the navigable page link), its **full** `group` path (`/`
 * separates nesting levels), and the within-bucket sort key. `path` drives both
 * the top-level group (its first segment → the bold sidebar title) and any
 * deeper branch nodes; `explicit` records whether the group came from an
 * `@category`/frontmatter group (vs. a kind-label fallback) so clubbing can skip
 * already-nested buckets (decision 6). `order` is `frontmatter.order` (sort key
 * within the deepest group); `sort` chooses between alphabetical (API symbols)
 * and input order (tutorials/docs, pre-ordered by their builder).
 */
interface GroupedEntry {
  leaf: NavNode;
  path: string;
  explicit: boolean;
  order?: number;
  sort: 'alpha' | 'input';
}

/** Split a full `group` path into its non-empty `/`-separated segments. */
function splitGroupPath(path: string): string[] {
  return path
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Order the leaf entries of a single deepest bucket. Alphabetical buckets (API
 * symbols and docs) sort by `frontmatter.order` (ascending; unset sorts last)
 * then title — so an untagged kind section stays purely alphabetical,
 * byte-identical to today, and a doc group honors its frontmatter `order`.
 * Input-order buckets (tutorials, already ordered by their builder's tree walk)
 * keep their emission order.
 */
function orderLeafEntries(entries: GroupedEntry[]): GroupedEntry[] {
  if (entries.every((e) => e.sort === 'input')) return entries;
  return [...entries].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.leaf.label.localeCompare(b.leaf.label);
  });
}

/**
 * Build the nested `children` tree for one top-level group from its entries.
 * Each entry's path beyond the top segment becomes a chain of non-navigable
 * **branch** nodes (`children`, no `slug`, label = segment); the entry's leaf
 * sits at the end of its chain. Sibling order: by effective `order` (a leaf's
 * own `order`, a branch's the min `order` of the pages inside it), then leaves
 * before branches, then bucket/first-seen order — so `@category Core/Schema
 * order=2` sorts its subgroup after `Core/Processing order=1`, and an unordered
 * group stays byte-identical to before. Returns the top group's nodes
 * (the array `groupNav` buckets under the bold title), each carrying
 * `group = topLabel` so the renderer's contiguous-run grouping keeps them
 * together. When every entry sits directly under the top group (depth 1, the
 * common/backward-compatible case), this returns a flat list of leaves.
 */
function buildGroupTree(topLabel: string, entries: GroupedEntry[]): NavNode[] {
  // A branch level: ordered child labels + their sub-entries, keyed by label.
  interface Branch {
    order: string[];
    children: Map<string, GroupedEntry[]>;
    leaves: GroupedEntry[];
  }
  const makeBranch = (): Branch => ({ order: [], children: new Map(), leaves: [] });

  // Recursively place entries by their path segments (relative to `depth`).
  function place(level: Branch, items: GroupedEntry[], depth: number): void {
    for (const e of items) {
      const segs = splitGroupPath(e.path);
      if (depth >= segs.length) {
        level.leaves.push(e);
        continue;
      }
      const seg = segs[depth];
      let bucket = level.children.get(seg);
      if (!bucket) {
        bucket = [];
        level.children.set(seg, bucket);
        level.order.push(seg);
      }
      bucket.push(e);
    }
  }

  // A branch's effective order is the min `order` of the pages routed into it, so
  // `order=1` on any page pulls its whole subgroup up among its siblings.
  const minOrder = (items: GroupedEntry[]): number =>
    items.reduce(
      (m, e) => Math.min(m, e.order ?? Number.POSITIVE_INFINITY),
      Number.POSITIVE_INFINITY
    );

  function emit(level: Branch, depth: number, group: string): NavNode[] {
    interface Sibling {
      node: NavNode;
      order: number;
      isLeaf: boolean;
      seq: number;
    }
    const siblings: Sibling[] = [];
    // Leaves at this level, pre-ordered by the bucket rule (order then label);
    // `seq` preserves that as the tiebreak.
    orderLeafEntries(level.leaves).forEach((e, i) => {
      siblings.push({
        // Propagate `order` onto the emitted node so order-aware clubbing
        // (`clubNavTree`) can read it. Conditional so the no-order path adds no
        // `order` key — the backward-compat boundary stays byte-identical.
        node: { ...e.leaf, group, ...(e.order !== undefined ? { order: e.order } : {}) },
        order: e.order ?? Number.POSITIVE_INFINITY,
        isLeaf: true,
        seq: i,
      });
    });
    // Branch nodes (deeper segments); each sorts by the min order of its pages.
    level.order.forEach((seg, i) => {
      const items = level.children.get(seg)!;
      const sub = makeBranch();
      place(sub, items, depth + 1);
      siblings.push({
        node: { label: seg, group, children: emit(sub, depth + 1, group) },
        order: minOrder(items),
        isLeaf: false,
        seq: i,
      });
    });
    // By effective order; on a tie keep leaves before branches, then the
    // pre-computed bucket/first-seen order — so an unordered group is unchanged.
    siblings.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.isLeaf !== b.isLeaf) return a.isLeaf ? -1 : 1;
      return a.seq - b.seq;
    });
    return siblings.map((s) => s.node);
  }

  const root = makeBranch();
  place(root, entries, 1); // segment 0 is the top label itself
  return emit(root, 1, topLabel);
}

/**
 * Club a section's entries into a one-level parent/child tree by the path
 * segment before the first `/` in each label. A prefix shared by ≥2 entries
 * becomes a non-navigable parent branch whose children are the entries with
 * their prefix stripped (`queue/Queue` → `Queue`); the entry that IS the bare
 * prefix (`queue`) becomes an `index` child, sorted first. A prefix with a
 * single entry is NOT clubbed — it stays flat with its original label (so a lone
 * `strings/format` is untouched), but its `order` still participates in the
 * parent-level sort below.
 *
 * Order-aware (decisions 4/5): a clubbed parent sorts by the **min `order`** of
 * its members (so `@order 1` on any member floats the whole parent up), and
 * children sort by `order` then the `index`-first tiebreak then name (so
 * `@order` can pull a sibling ahead of the bare-prefix `index` child). With no
 * `@order`/`order=` anywhere every effective order is `+∞`, so parents fall back
 * to first-seen order and children to `index`-first-then-alphabetical — i.e. an
 * unordered section is byte-identical to before.
 */
export function clubNavTree(nodes: readonly NavNode[]): NavNode[] {
  const groups = new Map<string, NavNode[]>();
  const firstSeen = new Map<string, number>();
  let seq = 0;
  for (const node of nodes) {
    const slash = node.label.indexOf('/');
    const prefix = slash === -1 ? node.label : node.label.slice(0, slash);
    const bucket = groups.get(prefix);
    if (bucket) bucket.push(node);
    else {
      groups.set(prefix, [node]);
      firstSeen.set(prefix, seq++);
    }
  }

  // A parent's effective order is the min `order` of its members (unset → +∞),
  // mirroring how `buildGroupTree` orders branch nodes.
  const minOrder = (members: NavNode[]): number =>
    members.reduce(
      (m, n) => Math.min(m, n.order ?? Number.POSITIVE_INFINITY),
      Number.POSITIVE_INFINITY
    );

  interface Parent {
    node: NavNode;
    order: number;
    seq: number;
  }
  const parents: Parent[] = [];
  for (const [prefix, members] of groups) {
    const seqIdx = firstSeen.get(prefix)!;
    if (members.length < 2) {
      // Single entry under this prefix → never clubbed; keep it verbatim, but
      // let its own order place it among the section's parents.
      parents.push({
        node: members[0],
        order: members[0].order ?? Number.POSITIVE_INFINITY,
        seq: seqIdx,
      });
      continue;
    }
    const children = members
      .map((m) => ({
        ...m,
        label: m.label === prefix ? CLUB_ROOT_CHILD_LABEL : m.label.slice(prefix.length + 1),
      }))
      // By `order` (unset last); on a tie the bare-prefix `index` child leads,
      // then alphabetical — so an explicit `@order` can pull a sibling ahead of
      // `index`, but `index` keeps its pin among otherwise-unordered children.
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        if (a.label === CLUB_ROOT_CHILD_LABEL) return -1;
        if (b.label === CLUB_ROOT_CHILD_LABEL) return 1;
        return a.label.localeCompare(b.label);
      });
    // The parent is a label-only branch (no slug → not navigable).
    parents.push({
      node: { label: prefix, group: members[0].group, children },
      order: minOrder(members),
      seq: seqIdx,
    });
  }

  // Parents by effective order (unset last), then first-seen order — so an
  // unordered section keeps first-seen order (byte-identical) and `@order` on
  // any member floats its parent up.
  parents.sort((a, b) => (a.order !== b.order ? a.order - b.order : a.seq - b.seq));
  return parents.map((p) => p.node);
}

/**
 * Assemble the final sidebar nav from its parts, honoring `sectionOrder`.
 *
 * Every entry carries a full `group` **path** — an `@category` tag (API pages)
 * or `frontmatter.group` (docs/tutorials), falling back to the kind section
 * label for untagged API symbols. The path's first segment is the top-level
 * group (a bold, non-collapsible title); deeper `/`-segments become nested,
 * collapsible branch nodes ({@link buildGroupTree}). So `@category Core/Parsing`
 * nests its page under `Core` ▸ `Parsing`.
 *
 * Top-level groups render in the effective order: `sectionOrder` labels first,
 * in that order (a *kind* label it omits is dropped — today's filter behavior);
 * then category/doc groups it doesn't list, appended alphabetically (doc groups
 * named in `docGroups` keep that explicit order). Within a deepest group, API
 * entries sort by `frontmatter.order` then title (a kind-only section stays
 * purely alphabetical, as before); tutorial/doc entries keep their tree order.
 * Home (if any) is always emitted first and Source Files (if any) always last;
 * neither is controlled by `sectionOrder`. Any page kind with no section mapping
 * is collected under "Other" and appended last (a safety net; in practice empty).
 *
 * Each node's `order` mirrors its emission position (section index), so the
 * monotonic-order invariant holds; the sidebar itself renders in array order.
 *
 * Backward compatible: a collection with no `@category`/group and a kind-only
 * `sectionOrder` produces byte-identical nav to the pre-nesting builder.
 */
export function assembleNav({
  apiPages = [],
  tutorials = [],
  docs = [],
  docGroups = [],
  home,
  source,
  sectionOrder,
  menu,
  clubSidebarItems = false,
  flavor = 'jsdoc',
}: AssembleNavOptions): NavNode[] {
  // Flatten every source into one list of grouped entries carrying their FULL
  // group path (an `@category`/frontmatter group may be a `/`-path that nests
  // the page). The first path segment is the top-level group (the bold title);
  // deeper segments become nested branch nodes below.
  const entries: GroupedEntry[] = [];
  // Top-level groups that originate from an explicit `@category` (not a kind
  // label), in first-seen order. Unlike kind labels — which `sectionOrder`
  // filters — a category group not listed in `sectionOrder` is never dropped; it
  // is appended after the listed sections (alphabetically, with doc groups). This
  // keeps the no-category path byte-identical (this stays empty), so kind-only
  // `sectionOrder` filtering is unchanged.
  const categorySectionOrder: string[] = [];
  for (const p of apiPages) {
    const path = sectionForPage(p, flavor);
    const explicit = p.frontmatter.group !== undefined;
    if (explicit) {
      const top = splitGroupPath(path)[0];
      if (top && !categorySectionOrder.includes(top)) categorySectionOrder.push(top);
    }
    entries.push({
      leaf: { label: p.frontmatter.title, slug: p.slug },
      path,
      // An explicit `frontmatter.group` (from `@category`) opts out of clubbing.
      explicit,
      order: p.frontmatter.order,
      sort: 'alpha',
    });
  }
  for (const t of tutorials) {
    // Use the tutorial's own group, which carries the sub-tutorial hierarchy as
    // a `Tutorials/<parent>/…` path (issue #253); buildGroupTree nests it. A
    // declared hierarchy (group deeper than the bare section) opts out of
    // clubbing so the nesting survives; a flat tutorial set keeps `path` ===
    // TUTORIALS_SECTION and stays clubbable — byte-identical legacy behavior.
    const path = t.group ?? TUTORIALS_SECTION;
    entries.push({ leaf: { ...t }, path, explicit: path !== TUTORIALS_SECTION, sort: 'input' });
  }
  // Doc entries group by their OWN group path (fallback DOCS_SECTION). First-seen
  // top-level group order is captured so groups absent from `docGroups`/
  // `sectionOrder` still render deterministically.
  const docSectionOrder: string[] = [];
  for (const d of docs) {
    const path = d.group ?? DOCS_SECTION;
    const top = splitGroupPath(path)[0] ?? DOCS_SECTION;
    if (!docSectionOrder.includes(top)) docSectionOrder.push(top);
    // Docs carry an explicit `frontmatter.order` (unlike tutorials, which only
    // have the builder's tree order), so sort them by it then title — `order: 2`
    // sits after `order: 1` regardless of the directory-walk order they arrive in.
    entries.push({
      leaf: { ...d },
      path,
      explicit: d.group !== undefined,
      order: d.order,
      sort: 'alpha',
    });
  }

  // Bucket entries by their TOP-LEVEL group (first path segment), preserving
  // first-seen order, then build each bucket's nested `children` tree.
  const byTopGroup = new Map<string, GroupedEntry[]>();
  for (const e of entries) {
    const top = splitGroupPath(e.path)[0] ?? OTHER_SECTION;
    const bucket = byTopGroup.get(top);
    if (bucket) bucket.push(e);
    else byTopGroup.set(top, [e]);
  }

  const bySection = new Map<string, NavNode[]>();
  for (const [top, groupEntries] of byTopGroup) {
    let nodes = buildGroupTree(top, groupEntries);
    // Club ONLY buckets whose entries carry no explicit category/group path
    // (decision 6): a group built from category paths is already nested and is
    // not additionally label-clubbed. Backward compatible — today every API
    // bucket is kind-fallback (`explicit: false`), so clubbing still applies.
    if (clubSidebarItems && groupEntries.every((e) => !e.explicit)) {
      nodes = clubNavTree(nodes);
    }
    bySection.set(top, nodes);
  }

  const defaultOrder = flavor === 'typedoc' ? TYPEDOC_SECTION_ORDER : DEFAULT_SECTION_ORDER;
  const baseOrder = sectionOrder && sectionOrder.length > 0 ? sectionOrder : defaultOrder;
  // Fold doc-group section labels into the effective order, AFTER the base
  // (API) sections: `sectionOrder` stays authoritative for any label it already
  // lists; doc groups it omits are appended in `docGroups` order, then any
  // remaining groups in first-seen order. This keeps the no-docs path's order
  // byte-identical (docExtras is empty when there are no docs).
  const inBase = new Set(baseOrder);
  const seenExtra = new Set<string>();
  // Doc groups named in `docGroups` keep that explicit order, appended first.
  const docOrdered: string[] = [];
  for (const label of docGroups) {
    if (inBase.has(label) || seenExtra.has(label)) continue;
    seenExtra.add(label);
    docOrdered.push(label);
  }
  // Remaining explicit top-level groups (categories + doc groups not pinned by
  // `docGroups`) that `sectionOrder` doesn't list: appended after the listed
  // sections, ALPHABETICALLY (decision 3 — listed-first, then unlisted sorted).
  const alphaExtras: string[] = [];
  for (const label of [...categorySectionOrder, ...docSectionOrder]) {
    if (inBase.has(label) || seenExtra.has(label)) continue;
    seenExtra.add(label);
    alphaExtras.push(label);
  }
  alphaExtras.sort((a, b) => a.localeCompare(b));
  // Under the typedoc flavor, a kind section must never be dropped just because a
  // user-supplied `sectionOrder` didn't list it (default TypeDoc always shows
  // every kind). Append any present-but-unlisted TypeDoc kind label, in the
  // canonical TypeDoc order. JSDoc keeps its legacy "omitted kind = dropped"
  // filter (this loop never runs for it), so its nav stays byte-identical.
  const kindExtras: string[] = [];
  if (flavor === 'typedoc') {
    for (const label of TYPEDOC_SECTION_ORDER) {
      if (inBase.has(label) || seenExtra.has(label) || !bySection.has(label)) continue;
      seenExtra.add(label);
      kindExtras.push(label);
    }
  }
  const extras = [...docOrdered, ...alphaExtras, ...kindExtras];
  const order = extras.length > 0 ? [...baseOrder, ...extras] : baseOrder;
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
  const target = item.target?.trim();
  const linkClass = item.class?.trim();
  // Optional presentation fields, attached only when set so untouched entries
  // stay byte-identical.
  const extra = {
    ...(target ? { target } : {}),
    ...(linkClass ? { class: linkClass } : {}),
  };

  if (id === HOME_MENU_ID) {
    if (!home) return null;
    return {
      ...home,
      label: title || home.label,
      icon: icon || HOME_ICON,
      menu: true,
      order,
      ...extra,
    };
  }
  if (id && (SOURCE_MENU_IDS as readonly string[]).includes(id)) {
    if (!source) return null;
    return {
      ...source,
      label: title || source.label,
      icon: icon || SOURCE_ICON,
      menu: true,
      order,
      ...extra,
    };
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
      ...extra,
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
