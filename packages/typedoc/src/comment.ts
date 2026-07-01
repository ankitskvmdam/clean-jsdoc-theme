/**
 * Convert TypeDoc `Comment` / `CommentDisplayPart[]` data into the fields a JSDoc
 * `TDoclet` carries.
 *
 * setu expects **HTML** in `description` / `classdesc` (it runs
 * `markdownToMdastBlocks` → which itself routes markdown through HTML, but the
 * JSDoc path feeds it HTML produced by JSDoc's markdown plugin). TypeDoc comment
 * summaries are markdown-ish `CommentDisplayPart[]`, so we render them to HTML
 * here using the SAME mdast → hast → html pipeline setu uses internally
 * (`mdast-util-from-markdown` + gfm → `mdast-util-to-hast` → `hast-util-to-html`),
 * keeping deps consistent with the rest of the tree.
 *
 * Inline `{@link}` parts are emitted as JSDoc `{@link Target|text}` text so
 * setu's existing `{@link}` resolver turns them into real cross-references. The
 * target reflection is mapped to the longname this adapter assigns (via the
 * caller-supplied `linkResolver`).
 */
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { gfm } from 'micromark-extension-gfm';
import type { Root } from 'mdast';
import type { Comment, CommentDisplayPart, Reflection } from 'typedoc';
import type {
  TDoclet,
  TDocletAccess,
  TDocletParam,
  TDocletScope,
  TDocletTag,
} from '@clean-jsdoc-theme/utils';

/** Resolves a TypeDoc `{@link}` target reflection to the longname we assigned. */
export type LinkResolver = (target: Reflection) => string | undefined;

/** Render a markdown string to an HTML string, matching setu's pipeline. */
export function markdownToHtml(md: string): string {
  const trimmed = md.trim();
  if (!trimmed) return '';
  const mdast = fromMarkdown(trimmed, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  }) as Root;
  const hast = toHast(mdast, { allowDangerousHtml: true });
  return toHtml(hast, { allowDangerousHtml: true });
}

/**
 * Join `CommentDisplayPart[]` into a single markdown string. `inline-tag` parts
 * (`@link` / `@linkcode` / `@linkplain`) are rewritten to JSDoc `{@link …}`
 * syntax targeting the longname the adapter assigned, so setu can resolve them.
 */
