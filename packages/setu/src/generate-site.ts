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

/**
 * Build a single container page (class/interface/mixin/module/namespace);
 * returns null if no container view of `kind` can be built for `longname`.
 */
export function buildContainerPage(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
  kind: PageKind,
  sourceLink?: DocletBlocksOptions['sourceLink'],
): Page | null {
  const view = getContainerView(collection, longname, kind);
  if (!view) return null;

  const tree = containerViewToMdast(view, { sourceLink });
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
  const slug = slugifyPath(splitLongnameForSlug(longname));
  const headings = extractHeadings(tree);

  return { slug, frontmatter, body, mdast: tree, headings };
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

/**
 * Build the single aggregated "Globals" page: every global-scope symbol that
 * does not already get its own page (functions, members, constants, enums,
 * events) rendered as a member section on one synthetic container. Returns
 * `null` when there are no qualifying globals.
 */
export function buildGlobalsPage(
  collection: TJSDocSaltyCollection<TDoclet>,
): Page | null {
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

  const tree = containerViewToMdast(view, {});
  const frontmatter: Frontmatter = { title: 'Globals', kind: 'global' };
  const body = toMdx(tree, { frontmatter });
  const headings = extractHeadings(tree);

  return { slug: 'global', frontmatter, body, mdast: tree, headings };
}

/**
 * Sidebar groups, in display order. Each page kind maps to a human-readable
 * group label; kinds not listed fall into "Other" at the end.
 */
const KIND_GROUPS: { kind: PageKind; label: string }[] = [
  { kind: 'module', label: 'Modules' },
  { kind: 'namespace', label: 'Namespaces' },
  { kind: 'class', label: 'Classes' },
  { kind: 'interface', label: 'Interfaces' },
  { kind: 'mixin', label: 'Mixins' },
  { kind: 'typedef', label: 'Typedefs' },
  { kind: 'global', label: 'Globals' },
];

const GROUP_LABEL = new Map<PageKind, string>(KIND_GROUPS.map((g) => [g.kind, g.label]));
const GROUP_ORDER = new Map<PageKind, number>(KIND_GROUPS.map((g, i) => [g.kind, i]));
const OTHER_GROUP = { label: 'Other', order: KIND_GROUPS.length };

/**
 * Nav grouped by page kind. Each entry carries its group label + a stable sort
 * order; the sidebar buckets contiguous same-group entries under a group title.
 * Groups follow {@link KIND_GROUPS}; entries are alphabetical within a group.
 */
export function buildNav(pages: readonly Page[]): NavNode[] {
  return pages
    .map<NavNode>((p) => ({
      label: p.frontmatter.title,
      slug: p.slug,
      group: GROUP_LABEL.get(p.frontmatter.kind) ?? OTHER_GROUP.label,
      order: GROUP_ORDER.get(p.frontmatter.kind) ?? OTHER_GROUP.order,
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label));
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
