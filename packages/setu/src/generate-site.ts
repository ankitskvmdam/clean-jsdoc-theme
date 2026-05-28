import { createHash } from 'node:crypto';
import type { Heading as MdastHeading, Root } from 'mdast';
import {
  slugifyHeading,
  slugifyPath,
  type Frontmatter,
  type Heading,
  type NavNode,
  type Page,
} from '@clean-jsdoc-theme/utils';
import type { TDoclet, TJSDocSaltyCollection } from '@clean-jsdoc-theme/utils';
import { getClassView } from './class-view';
import { classViewToMdast } from './mdast/class-view';
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

/** Returns the unique class longnames in the collection that have a canonical doclet. */
export function enumerateClassLongnames(collection: TJSDocSaltyCollection<TDoclet>): string[] {
  const classes = collection({ kind: 'class' }).get();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of classes) {
    if (!d.longname || seen.has(d.longname)) continue;
    if (d.undocumented) continue;
    seen.add(d.longname);
    out.push(d.longname);
  }
  return out;
}

/** Build a single class page; returns null if the class view cannot be built. */
export function buildClassPage(
  collection: TJSDocSaltyCollection<TDoclet>,
  longname: string,
): Page | null {
  const view = getClassView(collection, longname);
  if (!view) return null;

  const tree = classViewToMdast(view);
  const title = view.doclet.name ?? view.doclet.longname ?? longname;
  const description = view.doclet.classdesc
    ? stripHtml(view.doclet.classdesc)
    : view.doclet.description
      ? stripHtml(view.doclet.description)
      : undefined;

  const frontmatter: Frontmatter = {
    title,
    kind: 'class',
    longname: view.doclet.longname ?? longname,
    ...(description ? { description } : {}),
  };

  const body = toMdx(tree, { frontmatter });
  const slug = slugifyPath(splitLongnameForSlug(longname));
  const headings = extractHeadings(tree);

  return { slug, frontmatter, body, mdast: tree, headings };
}

/** Flat alphabetical nav: one entry per page, label from frontmatter title. */
export function buildNav(pages: readonly Page[]): NavNode[] {
  return pages
    .map<NavNode>((p) => ({ label: p.frontmatter.title, slug: p.slug }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
