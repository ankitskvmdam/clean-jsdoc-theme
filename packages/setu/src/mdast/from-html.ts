import type {
  BlockContent,
  Blockquote,
  DefinitionContent,
  PhrasingContent,
  Root,
  RootContent,
} from 'mdast';
import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { toMdast } from 'hast-util-to-mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import { gfm } from 'micromark-extension-gfm';
import { callout, step, steps, tab, tabs } from './builders';

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

// ── `<steps>` / `<tabs>` authoring containers ───────────────────────────────

/**
 * A `<steps>`/`<tabs>` container item: its optional `label` and the inner
 * markdown/HTML `raw` (full content, re-parsed recursively).
 */
interface ContainerItem {
  label?: string;
  raw: string;
}

/**
 * One slice of a raw prose string: either a `plain` run (no container) handed
 * to the normal converter, or a `steps`/`tabs` container whose items expand into
 * the capitalized `<Steps>`/`<Tabs>` JSX nodes.
 */
type Segment =
  | { kind: 'plain'; raw: string }
  | { kind: 'steps' | 'tabs'; items: ContainerItem[] };

/** Matches a top-level `<steps …>` / `<tabs …>` opening tag (case-insensitive). */
const CONTAINER_OPEN = /<(steps|tabs)(\s[^>]*)?>/i;
/** Reads a `label="…"` / `label='…'` attribute off an item's opening tag. */
const LABEL_ATTR = /label\s*=\s*("([^"]*)"|'([^']*)')/i;

/**
 * Find the index just past the close tag matching an open tag of `name` that
 * begins at `openEnd` (the position right after the open tag). Depth-counts
 * same-name open/close tags so a `<steps>` nested inside a `<steps>` closes the
 * inner one first. Returns `-1` when no matching close exists.
 */
function findMatchingClose(raw: string, name: string, openEnd: number): number {
  const tag = new RegExp(`<(/?)${name}(\\s[^>]*)?>`, 'gi');
  tag.lastIndex = openEnd;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(raw)) !== null) {
    if (match[1] === '/') {
      depth -= 1;
      if (depth === 0) return tag.lastIndex;
    } else {
      depth += 1;
    }
  }
  return -1;
}

/**
 * Parse a container's INNER string into items by scanning for `<step …>…</step>`
 * (or `<tab …>…</tab>`) elements, depth-counted so a nested same-name container
 * inside an item doesn't terminate it early. Reads `label` from each item's open
 * tag; the item's `raw` is the trimmed inner content. Whitespace/text between
 * items is ignored.
 */
function parseItems(inner: string, itemName: string): ContainerItem[] {
  const items: ContainerItem[] = [];
  const open = new RegExp(`<${itemName}(\\s[^>]*)?>`, 'gi');
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = open.exec(inner)) !== null) {
    if (match.index < cursor) continue; // inside a previously consumed item
    const openTag = match[0];
    const bodyStart = match.index + openTag.length;
    const closeIndex = findMatchingClose(inner, itemName, bodyStart);
    if (closeIndex === -1) break; // unterminated item — stop scanning
    const close = new RegExp(`</${itemName}(\\s[^>]*)?>\\s*$`, 'i');
    const body = inner.slice(bodyStart, closeIndex).replace(close, '');
    const labelMatch = LABEL_ATTR.exec(openTag);
    const label = labelMatch ? (labelMatch[2] ?? labelMatch[3]) : undefined;
    items.push({ label: label || undefined, raw: body.trim() });
    cursor = closeIndex;
    open.lastIndex = closeIndex;
  }
  return items;
}

/**
 * Scan `raw` left to right for top-level `<steps>`/`<tabs>` containers, splitting
 * it into `plain` runs and container segments. A `raw` with no container returns
 * a single `plain` segment, so behavior is byte-identical to before when no
 * containers are present. A container that yields zero items falls back to a
 * `plain` segment carrying its whole match, so nothing is silently dropped.
 *
 * This must run on the RAW string BEFORE the HTML round-trip: `fromHtml`/
 * `toMdast` (and the markdown→html lowering) strip these custom lowercase tags,
 * so by the time conversion runs they would be gone.
 */
function splitContainers(raw: string): Segment[] {
  const segments: Segment[] = [];
  let rest = raw;
  for (;;) {
    const open = CONTAINER_OPEN.exec(rest);
    if (!open) {
      if (rest.length > 0) segments.push({ kind: 'plain', raw: rest });
      break;
    }
    const name = open[1].toLowerCase() as 'steps' | 'tabs';
    const openEnd = open.index + open[0].length;
    const closeEnd = findMatchingClose(rest, name, openEnd);
    if (closeEnd === -1) {
      // No matching close — treat the remainder as plain so nothing is dropped.
      if (rest.length > 0) segments.push({ kind: 'plain', raw: rest });
      break;
    }

    const before = rest.slice(0, open.index);
    if (before.length > 0) segments.push({ kind: 'plain', raw: before });

    const close = new RegExp(`</${name}(\\s[^>]*)?>\\s*$`, 'i');
    const inner = rest.slice(openEnd, closeEnd).replace(close, '');
    const itemName = name === 'steps' ? 'step' : 'tab';
    const items = parseItems(inner, itemName);
    if (items.length > 0) {
      segments.push({ kind: name, items });
    } else {
      // Degenerate container (no items) — keep its source as plain text.
      segments.push({ kind: 'plain', raw: rest.slice(open.index, closeEnd) });
    }

    rest = rest.slice(closeEnd);
  }
  return segments;
}