export function partsToMarkdown(
  parts: readonly CommentDisplayPart[] | undefined,
  linkResolver?: LinkResolver
): string {
  if (!parts || parts.length === 0) return '';
  let out = '';
  for (const part of parts) {
    switch (part.kind) {
      case 'text':
        out += part.text;
        break;
      case 'code':
        out += part.text;
        break;
      case 'inline-tag':
        out += inlineTagToJsdoc(part, linkResolver);
        break;
      case 'relative-link':
        // No file registry in phase 2 — keep the readable text.
        out += part.text;
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * Rewrite a TypeDoc inline tag part to JSDoc `{@link target|text}`.
 *
 * `tag` is `@link` / `@linkcode` / `@linkplain`. The target may be a reflection
 * (mapped to its longname), a raw string/URL, or a symbol id (no longname — fall
 * back to the displayed text). setu's resolver matches the target against the
 * longnames it knows; an unresolved target degrades to an inline code span there.
 */
function inlineTagToJsdoc(
  part: Extract<CommentDisplayPart, { kind: 'inline-tag' }>,
  linkResolver?: LinkResolver
): string {
  const tag = part.tag.replace(/^@/, ''); // 'link' | 'linkcode' | 'linkplain'
  const display = part.tsLinkText || part.text || '';

  let target = '';
  if (typeof part.target === 'string') {
    target = part.target;
  } else if (part.target && typeof part.target === 'object' && 'kindOf' in part.target) {
    // It's a Reflection.
    target = linkResolver?.(part.target as Reflection) ?? '';
  }

  // No resolvable target → keep the prose text (no broken link).
  if (!target) return display;

  // `{@link target|text}` — setu's TAG_RE accepts the `|` label form.
  const label = display && display !== target ? `|${display}` : '';
  return `{@${tag} ${target}${label}}`;
}

/** Render comment summary parts to an HTML string for `description`/`classdesc`. */
export function summaryToHtml(
  comment: Comment | undefined,
  linkResolver?: LinkResolver
): string | undefined {
  if (!comment) return undefined;
  const md = partsToMarkdown(comment.summary, linkResolver);
  const html = markdownToHtml(md);
  return html || undefined;
}

/** Render the content parts of a single block tag to HTML. */
function tagContentToHtml(
  parts: readonly CommentDisplayPart[],
  linkResolver?: LinkResolver
): string {
  return markdownToHtml(partsToMarkdown(parts, linkResolver));
}

/** Render block-tag content to plain markdown/text (no HTML wrapping). */
function tagContentToText(
  parts: readonly CommentDisplayPart[],
  linkResolver?: LinkResolver
): string {
  return partsToMarkdown(parts, linkResolver).trim();
}

/** The subset of doclet fields derived from a comment's block tags + flags. */
export interface CommentFields {
  description?: string;
  /** `@remarks` — detailed prose (HTML), rendered as its own section. */
  remarks?: string;
  examples?: string[];
  returns?: TDocletParam[];
  exceptions?: TDocletParam[];
  see?: string[];
  deprecated?: string | boolean;
  defaultvalue?: string;
  since?: string;
  author?: string[];
  tags?: TDocletTag[];
  /** Block-tag `@param` descriptions, keyed by param name (HTML). */
  paramDescriptions: Map<string, string>;
}

/**
 * Walk `comment.blockTags` and `comment.modifierTags`, mapping each to its doclet
 * field. Tags not recognized in v1 are dropped (their content survives elsewhere
 * if the corresponding reflection carries it — e.g. params on the signature).
 */
export function commentFields(
  comment: Comment | undefined,
  linkResolver?: LinkResolver
): CommentFields {
  const fields: CommentFields = { paramDescriptions: new Map() };
  if (!comment) return fields;

  const examples: string[] = [];
  const returns: TDocletParam[] = [];
  const exceptions: TDocletParam[] = [];
  const see: string[] = [];
  const author: string[] = [];
  const tags: TDocletTag[] = [];
  // `@group` maps to the same `category` doclet tag setu uses for sidebar/section
  // grouping, but `@category` must win if both are present — regardless of which
  // tag appears first in the comment. Collect the group-derived tag separately
  // and only fold it in below if no explicit `@category` tag was seen.
  let groupCategoryTag: TDocletTag | undefined;

  for (const block of comment.blockTags) {
    const tag = block.tag.replace(/^@/, '').toLowerCase();
    switch (tag) {
      case 'param':
        if (block.name) {
          fields.paramDescriptions.set(block.name, tagContentToHtml(block.content, linkResolver));
        }
        break;
      case 'returns':
      case 'return': {
        const description = tagContentToHtml(block.content, linkResolver);
        returns.push(description ? { description } : {});
        break;
      }
      case 'throws':
      case 'exception': {
        const description = tagContentToHtml(block.content, linkResolver);
        exceptions.push(description ? { description } : {});
        break;
      }
      case 'example':
        // Raw text — setu's example renderer handles `<caption>` / fenced code.
        examples.push(tagContentToText(block.content, linkResolver));
        break;
      case 'deprecated': {
        const reason = tagContentToText(block.content, linkResolver);
        fields.deprecated = reason || true;
        break;
      }
      case 'remarks':
        // Detailed prose shown as its own "Remarks" section (HTML, like the
        // description). TypeDoc renders this separately from the summary.
        fields.remarks = tagContentToHtml(block.content, linkResolver);
        break;
      case 'privateremarks':
        // Explicitly excluded from generated docs (TypeDoc drops it).
        break;
      case 'inheritdoc':
        // A RESOLVED `@inheritDoc` (explicit target or bare) never reaches this
        // switch — TypeDoc's own converter merges the target's summary/block
        // tags into this comment during `app.convert()` and drops the tag
        // (verified in NOTES.md §5a). The only shape that survives is an
        // UNRESOLVABLE target (`name` set, `content` empty); TypeDoc already
        // logs its own warning for that, so silently drop it here rather than
        // surface a useless `{title:'inheritdoc', text:''}` doclet tag.
        break;
      case 'see':
        see.push(tagContentToText(block.content, linkResolver));
        break;
      case 'defaultvalue':
      case 'default':
        fields.defaultvalue = tagContentToText(block.content, linkResolver);
        break;
      case 'since':
        fields.since = tagContentToText(block.content, linkResolver);
        break;
      case 'author':
        author.push(tagContentToText(block.content, linkResolver));
        break;
      case 'category':
        tags.push({ title: 'category', text: tagContentToText(block.content, linkResolver) });
        break;
      case 'group':
        // Reuse setu's category grouping (sidebar + section grouping). Folded in
        // after the loop only if no explicit @category tag was seen (see above).
        groupCategoryTag ??= { title: 'category', text: tagContentToText(block.content, linkResolver) };
        break;
      default:
        // Unrecognized block tag — preserve it as a generic doclet tag so nothing
        // is silently lost (mirrors how JSDoc keeps unknown tags).
        tags.push({ title: tag, text: tagContentToText(block.content, linkResolver) });
        break;
    }
  }

  // Fold in the `@group`-derived category tag only if no explicit `@category`
  // tag was present — matches setu's "first category wins" precedence.
  if (groupCategoryTag && !tags.some((t) => t.title === 'category')) {
    tags.push(groupCategoryTag);
  }

  // `@category` can also arrive as a modifier tag in some configs; and TypeDoc's
  // own categorization is exposed via the `@category` block tag above. Modifier
  // tags like `@alpha`/`@beta` are preserved as generic tags.
  for (const mod of comment.modifierTags) {
    const tag = mod.replace(/^@/, '').toLowerCase();
    if (tag === 'deprecated') {
      fields.deprecated ??= true;
    } else {
      tags.push({ title: tag });
    }
  }

  if (examples.length) fields.examples = examples;
  if (returns.length) fields.returns = returns;
  if (exceptions.length) fields.exceptions = exceptions;
  if (see.length) fields.see = see;
  if (author.length) fields.author = author;
  if (tags.length) fields.tags = tags;

  return fields;
}

/** Flag-derived doclet fields (`readonly`/`virtual`/`optional`/`access`/`async`). */
export interface FlagFields {
  readonly?: boolean;
  virtual?: boolean;
  optional?: boolean;
  access?: TDocletAccess;
  scope?: TDocletScope;
  async?: boolean;
}

/**
 * Map a reflection's `flags` onto doclet flags. `scope` is computed separately in
 * `names.ts`; this maps only the boolean/access flags.
 *
 * `async` is derived conservatively from the reflection's first signature (the
 * installed TypeDoc version — see `NOTES.md` / `ReflectionFlags` in the `.d.ts` —
 * exposes no `isAsync` flag at all, so we can't rely on flags for it). We treat a
 * signature as async when its return type is a `Promise<...>` reference, which
 * covers both `async` functions and plain functions that return a `Promise`
 * explicitly. A signature with no resolvable type is left alone — a missing
 * badge is preferable to a wrong one.
 */
export function flagFields(reflection: Reflection): FlagFields {
  const flags = reflection.flags;
  const out: FlagFields = {};
  if (!flags) return out;

  if (flags.isReadonly) out.readonly = true;
  if (flags.isAbstract) out.virtual = true;
  if (flags.isOptional) out.optional = true;
  if (flags.isPrivate) out.access = 'private';
  else if (flags.isProtected) out.access = 'protected';

  if (isAsyncReflection(reflection)) out.async = true;

  return out;
}

/** Reflections that can carry call signatures (methods/functions), narrowly. */
interface SignatureBearing {
  signatures?: readonly { type?: { type?: string; name?: string } }[];
}

/**
 * Conservative async detection: true only when the reflection's first signature
 * has a resolvable return type whose name is exactly `Promise` (a TypeDoc
 * `ReferenceType`, `type.type === 'reference'`). Anything else (no signatures,
 * no type, a differently-named type) is left `false` — see {@link flagFields}.
 */
function isAsyncReflection(reflection: Reflection): boolean {
  const sig = (reflection as unknown as SignatureBearing).signatures?.[0];
  const type = sig?.type;
  return type?.type === 'reference' && type.name === 'Promise';
}

/**
 * Merge {@link CommentFields} into a partial doclet, dropping the internal
 * `paramDescriptions` map (callers apply those to `params` themselves).
 */
export function applyCommentFields(doclet: TDoclet, fields: CommentFields): void {
  if (fields.remarks) doclet.remarks = fields.remarks;
  if (fields.examples) doclet.examples = fields.examples;
  if (fields.returns) doclet.returns = fields.returns;
  if (fields.exceptions) doclet.exceptions = fields.exceptions;
  if (fields.see) doclet.see = fields.see;
  if (fields.deprecated !== undefined) doclet.deprecated = fields.deprecated;
  if (fields.defaultvalue !== undefined) doclet.defaultvalue = fields.defaultvalue;
  if (fields.since !== undefined) doclet.since = fields.since;
  if (fields.author) doclet.author = fields.author;
  if (fields.tags) doclet.tags = fields.tags;
}
