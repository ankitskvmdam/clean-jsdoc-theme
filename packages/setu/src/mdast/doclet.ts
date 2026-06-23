import type { List, ListItem, Paragraph, PhrasingContent, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { TDoclet, TDocletParam, TDocletTypeParam, TDocletTypeProperty } from '@clean-jsdoc-theme/utils';
import type { ResolvedLink } from '../link-registry';
import { parseEmbedConfig } from '../embed';
import {
  callout,
  code,
  embed,
  emphasis,
  inlineCode,
  li,
  link,
  p,
  playground,
  sourceLink,
  strong,
  text,
  ul,
} from './builders';
import type { PlaygroundOpts } from '../playground';
import { htmlToMdastBlocks, htmlToMdastInline, markdownToMdastInline } from './from-html';
import { resolveSlotText, type SlotResolver } from '../slots';

// ── Small extractors ────────────────────────────────────────────────────────

/**
 * Inline rendering of `type.names` as a single inline-code node, e.g.
 * `["Array.<string>", "null"]` → `` `Array.<string> | null` ``.
 * No parsing of generics yet — kept literal so consumers can swap in a richer
 * type-expression renderer later.
 */
export function typeExpressionInline(type: TDocletTypeProperty | undefined): RootContent | null {
  if (!type || !type.names || type.names.length === 0) return null;
  return p(inlineCode(type.names.join(' | ')));
}

/**
 * `["Array.<string>", "null"]` → `"Array.<string> | null"`. For embedding in
 * sentences without a wrapping paragraph.
 */
export function typeExpressionString(type: TDocletTypeProperty | undefined): string | null {
  if (!type || !type.names || type.names.length === 0) return null;
  return type.names.join(' | ');
}

// ── Description ─────────────────────────────────────────────────────────────

/**
 * Description blocks for a doclet. Prefers `classdesc` (class-level) over
 * `description` (constructor-level). Both come in as HTML from JSDoc. The chosen
 * source is routed through the `slots` resolver (keyed `…#description`) so it can
 * be collected for extraction and substituted per locale before conversion;
 * without a resolver the HTML passes through unchanged.
 */
export function descriptionBlocks(doclet: TDoclet, slots?: SlotResolver): RootContent[] {
  const source = doclet.classdesc ?? doclet.description;
  return htmlToMdastBlocks(resolveSlotText(slots, doclet.longname, 'description', source));
}

/**
 * `@summary` content if present, as block content. Distinct from
 * {@link descriptionBlocks} — both can coexist on a doclet. Routed through the
 * `slots` resolver (keyed `…#summary`).
 */
export function summaryBlocks(doclet: TDoclet, slots?: SlotResolver): RootContent[] {
  return htmlToMdastBlocks(resolveSlotText(slots, doclet.longname, 'summary', doclet.summary));
}

// ── Examples ────────────────────────────────────────────────────────────────

/** Leading `<caption>…</caption>` JSDoc puts before an example's code. */
const EXAMPLE_CAPTION_RE = /^\s*<caption>([\s\S]*?)<\/caption>\s*/i;
/** JSDoc's `{@lang xxx}` directive that overrides an example's code language. */
const EXAMPLE_LANG_RE = /\{@lang\s+([^}\s]+)\s*\}\s*/i;
/**
 * An example body that is ITSELF a single fenced code block, start to end.
 * TypeDoc auto-wraps `@example` bodies in a ` ```ts ` fence (and a JSDoc author
 * may fence theirs too), so we unwrap it rather than wrapping again — otherwise
 * the body double-fences (` ````js ` around ` ```ts `), which the renderer's
 * brace-escaping then mis-parses. Captures the fence chars (for the matching
 * close), the info string (language), and the inner body.
 */
const EXAMPLE_FENCE_RE = /^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n?\1[ \t]*$/;

/**
 * Blocks for each `@example`. JSDoc emits examples as raw strings (the markdown
 * plugin does NOT touch them), optionally prefixed with a `<caption>` label and
 * a `{@lang xxx}` directive. The caption is rendered as a paragraph (supporting
 * Markdown + inline HTML); `{@lang}` sets the fence language; the remaining body
 * is a fenced code block. Falls back to `lang` when no `{@lang}` is given. An
 * example whose body is already a single fenced block is unwrapped (its fence
 * language wins unless `{@lang}` overrode it) so it isn't double-fenced.
 */
