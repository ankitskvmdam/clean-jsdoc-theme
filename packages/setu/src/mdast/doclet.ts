import type { Code, List, ListItem, Paragraph, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { TDoclet, TDocletParam, TDocletTypeProperty } from '@clean-jsdoc-theme/utils';
import { callout, code, emphasis, inlineCode, li, link, p, strong, text, ul } from './builders';
import { htmlToMdastBlocks, htmlToMdastInline } from './from-html';

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
 * `description` (constructor-level). Both come in as HTML from JSDoc.
 */
export function descriptionBlocks(doclet: TDoclet): RootContent[] {
  return htmlToMdastBlocks(doclet.classdesc ?? doclet.description);
}

/**
 * `@summary` content if present, as block content. Distinct from
 * {@link descriptionBlocks} — both can coexist on a doclet.
 */
export function summaryBlocks(doclet: TDoclet): RootContent[] {
  return htmlToMdastBlocks(doclet.summary);
}

// ── Examples ────────────────────────────────────────────────────────────────

/**
 * One fenced code block per `@example`. Examples are emitted by JSDoc as raw
 * strings, not HTML — no turndown needed.
 */
export function examplesBlocks(doclet: TDoclet, lang: string = 'js'): Code[] {
  return (doclet.examples ?? []).map((src) => code(lang, src));
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

/**
 * `@deprecated` rendered as a `warning` callout blockquote. JSDoc stores it as
 * either `true` (just deprecated) or a reason string. Reason strings may
 * contain HTML.
 */
export function deprecationBlock(doclet: TDoclet): MdxJsxFlowElement | null {
  if (!doclet.deprecated) return null;
  if (doclet.deprecated === true) {
    return callout('warning', [p(strong(text('Deprecated')))]);
  }
  const reason = htmlToMdastInline(doclet.deprecated);
  return callout('warning', [p(strong(text('Deprecated:')), text(' '), ...reason)]);
}

// ── Params (incl. nested object-destructured params) ────────────────────────

/**
 * `params` array rendered as a nested list. Object-destructured params (e.g.
 * `name: "options.timeout"`) are nested under their parent.
 *
 * Each item: `` `name` `` (`type`, optional, default: `value`) — description.
 */
export function paramsList(params: readonly TDocletParam[] | undefined): List | null {
  if (!params || params.length === 0) return null;
  return ul(nestParamItems(params));
}

/**
 * Same shape as {@link paramsList} but for `@returns`. The `name` field is
 * usually absent — just type + description.
 */
export function returnsList(returns: readonly TDocletParam[] | undefined): List | null {
  return labeledTypedList(returns);
}

/** Same as {@link returnsList} for `@yields`. */
export function yieldsList(yields: readonly TDocletParam[] | undefined): List | null {
  return labeledTypedList(yields);
}

/** Same as {@link returnsList} for `@throws` / `exceptions`. */
export function throwsList(exceptions: readonly TDocletParam[] | undefined): List | null {
  return labeledTypedList(exceptions);
}

function labeledTypedList(items: readonly TDocletParam[] | undefined): List | null {
  if (!items || items.length === 0) return null;
  return ul(items.map((it) => li(p(...typedDescriptionInline(it)))));
}

function typedDescriptionInline(item: TDocletParam) {
  const out = [];
  const t = typeExpressionString(item.type);
  if (t) out.push(inlineCode(t));
  const desc = htmlToMdastInline(item.description);
  if (desc.length > 0) {
    if (out.length > 0) out.push(text(' — '));
    out.push(...desc);
  }
  return out;
}

function nestParamItems(params: readonly TDocletParam[]): ListItem[] {
  // Group nested `options.timeout` under `options`. JSDoc lists them flat but
  // in declaration order; we walk and build a name → ListItem map.
  const items: ListItem[] = [];
  const byName = new Map<string, ListItem>();

  for (const param of params) {
    const item = paramListItem(param);
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

function paramListItem(param: TDocletParam): ListItem {
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

  const desc = htmlToMdastInline(param.description);
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
export function metadataList(doclet: TDoclet): List | null {
  const rows: ListItem[] = [];

  if (doclet.since) rows.push(li(p(strong(text('Since:')), text(' '), text(doclet.since))));
  if (doclet.version) rows.push(li(p(strong(text('Version:')), text(' '), text(doclet.version))));
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
    rows.push(
      li(
        p(
          strong(text('Tutorials:')),
          text(' '),
          ...interleave(
            doclet.tutorials.map((t) => text(t)),
            () => text(', ')
          )
        )
      )
    );
  }
  if (doclet.see && doclet.see.length > 0) {
    rows.push(li(p(strong(text('See:'))), ul(doclet.see.map((s) => li(p(...seeInline(s)))))));
  }
  if (doclet.todo && doclet.todo.length > 0) {
    rows.push(li(p(strong(text('TODO:'))), ul(doclet.todo.map((t) => li(p(text(t)))))));
  }

  return rows.length === 0 ? null : ul(rows);
}

function seeInline(see: string) {
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

// ── Composer: full per-doclet block ─────────────────────────────────────────

export type DocletSection =
  | 'params'
  | 'returns'
  | 'yields'
  | 'throws'
  | 'type'
  | 'fires'
  | 'examples'
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

  blocks.push(...descriptionBlocks(doclet));

  if (!skip.has('deprecation')) {
    const dep = deprecationBlock(doclet);
    if (dep) blocks.push(dep);
  }

  if (!skip.has('params')) {
    const list = paramsList(doclet.params);
    if (list) blocks.push(p(strong(text('Parameters'))), list);
  }

  if (!skip.has('returns')) {
    const list = returnsList(doclet.returns);
    if (list) blocks.push(p(strong(text('Returns'))), list);
  }

  if (!skip.has('yields')) {
    const list = yieldsList(doclet.yields);
    if (list) blocks.push(p(strong(text('Yields'))), list);
  }

  if (!skip.has('throws')) {
    const list = throwsList(doclet.exceptions);
    if (list) blocks.push(p(strong(text('Throws'))), list);
  }

  // Type only when there's no params/returns (i.e. it's a field/event).
  if (!skip.has('type') && !doclet.params && !doclet.returns && doclet.type) {
    blocks.push(p(strong(text('Type'))), p(inlineCode(doclet.type.names.join(' | '))));
  }

  if (!skip.has('fires') && doclet.fires && doclet.fires.length > 0) {
    blocks.push(p(strong(text('Fires'))), ul(doclet.fires.map((f) => li(p(inlineCode(f))))));
  }

  if (!skip.has('examples')) {
    const ex = examplesBlocks(doclet, options.exampleLang ?? 'js');
    if (ex.length > 0) {
      blocks.push(p(strong(text('Example'))));
      blocks.push(...ex);
    }
  }

  if (!skip.has('metadata')) {
    const meta = metadataList(doclet);
    if (meta) blocks.push(meta);
  }

  return blocks;
}
