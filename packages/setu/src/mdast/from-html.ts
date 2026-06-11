import type { Blockquote, PhrasingContent, Root, RootContent } from 'mdast';
import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { toMdast } from 'hast-util-to-mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import { gfm } from 'micromark-extension-gfm';
import { callout } from './builders';

/**
 * GitHub-style alert keyword → rang callout variant. A prose blockquote whose
 * first line is one of these markers (`> [!TIP]`, `> [!WARNING]`, …) becomes a
 * typed callout instead of a plain quote. The keywords fold onto rang's four
 * variants (`info` | `tip` | `warning` | `error`): `NOTE`/`IMPORTANT` read as
 * info, `TIP`/`SUCCESS` as the green tip, and `CAUTION` as warning.
 */
const CALLOUT_ALERTS: Record<string, 'info' | 'tip' | 'warning' | 'error'> = {
  info: 'info',
  note: 'info',
  important: 'info',
  tip: 'tip',
  success: 'tip',
  warning: 'warning',
  caution: 'warning',
  error: 'error',
  danger: 'error',
};

/** Leading `[!type]` marker at the start of a blockquote's first text node. */
const ALERT_MARKER = /^\s*\[!(\w+)\]\s*/;

/**
 * Promote a blockquote that opens with a GitHub-style alert marker
 * (`> [!INFO]`, `> [!WARNING]`, …) to a rang callout, stripping the marker from
 * the body. An absent or unknown marker leaves the blockquote untouched (a plain
 * quote). The callout is the same capitalized `<Callout type="…">` MDX JSX node
 * setu emits for `@deprecated`, so it round-trips through serialization to dwar.
 */
function blockquoteToCallout(node: Blockquote): RootContent {
  const para = node.children[0];
  if (!para || para.type !== 'paragraph') return node;
  const lead = para.children[0];
  if (!lead || lead.type !== 'text') return node;
  const match = ALERT_MARKER.exec(lead.value);
  if (!match) return node;
  const variant = CALLOUT_ALERTS[match[1].toLowerCase()];
  if (!variant) return node;

  // Strip the marker from the body. If that empties the lead text node, drop it
  // (plus a soft break the conversion may have left right after the marker), and
  // drop the now-empty first paragraph entirely.
  lead.value = lead.value.slice(match[0].length);
  if (lead.value.length === 0) {
    para.children.shift();
    if (para.children[0]?.type === 'break') para.children.shift();
  }
  if (para.children.length === 0) node.children.shift();

  return callout(variant, node.children);
}

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
  // Promote GitHub-style alert blockquotes (`> [!INFO]`) to typed callouts.
  // Done here, after the HTML normalization, so it applies uniformly to every
  // prose source (README, tutorials, docs) and to JSDoc doclet descriptions.
  return mdast.children.map((node) =>
    node.type === 'blockquote' ? blockquoteToCallout(node) : node
  );
}

/**
 * Convert a raw Markdown document into block-level mdast nodes, routing through
 * the same HTML normalization {@link htmlToMdastBlocks} uses.
 *
 * Path: Markdown → mdast (GFM) → hast → HTML string → {@link htmlToMdastBlocks}.
 * The HTML round-trip is deliberate: Markdown tutorials are full of constructs
 * that are valid GitHub-Flavored Markdown but NOT valid MDX — angle-bracket
 * autolinks (`<https://…>`), void/unclosed raw HTML (`<img …>`), and inline HTML
 * MDX would otherwise parse as JSX and reject. Re-parsing the rendered HTML with
 * a lenient HTML parser (`fromHtml`) and lowering it through `hast-util-to-mdast`
 * yields only structured mdast nodes (links, images, tables, …) — no raw HTML —
 * which {@link import('../mdx').toMdx} can serialize into MDX-safe Markdown. This
 * mirrors the README path exactly, so tutorials and the README render identically.
 *
 * GFM (tables, strikethrough, task lists, autolink literals, footnotes) is parsed
 * via `micromark-extension-gfm`; without it those constructs would survive only
 * as plain text once round-tripped.
 */
export function markdownToMdastBlocks(md: string | null | undefined): RootContent[] {
  if (!md) return [];
  const trimmed = md.trim();
  if (trimmed.length === 0) return [];
  const mdast = fromMarkdown(trimmed, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  }) as Root;
  // `allowDangerousHtml` keeps embedded raw HTML in the tree so the HTML parser
  // downstream can normalize it (e.g. self-close `<img>`), rather than dropping it.
  const hast = toHast(mdast, { allowDangerousHtml: true });
  const html = toHtml(hast, { allowDangerousHtml: true });
  return htmlToMdastBlocks(html);
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

/** mdast phrasing (inline) node types that can sit directly among `blocks`. */
const PHRASING_TYPES = new Set<string>([
  'text',
  'emphasis',
  'strong',
  'inlineCode',
  'delete',
  'link',
  'linkReference',
  'image',
  'imageReference',
  'break',
  'html',
  'footnoteReference',
]);

/**
 * Flatten block content to inline: unwrap paragraphs, and pass through any
 * phrasing node that the conversion left at the top level. A short HTML/text
 * fragment (e.g. a bare `@deprecated` reason like `use foo instead`) lowers to
 * a root-level `text` node rather than a paragraph — without this it would be
 * silently dropped. Genuine block nodes (tables, lists) are still skipped.
 */
function blocksToInline(blocks: RootContent[]): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      out.push(...block.children);
    } else if (PHRASING_TYPES.has(block.type)) {
      out.push(block as PhrasingContent);
    }
  }
  return out;
}