export function examplesBlocks(
  doclet: TDoclet,
  lang: string = 'js',
  slots?: SlotResolver,
  playgroundOpts?: PlaygroundOpts | null
): RootContent[] {
  const out: RootContent[] = [];
  let exampleIndex = -1;
  for (const raw of doclet.examples ?? []) {
    exampleIndex++;
    let src = String(raw);

    let caption: string | null = null;
    const capMatch = EXAMPLE_CAPTION_RE.exec(src);
    if (capMatch) {
      caption = capMatch[1].trim();
      src = src.slice(capMatch[0].length);
    }
    // Only the caption prose is translatable; the example CODE stays
    // locale-invariant (a locked decision). Keyed per example by index.
    if (caption) {
      caption =
        resolveSlotText(
          slots,
          doclet.longname,
          ['examples', String(exampleIndex), 'caption'],
          caption
        ) ?? caption;
    }

    let exampleLang = lang;
    const langMatch = EXAMPLE_LANG_RE.exec(src);
    if (langMatch) {
      exampleLang = langMatch[1];
      src = src.replace(EXAMPLE_LANG_RE, '');
    }

    src = src.replace(/^\n+|\s+$/g, '');

    const fence = EXAMPLE_FENCE_RE.exec(src);
    if (fence) {
      const fenceLang = fence[2].trim().split(/\s+/)[0];
      if (!langMatch && fenceLang) exampleLang = fenceLang;
      src = fence[3].replace(/\s+$/, '');
    }

    if (caption) out.push(p(...markdownToMdastInline(caption)));
    if (src.length > 0) {
      // The caption (translatable prose) stays OUTSIDE the wrapper; only the code
      // fence is wrapped, so Shiki still highlights it and the dropdown/filename/
      // highlight ride on the `<Playground>` attributes.
      const codeNode = code(exampleLang, src);
      out.push(playgroundOpts ? playground(playgroundOpts, codeNode) : codeNode);
    }
  }
  return out;
}

// ── Embeds (@iframe) ─────────────────────────────────────────────────────────

/**
 * Blocks for each `@iframe` block tag. JSDoc lands a `@iframe <config>` tag as
 * `{ title: 'iframe', text: '<raw>', value: '<raw>' }`; we parse the raw config
 * with {@link parseEmbedConfig} and, for each valid {@link EmbedSpec}, emit an
 * `<Embed>` JSX element via the {@link embed} builder. Invalid configs (no URL,
 * non-`https`/protocol-relative, empty) parse to `null` and are dropped (the
 * parser already warns). Returns `[]` when the doclet has no `@iframe` tags.
 */
export function embedBlocks(doclet: TDoclet): RootContent[] {
  const out: RootContent[] = [];
  for (const tag of doclet.tags ?? []) {
    if (tag.title !== 'iframe') continue;
    const raw = typeof tag.value === 'string' ? tag.value : (tag.text ?? '');
    const spec = parseEmbedConfig(raw);
    if (spec) out.push(embed(spec));
  }
  return out;
}

// ── Inheritance note ────────────────────────────────────────────────────────

/**
 * If the doclet was inherited from a parent (either via `augments` walk or
 * JSDoc's own `inherited` flag), returns a paragraph noting the source.
 * `inheritedFrom` is set by {@link getClassView} (and friends); for raw
 * doclets, `inherits` is checked as a fallback.
 */
export function inheritedFromParagraph(
  doclet: TDoclet & { inheritedFrom?: string }
): Paragraph | null {
  const source = doclet.inheritedFrom ?? (doclet.inherited ? doclet.inherits : undefined);
  if (!source) return null;
  return p(emphasis(text('Inherited from '), inlineCode(source)));
}

// ── Deprecation ─────────────────────────────────────────────────────────────

