/**
 * Inline `{@link}` / `{@linkcode}` / `{@linkplain}` rewriting over an mdast tree.
 *
 * JSDoc inline link tags survive into the mdast as plain `text` runs (dwar's
 * `preprocessJsdocInlineTags` only wraps them in code spans so MDX doesn't choke
 * on the `{`). This pass turns each tag into a real `link` node when its target
 * resolves, and into an inert `inlineCode` span when it doesn't — mirroring the
 * dwar safety net so an unresolved reference still reads as today's code span
 * rather than a broken anchor.
 *
 * Two rules keep the rewrite honest:
 * - We never descend into `code` / `inlineCode` subtrees, so a `{@link}` shown
 *   literally inside an example block stays literal.
 * - We only ever rewrite `text` children; existing `link` nodes are left alone.
 */
import type { Link, PhrasingContent, Root, RootContent, Text } from 'mdast';
import type { ResolvedLink } from '../link-registry';
import { inlineCode, link, text } from './builders';

/** A node that owns a `children` array we can walk/rewrite. */
interface HasChildren {
  children: RootContent[] | PhrasingContent[];
}

function hasChildren(node: unknown): node is HasChildren {
  return (
    typeof node === 'object' &&
    node !== null &&
    Array.isArray((node as { children?: unknown }).children)
  );
}

/**
 * Combined matcher for both tag shapes, scanned left-to-right via `lastIndex`:
 *
 * 1. Leading-label: `[label]{@link|linkcode|linkplain target}` — the label is the
 *    `[...]` text; JSDoc ignores any in-brace label in this form.
 * 2. Bare tag: `{@link|linkcode|linkplain target( |\|)label?}` — the target is the
 *    first token, the optional label follows a `|` or the first run of whitespace.
 *
 * Capture groups:
 *   1 label   2 tag   3 target   (leading-label branch)
 *   4 tag     5 target 6 label   (bare branch)
 */
const TAG_RE =
  /\[([^\]]*)\]\{@(link|linkcode|linkplain)\s+([^}]+)\}|\{@(link|linkcode|linkplain)\s+([^}|]+?)(?:[|\s]([^}]*))?\}/g;

type Tag = 'link' | 'linkcode' | 'linkplain';

/**
 * Split one text value into a sequence of `text` / `link` / `inlineCode` nodes.
 *
 * Gaps between tags (and surrounding prose/punctuation) are preserved as `text`
 * nodes. A value with no tags returns a single-element array holding the
 * original node, so the common case allocates nothing extra.
 */
function splitText(value: string, resolve: (target: string) => ResolvedLink | null): PhrasingContent[] {
  TAG_RE.lastIndex = 0;
  let match = TAG_RE.exec(value);
  if (!match) return [text(value)];

  const out: PhrasingContent[] = [];
  let cursor = 0;

  while (match) {
    if (match.index > cursor) {
      out.push(text(value.slice(cursor, match.index)));
    }

    let tag: Tag;
    let target: string;
    let label: string;
    if (match[2] !== undefined) {
      // Leading-label branch: [label]{@tag target}
      tag = match[2] as Tag;
      target = match[3] ?? '';
      label = match[1] ?? '';
    } else {
      // Bare branch: {@tag target( |\|)label?}
      tag = match[4] as Tag;
      target = match[5] ?? '';
      label = match[6] ?? '';
    }

    out.push(buildNode(tag, target.trim(), label.trim(), resolve));

    cursor = TAG_RE.lastIndex;
    match = TAG_RE.exec(value);
  }

  if (cursor < value.length) {
    out.push(text(value.slice(cursor)));
  }

  return out;
}

/**
 * Build the node for a single matched tag. Resolved targets become a `link`
 * (monospaced child for `@linkcode`, plain text otherwise); unresolved targets
 * fall back to an `inlineCode` span carrying the label or target.
 */
function buildNode(
  tag: Tag,
  target: string,
  label: string,
  resolve: (target: string) => ResolvedLink | null
): Link | Text | ReturnType<typeof inlineCode> {
  const displayLabel = label || target;
  const resolved = resolve(target);
  if (resolved) {
    const child = tag === 'linkcode' ? inlineCode(displayLabel) : text(displayLabel);
    return link(resolved.href, child);
  }
  return inlineCode(displayLabel);
}

/**
 * Rewrite every `{@link}` family tag in `tree` in place.
 *
 * Walks all parents recursively, rebuilding each one's children: `text` children
 * are run through {@link splitText} (which may fan out into several nodes),
 * `code` / `inlineCode` children pass through untouched (and we never recurse
 * into them), and any other parent is recursed into and kept.
 */
export function resolveLinkTags(
  tree: Root,
  resolve: (target: string) => ResolvedLink | null
): void {
  walk(tree, resolve);
}

function walk(parent: HasChildren, resolve: (target: string) => ResolvedLink | null): void {
  const children = parent.children;
  const next: (RootContent | PhrasingContent)[] = [];

  for (const child of children) {
    if (child.type === 'text') {
      next.push(...splitText(child.value, resolve));
    } else if (child.type === 'code' || child.type === 'inlineCode') {
      // Never rewrite a tag shown literally inside a code span/block.
      next.push(child);
    } else {
      if (hasChildren(child)) walk(child, resolve);
      next.push(child);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mdast child unions are narrower than the rebuilt array; the contents are type-correct per branch above.
  parent.children = next as any;
}