/**
 * Run {@link splitContainers} over `raw` and lower each segment: `plain` runs
 * through `plainFn` (the format's plain converter); `steps`/`tabs` containers
 * become the capitalized `<Steps>`/`<Tabs>` JSX nodes whose items re-parse their
 * inner content through `recurseFn` (the public converter, so nested callouts /
 * markdown / containers all resolve). `MdxJsxFlowElement` is assignable to
 * `RootContent` here (the mdast types are augmented), so no casts are needed.
 */
function expandContainers(
  raw: string,
  plainFn: (s: string) => RootContent[],
  recurseFn: (s: string) => RootContent[]
): RootContent[] {
  const out: RootContent[] = [];
  // Prose conversion yields `RootContent[]`; the step/tab builders model their
  // children as block content. The conversion only ever produces block-level
  // nodes at the top level here (it lowers through `toMdast`), so narrowing to
  // the builders' `(BlockContent | DefinitionContent)[]` is sound.
  const asBlocks = (nodes: RootContent[]): (BlockContent | DefinitionContent)[] =>
    nodes as (BlockContent | DefinitionContent)[];
  for (const seg of splitContainers(raw)) {
    if (seg.kind === 'plain') {
      out.push(...plainFn(seg.raw));
    } else if (seg.kind === 'steps') {
      out.push(steps(seg.items.map((it) => step(it.label, asBlocks(recurseFn(it.raw))))));
    } else {
      out.push(tabs(seg.items.map((it) => tab(it.label, asBlocks(recurseFn(it.raw))))));
    }
  }
  return out;
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
 *
 * `<steps>`/`<tabs>` container extraction (see {@link expandContainers}) happens
 * in the PUBLIC {@link htmlToMdastBlocks} wrapper; this is the plain conversion
 * for a segment with no containers.
 */
function htmlBlocksPlain(html: string): RootContent[] {
  const hast = fromHtml(html, { fragment: true });
  const mdast = toMdast(hast) as Root;
  // Promote GitHub-style alert blockquotes (`> [!INFO]`) to typed callouts.
  // Done here, after the HTML normalization, so it applies uniformly to every
  // prose source (README, tutorials, docs) and to JSDoc doclet descriptions —
  // including content nested inside steps/tabs, since the container recursion
  // routes item content back through the public functions whose plain segments
  // reach this transform.
  return mdast.children.map((node) =>
    node.type === 'blockquote' ? blockquoteToCallout(node) : node
  );
}

/**
 * Convert an HTML fragment (as emitted by JSDoc into `description`, `classdesc`,
 * param descriptions, etc.) into block-level mdast nodes. Empty/blank input
 * returns `[]`.
 *
 * First splits out any lowercase `<steps>`/`<tabs>` authoring containers at the
 * RAW string level (see {@link splitContainers}), because the HTML round-trip
 * inside {@link htmlBlocksPlain} would strip those custom tags. Plain segments
 * go through {@link htmlBlocksPlain}; container segments become the capitalized
 * `<Steps>`/`<Tabs>` JSX nodes, their inner content re-parsed recursively (so
 * nested markdown, callouts, and even nested containers survive).
 */
export function htmlToMdastBlocks(html: string | null | undefined): RootContent[] {
  if (!html) return [];
  const trimmed = html.trim();
  if (trimmed.length === 0) return [];
  return expandContainers(trimmed, htmlBlocksPlain, htmlToMdastBlocks);
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
 *
 * `<steps>`/`<tabs>` container extraction (see {@link expandContainers}) happens
 * in the PUBLIC {@link markdownToMdastBlocks} wrapper; this is the plain
 * conversion for a segment with no containers. It calls {@link htmlBlocksPlain}
 * (not the public {@link htmlToMdastBlocks}) so a plain segment isn't re-scanned
 * for containers.
 */
function markdownBlocksPlain(md: string): RootContent[] {
  const mdast = fromMarkdown(md, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  }) as Root;
  // `allowDangerousHtml` keeps embedded raw HTML in the tree so the HTML parser
  // downstream can normalize it (e.g. self-close `<img>`), rather than dropping it.
  const hast = toHast(mdast, { allowDangerousHtml: true });
  const html = toHtml(hast, { allowDangerousHtml: true });
  return htmlBlocksPlain(html);
}

/**
 * Convert a raw Markdown document into block-level mdast nodes. Empty/blank
 * input returns `[]`.
 *
 * First splits out any lowercase `<steps>`/`<tabs>` authoring containers at the
 * RAW string level (see {@link splitContainers}), because the HTML round-trip
 * inside {@link markdownBlocksPlain} would strip those custom tags. Plain
 * segments go through {@link markdownBlocksPlain}; container segments become the
 * capitalized `<Steps>`/`<Tabs>` JSX nodes, their inner content re-parsed
 * recursively through this same function (so nested markdown, callouts, and even
 * nested containers survive). The recursion is finite: inner content without a
 * container hits the plain path.
 */
export function markdownToMdastBlocks(md: string | null | undefined): RootContent[] {
  if (!md) return [];
  const trimmed = md.trim();
  if (trimmed.length === 0) return [];
  return expandContainers(trimmed, markdownBlocksPlain, markdownToMdastBlocks);
}

/**
 * Like {@link htmlToMdastBlocks} but flattens to phrasing (inline) content by
 * pulling children out of the paragraph(s) the conversion produces. Use for
 * fields meant to appear inline, e.g. a param description inside a list item.
 *
 * Calls {@link htmlBlocksPlain} directly (no container splitting): an inline
 * context can't host a block-level `<Steps>`/`<Tabs>` element anyway.
 */
export function htmlToMdastInline(html: string | null | undefined): PhrasingContent[] {
  if (!html) return [];
  const trimmed = html.trim();
  if (trimmed.length === 0) return [];
  return blocksToInline(htmlBlocksPlain(trimmed));
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