/** Human-readable noun for a doclet's kind, used in default messages. */
function kindNoun(doclet: TDoclet): string {
  switch (doclet.kind) {
    case 'class':
      return 'class';
    case 'constant':
      return 'constant';
    case 'enum':
      return 'enumeration';
    case 'event':
      return 'event';
    case 'external':
      return 'external';
    case 'file':
      return 'file';
    case 'function':
      return doclet.memberof ? 'method' : 'function';
    case 'interface':
      return 'interface';
    case 'member':
      return doclet.memberof ? 'property' : 'member';
    case 'mixin':
      return 'mixin';
    case 'module':
      return 'module';
    case 'namespace':
      return 'namespace';
    case 'package':
      return 'package';
    case 'typedef':
      return 'type definition';
    default:
      return 'symbol';
  }
}

/**
 * Default deprecation message used when `@deprecated` carries no reason — the
 * wording adapts to the doclet's kind (e.g. "This class is deprecated…",
 * "This method is deprecated…").
 */
export function defaultDeprecationText(doclet: TDoclet): string {
  return `This ${kindNoun(doclet)} is deprecated and should not be used.`;
}

/**
 * `@deprecated` rendered as a `warning` callout blockquote. JSDoc stores it as
 * either `true` (just deprecated) or a reason string. When it's `true` we fall
 * back to a kind-aware default sentence ({@link defaultDeprecationText}) so the
 * callout is never blank. Reason strings may contain HTML.
 */
export function deprecationBlock(doclet: TDoclet): MdxJsxFlowElement | null {
  if (!doclet.deprecated) return null;
  if (doclet.deprecated === true) {
    return callout('error', [p(text(' '), text(defaultDeprecationText(doclet)))]);
  }
  const reason = htmlToMdastInline(doclet.deprecated);
  return callout('error', [p(text(' '), ...reason)]);
}

// ── Modifiers (abstract / async / generator / readonly / override / access) ──

/**
 * Boolean/scalar modifier flags collapsed into a single "Modifiers:" line:
 * `@abstract` (→ `virtual`), `@async`, `@generator`, `@readonly`, a bare
 * `@override` (no resolved parent — the resolved form is a relation line, see
 * {@link relationsBlocks}) and `@access` (private/protected/package/public).
 * Returns `null` when none apply.
 */
export function modifiersBlock(doclet: TDoclet): Paragraph | null {
  const mods: string[] = [];
  if (doclet.virtual) mods.push('abstract');
  if (doclet.async) mods.push('async');
  if (doclet.generator) mods.push('generator');
  if (doclet.readonly) mods.push('readonly');
  if (doclet.override && !doclet.overrides) mods.push('override');
  if (doclet.access) mods.push(doclet.access);
  if (mods.length === 0) return null;
  return p(
    strong(text('Modifiers:')),
    text(' '),
    ...interleave(
      mods.map((m) => inlineCode(m)),
      () => text(', ')
    )
  );
}

// ── Relations (extends / implements / mixes / overrides / borrows) ──────────

/**
 * Inheritance & composition links for a doclet, each on its own line:
 * `@augments`/`@extends`, `@implements`, `@mixes`, the resolved `@override`
 * target (`overrides`), and `@borrows` (`borrowed`). Mirrors the class-level
 * `classRelationsBlocks` but works for any member doclet. Empty if none apply.
 */
export function relationsBlocks(doclet: TDoclet): RootContent[] {
  const out: RootContent[] = [];

  const refLine = (label: string, refs: readonly string[] | undefined) => {
    if (!refs || refs.length === 0) return;
    out.push(
      p(
        strong(text(`${label}: `)),
        ...interleave(
          refs.map((r) => inlineCode(r)),
          () => text(', ')
        )
      )
    );
  };

  refLine('Extends', doclet.augments);
  refLine('Implements', doclet.implements);
  refLine('Mixes', doclet.mixes);

  if (doclet.overrides) {
    out.push(p(strong(text('Overrides: ')), inlineCode(doclet.overrides)));
  }

  for (const b of doclet.borrowed ?? []) {
    const children: Paragraph['children'] = [strong(text('Borrows: '))];
    if (b.from) children.push(inlineCode(b.from));
    if (b.as) children.push(text(' as '), inlineCode(b.as));
    out.push(p(...children));
  }

  return out;
}

