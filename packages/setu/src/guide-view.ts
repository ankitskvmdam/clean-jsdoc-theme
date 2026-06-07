/**
 * README + tutorial pages.
 *
 * JSDoc surfaces two kinds of free-form prose alongside the API: the project
 * README (`opts.readme`, already rendered to HTML by JSDoc's markdown plugin)
 * and tutorials (the `--tutorials` directory, resolved into a tree of raw
 * Markdown / HTML documents). Both become ordinary {@link Page}s so they flow
 * through the same MDX → dwar render path as class pages — same chrome, TOC,
 * heading anchors, and search indexing.
 *
 * The README becomes the site home page (slug `''` → `index.html`); tutorials
 * become guide pages under `tutorials/<name>`, grouped under "Tutorials" in the
 * nav with their resolved hierarchy flattened in document order.
 */

import type { Root } from 'mdast';
import {
  slugifyPath,
  type Frontmatter,
  type NavNode,
  type Page,
} from '@clean-jsdoc-theme/utils';
import { htmlToMdastBlocks, markdownToMdastBlocks } from './mdast/from-html';
import { resolveLinkTags } from './mdast/link-tags';
import type { ResolvedLink } from './link-registry';
import { toMdx } from './mdx';
import { extractHeadings } from './generate-site';

/**
 * A tutorial, normalized away from JSDoc's `Tutorial` class so setu doesn't
 * depend on JSDoc internals. The bridge walks JSDoc's resolver tree and hands
 * setu this plain shape.
 */
export interface TutorialInput {
  /** Identifier — the source filename without its extension. */
  name: string;
  /** Display title (from a `.json` config, else the file name). */
  title: string;
  /** Raw source content (Markdown or HTML, per `type`). */
  content: string;
  /** Source format. */
  type: 'markdown' | 'html';
  /** Child tutorials, in resolved order. */
  children?: TutorialInput[];
}

/** Sidebar group label for tutorial pages. */
export const TUTORIALS_GROUP = 'Tutorials';
/** URL prefix for tutorial pages (`tutorials/<name>`). */
const TUTORIAL_SLUG_PREFIX = 'tutorials';

/**
 * Parse raw content into a structured mdast tree per its source format. Both
 * formats normalize through HTML so the resulting tree carries only structured
 * nodes (no raw HTML, no angle-bracket autolinks) — the prerequisite for
 * serializing MDX-safe output downstream. See {@link markdownToMdastBlocks}.
 */
function contentToMdast(content: string, type: 'markdown' | 'html'): Root {
  const children =
    type === 'html' ? htmlToMdastBlocks(content) : markdownToMdastBlocks(content);
  return { type: 'root', children };
}

/**
 * Build the home page from the README HTML JSDoc provides in `opts.readme`.
 * Returns `null` when the README has no renderable content. The page lives at
 * the site root (slug `''`), so dwar writes it to `index.html`.
 */
export function buildReadmePage(
  readmeHtml: string,
  pkg?: { name?: string },
  resolveLink?: (target: string) => ResolvedLink | null,
): Page | null {
  const tree: Root = { type: 'root', children: htmlToMdastBlocks(readmeHtml) };
  if (tree.children.length === 0) return null;
  if (resolveLink) resolveLinkTags(tree, resolveLink);

  const title = pkg?.name ?? 'Home';
  const frontmatter: Frontmatter = { title, kind: 'index' };
  // README arrives as HTML, so serialize the converted tree (no raw Markdown to
  // preserve). dwar compiles the resulting MDX exactly like any other page.
  const body = toMdx(tree, { frontmatter });
  const headings = extractHeadings(tree);

  return { slug: '', frontmatter, body, mdast: tree, headings };
}

/** Build a single tutorial page; returns `null` when it has no content. */
function buildTutorialPage(
  t: TutorialInput,
  resolveLink?: (target: string) => ResolvedLink | null,
): Page | null {
  const content = typeof t.content === 'string' ? t.content : '';
  const tree = contentToMdast(content, t.type);
  if (tree.children.length === 0) return null;
  if (resolveLink) resolveLinkTags(tree, resolveLink);

  const title = t.title?.trim() || t.name;
  const slug = `${TUTORIAL_SLUG_PREFIX}/${slugifyPath([t.name])}`;
  const frontmatter: Frontmatter = { title, kind: 'guide' };

  // Both formats are normalized to structured mdast (see contentToMdast), then
  // serialized to MDX-safe Markdown. Markdown is no longer passed through
  // verbatim: GFM-but-not-MDX constructs (angle-bracket autolinks, raw/unclosed
  // HTML) would otherwise abort the page compile in dwar. The GFM round-trip
  // preserves tables, task lists, strikethrough, and footnotes.
  const body = toMdx(tree, { frontmatter });
  const headings = extractHeadings(tree);

  return { slug, frontmatter, body, mdast: tree, headings };
}

/**
 * Build guide pages + nav entries from the tutorial tree. The hierarchy is
 * flattened depth-first into a single "Tutorials" group, preserving the order
 * JSDoc resolved (parent before its children).
 */
export function buildTutorialPages(
  tutorials: readonly TutorialInput[],
  resolveLink?: (target: string) => ResolvedLink | null,
): { pages: Page[]; nav: NavNode[] } {
  const pages: Page[] = [];
  const nav: NavNode[] = [];
  let order = 0;

  const walk = (t: TutorialInput): void => {
    const page = buildTutorialPage(t, resolveLink);
    if (page) {
      pages.push(page);
      nav.push({
        label: page.frontmatter.title,
        slug: page.slug,
        group: TUTORIALS_GROUP,
        order: order++,
      });
    }
    for (const child of t.children ?? []) walk(child);
  };

  for (const t of tutorials) walk(t);
  return { pages, nav };
}
