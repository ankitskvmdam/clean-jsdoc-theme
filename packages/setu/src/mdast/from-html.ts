import type { PhrasingContent, Root, RootContent } from 'mdast';
import { fromHtml } from 'hast-util-from-html';
import { toMdast } from 'hast-util-to-mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';

/**
 * Convert an HTML fragment (as emitted by JSDoc into `description`, `classdesc`,
 * param descriptions, etc.) into block-level mdast nodes. Empty/blank input
 * returns `[]`.
 *
 * Path: HTML → hast (`hast-util-from-html`) → mdast (`hast-util-to-mdast`). This
 * is the canonical, structure-preserving conversion: it keeps GFM tables, lists,
 * code, links, emphasis, and arbitrary inline/block HTML, where the previous
 * HTML→Markdown→mdast round-trip silently dropped tables and other constructs.
 *
 * Why HTML in the first place: JSDoc's `plugins/markdown` renders Markdown in
 * doclet descriptions to HTML before the theme ever sees them, so a Markdown
 * table in a `@description` arrives here as a `<table>` — which this conversion
 * turns back into an mdast table node.
 */
export function htmlToMdastBlocks(html: string | null | undefined): RootContent[] {
  if (!html) return [];
  const trimmed = html.trim();
  if (trimmed.length === 0) return [];
  const hast = fromHtml(trimmed, { fragment: true });
  const mdast = toMdast(hast) as Root;
  return mdast.children;
}

/**
 * Like {@link htmlToMdastBlocks} but flattens to phrasing (inline) content by
 * pulling children out of the paragraph(s) the conversion produces. Use for
 * fields meant to appear inline, e.g. a param description inside a list item.
 */
export function htmlToMdastInline(html: string | null | undefined): PhrasingContent[] {
  return blocksToInline(htmlToMdastBlocks(html));
}

/**
 * Parse a Markdown fragment into inline (phrasing) mdast content. Used for bits
 * of JSDoc text that are NOT pre-rendered to HTML by the markdown plugin — e.g.
 * an `@example` `<caption>`, which may carry Markdown (`*emphasis*`) and inline
 * HTML (`<b>`). Block structure is flattened to inline.
 */
export function markdownToMdastInline(md: string | null | undefined): PhrasingContent[] {
  if (!md) return [];
  const trimmed = md.trim();
  if (trimmed.length === 0) return [];
  return blocksToInline(fromMarkdown(trimmed).children);
}

/** Flatten block content to inline by unwrapping paragraphs. */
function blocksToInline(blocks: RootContent[]): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      out.push(...block.children);
    }
  }
  return out;
}