// ── Params (incl. nested object-destructured params) ────────────────────────

/**
 * The owning symbol + slot resolver needed to translate a param/return/throws
 * **description**. Only the prose is a slot — names, type strings, optional/rest
 * markers, and default values stay locale-invariant. Omitted (or with no
 * resolver) → descriptions render from source, byte-identical to before.
 */
export interface ParamSlotCtx {
  slots?: SlotResolver;
  longname?: string;
}

/**
 * Resolve one param/return description to its render string: collect it for the
 * extractable template and (when stamping) substitute the locale's translation.
 * Keyed `<fieldPrefix>.<discriminator>.description` under the owning longname,
 * so a parameter is `params.timeout.description` and a return is
 * `returns.0.description`.
 */
function descriptionInline(
  description: string | null | undefined,
  ctx: ParamSlotCtx | undefined,
  fieldPrefix: string,
  discriminator: string
) {
  const source =
    resolveSlotText(
      ctx?.slots,
      ctx?.longname,
      [fieldPrefix, discriminator, 'description'],
      description
    ) ?? description;
  return htmlToMdastInline(source);
}

/**
 * `params` array rendered as a nested list. Object-destructured params (e.g.
 * `name: "options.timeout"`) are nested under their parent.
 *
 * Each item: `` `name` `` (`type`, optional, default: `value`) — description.
 * Descriptions are translatable slots (keyed by `fieldPrefix` + param name)
 * when a {@link ParamSlotCtx} with a resolver is supplied.
 */
export function paramsList(
  params: readonly TDocletParam[] | undefined,
  ctx?: ParamSlotCtx,
  fieldPrefix = 'params'
): List | null {
  if (!params || params.length === 0) return null;
  return ul(nestParamItems(params, ctx, fieldPrefix));
}

/**
 * `@property` list. Same nested shape as {@link paramsList} — object-property
 * entries (`options.timeout`) nest under their parent. `properties` carries the
 * param-compatible fields (name/type/optional/defaultvalue/description), so it
 * reuses the same item builder (slots keyed under `properties.*`).
 */
export function propertiesList(
  properties: readonly TDocletParam[] | undefined,
  ctx?: ParamSlotCtx
): List | null {
  return paramsList(properties, ctx, 'properties');
}

/**
 * Same shape as {@link paramsList} but for `@returns`. The `name` field is
 * usually absent — just type + description (a translatable slot keyed by index).
 */
export function returnsList(
  returns: readonly TDocletParam[] | undefined,
  ctx?: ParamSlotCtx
): List | null {
  return labeledTypedList(returns, ctx, 'returns');
}

/** Same as {@link returnsList} for `@yields`. */
export function yieldsList(
  yields: readonly TDocletParam[] | undefined,
  ctx?: ParamSlotCtx
): List | null {
  return labeledTypedList(yields, ctx, 'yields');
}

/** Same as {@link returnsList} for `@throws` / `exceptions`. */
export function throwsList(
  exceptions: readonly TDocletParam[] | undefined,
  ctx?: ParamSlotCtx
): List | null {
  return labeledTypedList(exceptions, ctx, 'throws');
}

function labeledTypedList(
  items: readonly TDocletParam[] | undefined,
  ctx: ParamSlotCtx | undefined,
  fieldPrefix: string
): List | null {
  if (!items || items.length === 0) return null;
  return ul(items.map((it, i) => li(p(...typedDescriptionInline(it, ctx, fieldPrefix, i)))));
}

function typedDescriptionInline(
  item: TDocletParam,
  ctx: ParamSlotCtx | undefined,
  fieldPrefix: string,
  index: number
) {
  const out = [];
  const t = typeExpressionString(item.type);
  if (t) out.push(inlineCode(t));
  // No name on a return/throws entry → key by position.
  const desc = descriptionInline(item.description, ctx, fieldPrefix, String(index));
  if (desc.length > 0) {
    if (out.length > 0) out.push(text(' — '));
    out.push(...desc);
  }
  return out;
}

