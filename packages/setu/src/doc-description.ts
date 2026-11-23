/**
 * A guide/doc page's description (#370), derived from its body when the author
 * gave none in frontmatter. It feeds `<meta name="description">`, the search
 * entry subtitle, pager cards and the llms.txt one-liner.
 *
 * The source is the first top-level paragraph with any text. Headings, code,
 * lists, blockquotes (callouts included), tables and MDX components such as
 * `<Tabs>`/`<Steps>` are skipped, as is a paragraph of nothing but images (a
 * badge row): image alt text is never used.
 */

import type { Nodes, Root } from 'mdast';
import { collapseWhitespace } from '@clean-jsdoc-theme/utils';

/** Longest derived description, `…` included. An explicit one is not capped. */
export const DOC_DESCRIPTION_MAX = 300;

// Inline tags left as raw text (no resolver, or `{@tutorial}`), reduced to their
// label the way dwar's llms-txt `plainText` does. The bodies exclude `{`/`}` and
// the labels exclude `[`/`]`, so every match attempt stops at the next brace or
// bracket and the scan stays linear. (The #366 fix may later share these.)
const LABELLED_TAG = /\[([^[\]]*)\]\{@(?:link|linkcode|linkplain|tutorial)\s[^{}]*\}/g;
const INLINE_TAG = /\{@(?:link|linkcode|linkplain|tutorial)\s([^{}]*)\}/g;

/** `[label]{@link x}` → `label`; `{@link x|label}` / `{@link x label}` → `label`, else `x`. */
function stripInlineTags(text: string): string {
  if (!text.includes('{@')) return text;
  return text
    .replace(LABELLED_TAG, (_all, label: string) => label)
    .replace(INLINE_TAG, (_all, body: string) => {
      const [target, ...rest] = body.trim().split(/[|\s]+/);
      return rest.length > 0 ? rest.join(' ') : target;
    });
}

/** Append a phrasing node's plain text to `out`. */
function flatten(node: Nodes, out: string[]): void {
  switch (node.type) {
    case 'text':
      out.push(stripInlineTags(node.value));
      return;
    case 'inlineCode':
      out.push(node.value);
      return;
    case 'break':
      out.push(' ');
      return;
    case 'image':
    case 'imageReference':
    case 'html':
    case 'footnoteReference':
      return;
    default:
      if ('children' in node) for (const child of node.children) flatten(child as Nodes, out);
  }
}

/** Clip to {@link DOC_DESCRIPTION_MAX} on a word boundary, ending in `…`. */
function clip(text: string): string {
  if (text.length <= DOC_DESCRIPTION_MAX) return text;
  // The ellipsis takes the last slot; cut at the last space that leaves room.
  const space = text.lastIndexOf(' ', DOC_DESCRIPTION_MAX - 1);
  let head = space > 0 ? text.slice(0, space) : text.slice(0, DOC_DESCRIPTION_MAX - 1);
  // Never end on half a surrogate pair.
  const last = head.charCodeAt(head.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) head = head.slice(0, -1);
  return `${head}…`;
}

/**
 * The page description from the first top-level paragraph with text: plain
 * text, whitespace collapsed, inline tags reduced to their label, clipped to
 * {@link DOC_DESCRIPTION_MAX}. `undefined` when the body has no such paragraph.
 */
export function deriveDocDescription(tree: Root): string | undefined {
  for (const block of tree.children) {
    if (block.type !== 'paragraph') continue;
    const parts: string[] = [];
    flatten(block, parts);
    // One past the cap is enough to know whether to clip.
    const text = collapseWhitespace(parts.join(''), DOC_DESCRIPTION_MAX + 1);
    if (text !== '') return clip(text);
  }
  return undefined;
}
