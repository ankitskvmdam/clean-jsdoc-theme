import type { PhrasingContent, RootContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

/**
 * Convert an HTML fragment (as emitted by JSDoc into `description` etc.) into
 * block-level mdast nodes. Empty/blank input returns `[]`.
 *
 * Path: HTML → markdown (turndown) → mdast (mdast-util-from-markdown).
 */
export function htmlToMdastBlocks(html: string | null | undefined): RootContent[] {
  if (!html) return [];
  const md = turndown.turndown(html).trim();
  if (md.length === 0) return [];
  return fromMarkdown(md).children;
}

/**
 * Like {@link htmlToMdastBlocks} but flattens to phrasing (inline) content by
 * pulling children out of the (typically single) paragraph the markdown
 * parses into. Use for fields meant to appear inline, e.g. param descriptions
 * inside a list item.
 */
export function htmlToMdastInline(html: string | null | undefined): PhrasingContent[] {
  const blocks = htmlToMdastBlocks(html);
  const out: PhrasingContent[] = [];
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      out.push(...block.children);
    }
  }
  return out;
}