function nestParamItems(
  params: readonly TDocletParam[],
  ctx: ParamSlotCtx | undefined,
  fieldPrefix: string
): ListItem[] {
  // Group nested `options.timeout` under `options`. JSDoc lists them flat but
  // in declaration order; we walk and build a name → ListItem map.
  const items: ListItem[] = [];
  const byName = new Map<string, ListItem>();

  for (const param of params) {
    const item = paramListItem(param, ctx, fieldPrefix);
    const name = param.name ?? '';
    byName.set(name, item);

    const dotIdx = name.lastIndexOf('.');
    if (dotIdx > 0) {
      const parentName = name.slice(0, dotIdx);
      const parent = byName.get(parentName);
      if (parent) {
        let nested = parent.children.find((c): c is List => c.type === 'list');
        if (!nested) {
          nested = ul([]);
          parent.children.push(nested);
        }
        nested.children.push(item);
        continue;
      }
    }
    items.push(item);
  }

  return items;
}

function paramListItem(
  param: TDocletParam,
  ctx: ParamSlotCtx | undefined,
  fieldPrefix: string
): ListItem {
  const line: Paragraph['children'] = [];

  if (param.name) line.push(inlineCode(param.name));

  const flags: string[] = [];
  const t = typeExpressionString(param.type);
  if (t) flags.push(t);
  if (param.optional) flags.push('optional');
  if (param.defaultvalue !== undefined)
    flags.push(`default: ${JSON.stringify(param.defaultvalue)}`);
  if (flags.length > 0) {
    if (line.length > 0) line.push(text(' '));
    line.push(text(`(${flags.join(', ')})`));
  }

  // The param NAME is the slot discriminator (stable across reorders, unlike an
  // index); nested `options.timeout` keeps its dotted name.
  const desc = descriptionInline(param.description, ctx, fieldPrefix, param.name ?? '');
  if (desc.length > 0) {
    if (line.length > 0) line.push(text(' — '));
    line.push(...desc);
  }

  return li(p(...line));
}

// ── Metadata (since / version / see / todo / author / tutorial / requires) ──

/**
 * Combines `@since`, `@version`, `@see`, `@todo`, `@author`, `@tutorial`,
 * `@requires` into a single bullet list. Returns `null` if none are set.
 *
 * Order is fixed for deterministic output.
 */
export function metadataList(doclet: TDoclet, options?: DocletBlocksOptions): List | null {
  const rows: ListItem[] = [];

  if (doclet.since) rows.push(li(p(strong(text('Since:')), text(' '), text(doclet.since))));
  if (doclet.version) rows.push(li(p(strong(text('Version:')), text(' '), text(doclet.version))));
  if (doclet.license) rows.push(li(p(strong(text('License:')), text(' '), text(doclet.license))));
  if (doclet.copyright) {
    rows.push(li(p(strong(text('Copyright:')), text(' '), text(doclet.copyright))));
  }
  if (doclet.author && doclet.author.length > 0) {
    rows.push(li(p(strong(text('Author:')), text(' '), text(doclet.author.join(', ')))));
  }
  if (doclet.requires && doclet.requires.length > 0) {
    rows.push(
      li(
        p(
          strong(text('Requires:')),
          text(' '),
          ...interleave(
            doclet.requires.map((r) => inlineCode(r)),
            () => text(', ')
          )
        )
      )
    );
  }
  if (doclet.tutorials && doclet.tutorials.length > 0) {
    const resolveTutorial = options?.resolveTutorial;
    rows.push(
      li(
        p(
          strong(text('Tutorials:')),
          text(' '),
          ...interleave(
            doclet.tutorials.map((t) => {
              const resolved = resolveTutorial?.(t);
              return resolved ? link(resolved.href, text(resolved.title)) : text(t);
            }),
            () => text(', ')
          )
        )
      )
    );
  }
  if (doclet.see && doclet.see.length > 0) {
    rows.push(
      li(
        p(strong(text('See:'))),
        ul(doclet.see.map((s) => li(p(...seeInline(s, options?.resolveLink)))))
      )
    );
  }
  if (doclet.todo && doclet.todo.length > 0) {
    rows.push(li(p(strong(text('TODO:'))), ul(doclet.todo.map((t) => li(p(text(t)))))));
  }

  return rows.length === 0 ? null : ul(rows);
}

