import type {
  BlockContent,
  Blockquote,
  Code,
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
import { callout, code, playground, step, steps, tab, tabs } from './builders';
import {
  KNOWN_PROVIDERS,
  parsePlaygroundSpec,
  resolvePlaygroundOpts,
  type PlaygroundSpec,
} from '../playground';

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

/** A node that may own a `children` array we can recurse into. */
type MaybeParent = RootContent & { children?: RootContent[] };

/**
 * Promote GitHub-style alert blockquotes (`> [!NOTE]`, …) to typed callouts at
 * ANY depth — top level, inside list items, inside other blockquotes — mirroring
 * GitHub, which renders alerts nested in lists. Each node is promoted first
 * (outer blockquote → callout), then we descend into the result's children so a
 * nested alert inside it is promoted too. A blockquote with no recognized marker
 * is left as a blockquote but still descended into.
 */
function promoteCallouts(nodes: RootContent[]): RootContent[] {
  return nodes.map((node) => {
    const promoted = node.type === 'blockquote' ? blockquoteToCallout(node) : node;
    const parent = promoted as MaybeParent;
    if (Array.isArray(parent.children)) parent.children = promoteCallouts(parent.children);
    return promoted;
  });
}

// ── `<steps>` / `<tabs>` authoring containers ───────────────────────────────

/**
 * A `<steps>`/`<tabs>` container item: its optional `label` and the inner
 * markdown/HTML `raw` (full content, re-parsed recursively).
 */
interface ContainerItem {
  label?: string;
  /** `<tab value="…">` sync key (see rang's `Tabs`); ignored for `<step>`. */
  value?: string;
  raw: string;
}

/**
 * One slice of a raw prose string: either a `plain` run (no container) handed
 * to the normal converter, or a `steps`/`tabs` container whose items expand into
 * the capitalized `<Steps>`/`<Tabs>` JSX nodes.
 */
type Segment =
  | { kind: 'plain'; raw: string }
  | { kind: 'steps' | 'tabs'; items: ContainerItem[]; group?: string }
  | { kind: 'playground'; spec: PlaygroundSpec; raw: string };

/** Matches a top-level `<steps …>` / `<tabs …>` / `<playground …>` opening tag. */
const CONTAINER_OPEN = /<(steps|tabs|playground)(\s[^>]*)?>/i;

/** Read a quoted attribute (`name="…"` / `name='…'`) off an opening tag. */
function readAttr(openTag: string, name: string): string | undefined {
  const m = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(openTag);
  return m ? (m[2] ?? m[3]) : undefined;
}

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
    const label = readAttr(openTag, 'label');
    const value = readAttr(openTag, 'value');
    items.push({ label: label || undefined, value: value || undefined, raw: body.trim() });
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
    const name = open[1].toLowerCase() as 'steps' | 'tabs' | 'playground';
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
    if (name === 'playground') {
      // The opening tag's attributes ARE the playground config (same token
      // grammar as the `@playground` tag / fence); the inner content holds the
      // single fenced code block, lowered when the segment expands.
      const spec = parsePlaygroundSpec((open[2] ?? '').trim());
      segments.push({ kind: 'playground', spec, raw: inner });
    } else {
      const itemName = name === 'steps' ? 'step' : 'tab';
      const items = parseItems(inner, itemName);
      if (items.length > 0) {
        // `group` (tabs only) opts the block into cross-block sync; read off the
        // container's own opening tag (`open[0]`).
        const group = name === 'tabs' ? readAttr(open[0], 'group') || undefined : undefined;
        segments.push({ kind: name, items, group });
      } else {
        // Degenerate container (no items) — keep its source as plain text.
        segments.push({ kind: 'plain', raw: rest.slice(open.index, closeEnd) });
      }
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
    } else if (seg.kind === 'playground') {
      // Re-parse the inner content (so a fenced code block lowers to a `code`
      // node) and wrap the FIRST code node in a `<Playground>`. Prose bare configs
      // fall back to ALL providers (KNOWN_PROVIDERS). When the config warrants no
      // wrapper or there's no code, the inner content passes through unchanged so
      // nothing is dropped.
      const inner = recurseFn(seg.raw);
      const opts = resolvePlaygroundOpts(seg.spec, KNOWN_PROVIDERS);
      const idx = inner.findIndex((n) => n.type === 'code');
      if (opts && idx !== -1) {
        // A <playground> is meant to hold ONE fenced code block; if an author
        // nests more, only the first is wrapped (the rest pass through as plain
        // code), warned-and-continue like the rest of the parser.
        const codeCount = inner.reduce((n, node) => n + (node.type === 'code' ? 1 : 0), 0);
        if (codeCount > 1) {
          console.warn(
            `[setu:playground] <playground> wraps only the first code block; ${codeCount - 1} additional fence(s) left unwrapped`
          );
        }
        inner[idx] = playground(opts, inner[idx] as Code);
      }
      out.push(...inner);
    } else if (seg.kind === 'steps') {
      out.push(steps(seg.items.map((it) => step(it.label, asBlocks(recurseFn(it.raw))))));
    } else {
      out.push(
        tabs(
          seg.items.map((it) => tab(it.label, asBlocks(recurseFn(it.raw)), it.value)),
          seg.group
        )
      );
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
  // Promote GitHub-style alert blockquotes (`> [!INFO]`) to typed callouts,
  // recursively so an alert nested in a list item is promoted too. Done here,
  // after the HTML normalization, so it applies uniformly to every prose source
  // (README, tutorials, docs) and to JSDoc doclet descriptions — including
  // content nested inside steps/tabs, since the container recursion routes item
  // content back through the public functions whose plain segments reach this
  // transform.
  return promoteCallouts(mdast.children);
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
function convertMarkdownSegment(md: string): RootContent[] {
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

/** Matches a fenced-code OPEN line: optional ≤3-space indent + ``` / ~~~ run + info. */
const FENCE_OPEN = /^([ \t]{0,3})(`{3,}|~{3,})[ \t]*([^\n]*)$/;

/**
 * One slice of a raw Markdown segment: a `plain` run handed to the normal
 * converter, or a `fence` whose info string carried a `playground` meta token.
 */
type FenceSegment =
  | { kind: 'plain'; raw: string }
  | { kind: 'fence'; lang: string; spec: PlaygroundSpec; body: string };

/**
 * Scan a raw Markdown string for fenced code blocks whose info string is
 * `<lang> playground …` and split it into `plain` runs + `fence` segments. This
 * runs on the RAW Markdown (docs + Markdown tutorials) BEFORE the HTML round-trip
 * in {@link convertMarkdownSegment}, because that round-trip drops a fence's
 * `meta` (only the language survives as a `language-*` class). A string with no
 * playground fence returns a single `plain` segment, so the common path stays
 * byte-identical. Unterminated fences are left in the plain run.
 */
function splitPlaygroundFences(md: string): FenceSegment[] {
  const lines = md.split('\n');
  const segments: FenceSegment[] = [];
  let plain: string[] = [];
  const flush = (): void => {
    if (plain.length > 0) {
      segments.push({ kind: 'plain', raw: plain.join('\n') });
      plain = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const open = FENCE_OPEN.exec(lines[i]);
    if (!open) {
      plain.push(lines[i]);
      i++;
      continue;
    }

    const tokens = open[3].trim().split(/\s+/).filter(Boolean);
    // `playground` may be the FIRST token (no language — ```` ```playground … ````)
    // or the SECOND (language-prefixed — ```` ```js playground … ````). Anything
    // else is a normal fence.
    const pgIdx = tokens[0] === 'playground' ? 0 : tokens[1] === 'playground' ? 1 : -1;
    const indent = open[1];
    const fenceChar = open[2][0];
    const fenceLen = open[2].length;
    // A closing fence is the same char, at least as long (CommonMark), ≤3 indent.
    const closeRe = new RegExp(`^[ \\t]{0,3}\\${fenceChar}{${fenceLen},}[ \\t]*$`);
    let closeIdx = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (closeRe.test(lines[j])) {
        closeIdx = j;
        break;
      }
    }

    // Unterminated fence: treat just the open line as plain and keep scanning
    // (later lines may still be valid markdown / a real playground fence).
    if (closeIdx === -1) {
      plain.push(lines[i]);
      i++;
      continue;
    }

    if (pgIdx !== -1) {
      // Markdown strips the opening fence's indent from each body line.
      const bodyLines = lines
        .slice(i + 1, closeIdx)
        .map((l) => (indent && l.startsWith(indent) ? l.slice(indent.length) : l));
      flush();
      segments.push({
        kind: 'fence',
        // A first-token `playground` carries no language; otherwise the first
        // token is the language and `playground` + spec follow it.
        lang: pgIdx === 1 ? tokens[0] : '',
        spec: parsePlaygroundSpec(tokens.slice(pgIdx + 1).join(' ')),
        body: bodyLines.join('\n'),
      });
    } else {
      // A NORMAL fenced code block — keep the WHOLE block (open…close) as plain,
      // verbatim. Crucially we do NOT scan inside it, so a `playground` fence that
      // is merely being *displayed* inside an outer fence (e.g. a ```` ```` md
      // example block on a docs page) is left as literal text, not lowered.
      for (let k = i; k <= closeIdx; k++) plain.push(lines[k]);
    }
    i = closeIdx + 1;
  }
  flush();
  return segments;
}

/**
 * Plain-Markdown converter with the playground-fence pre-scan layered on. A
 * ```` ```js playground … ```` fence becomes a `<Playground>`-wrapped `code`
 * node (bare prose configs default to ALL providers); every other run goes
 * through {@link convertMarkdownSegment}'s HTML round-trip. With no playground
 * fence the whole string takes the fast path, byte-identical to before.
 */
function markdownBlocksPlain(md: string): RootContent[] {
  const segments = splitPlaygroundFences(md);
  if (segments.length === 1 && segments[0].kind === 'plain') return convertMarkdownSegment(md);

  const out: RootContent[] = [];
  for (const seg of segments) {
    if (seg.kind === 'plain') {
      if (seg.raw.trim().length > 0) out.push(...convertMarkdownSegment(seg.raw));
    } else {
      const opts = resolvePlaygroundOpts(seg.spec, KNOWN_PROVIDERS);
      const codeNode = code(seg.lang || null, seg.body);
      out.push(opts ? playground(opts, codeNode) : codeNode);
    }
  }
  return out;
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
