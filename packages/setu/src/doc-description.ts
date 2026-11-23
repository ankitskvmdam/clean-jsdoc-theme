/**
 * A guide/doc page's description (#370), derived from its body when the author
 * gave none in frontmatter. It feeds `<meta name="description">`, the search
 * entry subtitle, pager cards and the llms.txt one-liner.
 *
 * The source is the first top-level paragraph with any text. Headings, code,
 * lists, blockquotes (callouts included), tables and MDX components such as
 * `<Tabs>`/`<Steps>` are skipped, as is a paragraph of nothing but images (a
 * badge row; image alt text is never used) or of nothing but links (a
 * `Docs | API | GitHub` row).
 */

import type { Nodes, Root } from 'mdast';
import { collapseWhitespace } from '@clean-jsdoc-theme/utils';

/** Longest derived description, `…` included. An explicit one is not capped. */
export const DOC_DESCRIPTION_MAX = 300;

/** A clip point earlier than this is too early: hard-cut at the cap instead. */
const MIN_CUT = Math.floor(DOC_DESCRIPTION_MAX * 0.6);

// Inline tags left as raw text (no resolver, or `{@tutorial}`), reduced to their
// label the way dwar's llms-txt `plainText` does. They run on the paragraph's
// joined text, since autolinks and inline markup split a tag across nodes. The
// bodies exclude `{`/`}` and the labels exclude `[`/`]`, so every match attempt
// stops at the next brace or bracket and the scan stays linear. (The #366 fix
// may later share these.)
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

/** A footnote marker: the footnote ref arrives as a link to its definition. */
export const FOOTNOTE_REF_URL = /^#user-content-fn-/;
/** A letter or digit: text outside links that has one makes the paragraph prose. */
const WORD_CHAR = /[\p{L}\p{N}]/u;

/** What {@link flatten} collects from one paragraph. */
interface Flat {
  parts: string[];
  /** Links met (footnote markers excluded). */
  links: number;
  /** Whether any text outside a link has a letter or digit. */
  proseOutsideLinks: boolean;
}

/** Append a phrasing node's plain text to `flat.parts`. */
function flatten(node: Nodes, flat: Flat, inLink: boolean): void {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
      flat.parts.push(node.value);
      if (!inLink && !flat.proseOutsideLinks && WORD_CHAR.test(node.value)) {
        flat.proseOutsideLinks = true;
      }
      return;
    case 'break':
      flat.parts.push(' ');
      return;
    case 'image':
    case 'imageReference':
    case 'html':
    case 'footnoteReference':
      return;
    case 'link':
    case 'linkReference':
      if (node.type === 'link' && FOOTNOTE_REF_URL.test(node.url)) return;
      flat.links++;
      for (const child of node.children) flatten(child, flat, true);
      return;
    default:
      if ('children' in node) {
        for (const child of node.children) flatten(child as Nodes, flat, inLink);
      }
  }
}

/** CJK punctuation a clip may end after (sentence ends and pauses). */
const CJK_BREAK = new Set(['。', '！', '？', '、', '，']);
/** Trailing separators that read badly before `…`. */
const TRAILING_PUNCT = /[\s,:;、，]+$/;

/**
 * Clip to {@link DOC_DESCRIPTION_MAX}, ending in `…`: after the last space or
 * CJK punctuation no earlier than {@link MIN_CUT}, else a hard cut. A trailing
 * `,`/`:`/`;` and an unclosed `(` aside are dropped first.
 */
function clip(text: string): string {
  if (text.length <= DOC_DESCRIPTION_MAX) return text;
  // The ellipsis takes the last slot, so at most MAX - 1 characters are kept.
  const limit = DOC_DESCRIPTION_MAX - 1;
  let cut = limit;
  for (let i = limit; i >= MIN_CUT; i--) {
    if (text[i] === ' ' || CJK_BREAK.has(text[i - 1])) {
      cut = i;
      break;
    }
  }
  let head = text.slice(0, cut);
  // Never end on half a surrogate pair.
  const last = head.charCodeAt(head.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) head = head.slice(0, -1);

  head = head.replace(TRAILING_PUNCT, '');
  const open = head.lastIndexOf('(');
  if (open >= MIN_CUT && open > head.lastIndexOf(')')) {
    head = head.slice(0, open).replace(TRAILING_PUNCT, '');
  }
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
    const flat: Flat = { parts: [], links: 0, proseOutsideLinks: false };
    flatten(block, flat, false);
    // A row of links (`Docs | API | GitHub`) is navigation, not a summary.
    if (flat.links > 1 && !flat.proseOutsideLinks) continue;
    // One past the cap is enough to know whether to clip.
    const text = collapseWhitespace(stripInlineTags(flat.parts.join('')), DOC_DESCRIPTION_MAX + 1);
    if (text !== '') return clip(text);
  }
  return undefined;
}