/**
 * Render one `@see` entry as phrasing content.
 *
 * Without a `resolve` function this preserves the original legacy behavior
 * byte-for-byte: a `{@link URL|label}` tag or a bare `https?://` string becomes
 * a `link`, anything else becomes plain `text`. Existing callers/tests that
 * pass no resolver are therefore unaffected.
 *
 * With a `resolve` function the entry becomes a real cross-reference:
 * - A single wrapping brace pair (`@see {namepath}`) is stripped first.
 * - A `{@link …}` / `{@linkcode …}` / `{@linkplain …}` tag is parsed into
 *   `(target, label)` (target first, optional label after `|` or whitespace,
 *   label defaulting to target). A bare value is treated as a namepath-or-URL
 *   with `target = label = value`.
 * - `resolve(target)` hit → a `link` (monospaced child for `@linkcode`, plain
 *   text otherwise). Miss → `text(see)` fallback, so nothing renders as a
 *   broken anchor.
 *
 * `{@link …} prose` case (a tag followed by trailing prose, e.g.
 * `@see {@link Queue} for the main engine.`): we resolve the leading tag and
 * append the remaining prose as a trailing `text` node (option (a)). If the tag
 * itself doesn't resolve we fall back to plain `text(see)`.
 */
export function seeInline(see: string, resolve?: (t: string) => ResolvedLink | null) {
  if (resolve) {
    const trimmed = see.trim();
    // `@see {namepath}` — strip exactly one wrapping brace pair, but only when
    // the inner value is NOT itself a `{@link …}` tag (those start with `{@`).
    const value =
      trimmed.startsWith('{') && trimmed.endsWith('}') && !trimmed.startsWith('{@')
        ? trimmed.slice(1, -1).trim()
        : trimmed;

    // A `{@link|linkcode|linkplain target( |\|)label?}` tag, possibly followed
    // by trailing prose. We anchor at the start so a leading tag is detected
    // even when prose follows.
    const tagRe = /^\{@(link|linkcode|linkplain)\s+([^}|]+?)(?:[|\s]([^}]*))?\}/;
    const m = value.match(tagRe);
    if (m) {
      const tag = m[1];
      const target = (m[2] ?? '').trim();
      const label = (m[3] ?? '').trim() || target;
      const resolved = resolve(target);
      if (resolved) {
        const child = tag === 'linkcode' ? inlineCode(label) : text(label);
        const out: PhrasingContent[] = [link(resolved.href, child)];
        const rest = value.slice(m[0].length);
        if (rest.length > 0) out.push(text(rest));
        return out;
      }
      // Tag present but unresolved → preserve original text.
      return [text(see)];
    }

    // Bare namepath-or-URL: the whole value is both target and label.
    const resolved = resolve(value);
    if (resolved) {
      return [link(resolved.href, text(value))];
    }
    return [text(see)];
  }

  // ── Legacy behavior (no resolver) — must stay byte-identical ──────────────
  // Common form: `{@link URL|label}` or a bare URL or just text. Keep simple:
  // detect a leading URL pattern and emit a real link; otherwise raw text.
  const linkMatch = see.match(/^\{@link\s+([^|}\s]+)(?:\|([^}]+))?\}$/);
  if (linkMatch) {
    const url = linkMatch[1];
    const label = linkMatch[2] ?? url;
    return [link(url, text(label))];
  }
  if (/^https?:\/\//.test(see)) {
    return [link(see, text(see))];
  }
  return [text(see)];
}

function interleave<T, S>(items: T[], sep: () => S): (T | S)[] {
  const out: (T | S)[] = [];
  items.forEach((it, i) => {
    if (i > 0) out.push(sep());
    out.push(it);
  });
  return out;
}

// ── Source link ─────────────────────────────────────────────────────────────

/**
 * "Source: file:line" caption for a doclet, when `options.sourceLink` resolves
 * it. Emitted as a `<SourceLink href label />` MDX JSX node so rang owns the
 * markup (a small 12px caption) rather than a full-size paragraph. Returns
 * `null` when unresolved.
 */
export function sourceLinkBlock(
  doclet: TDoclet,
  options: DocletBlocksOptions = {}
): MdxJsxFlowElement | null {
  const resolved = options.sourceLink?.(doclet);
  if (!resolved) return null;
  return sourceLink(resolved.href, resolved.label);
}

// ── Composer: full per-doclet block ─────────────────────────────────────────

export type DocletSection =
  | 'summary'
  | 'modifiers'
  | 'relations'
  | 'this'
  | 'alias'
  | 'remarks'
  | 'typeParams'
  | 'params'
  | 'properties'
  | 'returns'
  | 'yields'
  | 'throws'
  | 'type'
  | 'default'
  | 'fires'
  | 'listens'
  | 'examples'
  | 'iframes'
  | 'metadata'
  | 'deprecation'
  | 'inherited';

export interface DocletBlocksOptions {
  /** Heading level for sub-section labels ("Parameters", "Returns", …). Default: 4. */
  subHeadingLevel?: 4 | 5 | 6;
  /** Language hint for example code blocks. Default: "js". */
  exampleLang?: string;
  /**
   * Sections to suppress. Useful when the caller is surfacing them in a
   * dedicated section elsewhere on the page (e.g. constructor params).
   */
  skip?: readonly DocletSection[];
  /** When set, emits a "Source: file:line" link for a doclet that resolves. */
  sourceLink?: (doclet: TDoclet) => { href: string; label: string } | null;
  /** Resolves a {@link}/@see namepath or URL to an href. Mirrors sourceLink. */
  resolveLink?: (target: string) => ResolvedLink | null;
  /** Resolves a `@tutorial` name to its guide page href + display title. */
  resolveTutorial?: (name: string) => { href: string; title: string } | null;
  /**
   * Resolves a doclet's `@playground` tag (+ the site-wide playground config)
   * into the wrapper opts for its `@example` blocks, or `null` for none. Threaded
   * like {@link DocletBlocksOptions.sourceLink}; omit for no playground (the
   * byte-identical default).
   */
  playgroundFor?: (doclet: TDoclet) => PlaygroundOpts | null;
  /**
   * Translatable-prose resolver: collects each description/summary/example-
   * caption slot and (when stamping a locale) substitutes its translation.
   * Omitted for the byte-identical default build. See {@link SlotResolver}.
   */
  slots?: SlotResolver;
}

/**
 * `typeParams` (generics) rendered as a list: `` `T` `` ` extends `Constraint``
 * ` = `Default`` — description`. Only the TypeDoc bridge ever populates
 * `typeParams`, so this never fires on the JSDoc path.
 */
function typeParamsList(typeParams: readonly TDocletTypeParam[]): List {
  return ul(
    typeParams.map((tp) => {
      const line: PhrasingContent[] = [inlineCode(tp.name)];
      if (tp.constraint) line.push(text(' extends '), inlineCode(tp.constraint));
      if (tp.default !== undefined && tp.default !== '') line.push(text(' = '), inlineCode(tp.default));
      const desc = tp.description ? htmlToMdastInline(tp.description) : [];
      if (desc.length > 0) {
        line.push(text(' — '));
        line.push(...desc);
      }
      return li(p(...line));
    })
  );
}

/**
 * Reusable: render a single doclet's content (everything *below* its heading)
 * as a sequence of mdast blocks. Used for class members, module members,
 * mixin members, globals — the per-item body is the same shape everywhere.
 *
 * Composes the small helpers above. Skip a section by omitting the field.
 */
export function docletBlocks(
  doclet: TDoclet & { inheritedFrom?: string },
  options: DocletBlocksOptions = {}
): RootContent[] {
  const skip = new Set<DocletSection>(options.skip ?? []);
  const blocks: RootContent[] = [];

  if (!skip.has('inherited')) {
    const inherited = inheritedFromParagraph(doclet);
    if (inherited) blocks.push(inherited);
  }

  if (!skip.has('modifiers')) {
    const mods = modifiersBlock(doclet);
    if (mods) blocks.push(mods);
  }

  if (!skip.has('relations')) {
    blocks.push(...relationsBlocks(doclet));
  }

  if (!skip.has('summary')) {
    blocks.push(...summaryBlocks(doclet, options.slots));
  }

  blocks.push(...descriptionBlocks(doclet, options.slots));

  // `@remarks` — detailed prose shown as its own "Remarks" section after the
  // description (matching TypeDoc). Only the TypeDoc bridge sets `remarks`, so
  // JSDoc output is unchanged.
  if (!skip.has('remarks') && doclet.remarks) {
    blocks.push(p(strong(text('Remarks'))), ...htmlToMdastBlocks(doclet.remarks));
  }

  if (!skip.has('deprecation')) {
    const dep = deprecationBlock(doclet);
    if (dep) blocks.push(dep);
  }

  if (!skip.has('this') && doclet.this) {
    blocks.push(p(strong(text('This:')), text(' '), inlineCode(doclet.this)));
  }

  if (!skip.has('alias') && doclet.alias) {
    blocks.push(p(strong(text('Alias:')), text(' '), inlineCode(doclet.alias)));
  }

  // Generics ("Type Parameters") render before parameters — matching TypeDoc.
  // Only the TypeDoc bridge sets `typeParams`, so JSDoc output is unchanged.
  if (!skip.has('typeParams') && doclet.typeParams && doclet.typeParams.length > 0) {
    blocks.push(p(strong(text('Type Parameters'))), typeParamsList(doclet.typeParams));
  }

  // Owning symbol + resolver for the translatable param/return descriptions.
  const slotCtx: ParamSlotCtx = { slots: options.slots, longname: doclet.longname };

  if (!skip.has('params')) {
    const list = paramsList(doclet.params, slotCtx);
    if (list) blocks.push(p(strong(text('Parameters'))), list);
  }

  if (!skip.has('properties')) {
    const list = propertiesList(doclet.properties as readonly TDocletParam[] | undefined, slotCtx);
    if (list) blocks.push(p(strong(text('Properties'))), list);
  }

  if (!skip.has('returns')) {
    const list = returnsList(doclet.returns, slotCtx);
    if (list) blocks.push(p(strong(text('Returns'))), list);
  }

  if (!skip.has('yields')) {
    const list = yieldsList(doclet.yields, slotCtx);
    if (list) blocks.push(p(strong(text('Yields'))), list);
  }

  if (!skip.has('throws')) {
    const list = throwsList(doclet.exceptions, slotCtx);
    if (list) blocks.push(p(strong(text('Throws'))), list);
  }

  // Type only when there's no params/returns (i.e. it's a field/event).
  if (!skip.has('type') && !doclet.params && !doclet.returns && doclet.type) {
    blocks.push(p(strong(text('Type'))), p(inlineCode(doclet.type.names.join(' | '))));
  }

  if (!skip.has('default') && doclet.defaultvalue !== undefined) {
    const dv = doclet.defaultvalue;
    const label = typeof dv === 'string' ? dv : JSON.stringify(dv);
    blocks.push(p(strong(text('Default:')), text(' '), inlineCode(label)));
  }

  if (!skip.has('fires') && doclet.fires && doclet.fires.length > 0) {
    blocks.push(p(strong(text('Fires'))), ul(doclet.fires.map((f) => li(p(inlineCode(f))))));
  }

  if (!skip.has('listens') && doclet.listens && doclet.listens.length > 0) {
    blocks.push(p(strong(text('Listens'))), ul(doclet.listens.map((l) => li(p(inlineCode(l))))));
  }

  if (!skip.has('examples')) {
    const pg = options.playgroundFor?.(doclet) ?? undefined;
    const ex = examplesBlocks(doclet, options.exampleLang ?? 'js', options.slots, pg);
    if (ex.length > 0) {
      blocks.push(p(strong(text('Example'))));
      blocks.push(...ex);
    }
  }

  if (!skip.has('iframes')) {
    blocks.push(...embedBlocks(doclet));
  }

  if (!skip.has('metadata')) {
    const meta = metadataList(doclet, options);
    if (meta) blocks.push(meta);
  }

  return blocks;
}
