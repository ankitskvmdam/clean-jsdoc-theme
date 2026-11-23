import type { Link, Paragraph, Parents } from 'mdast';
import type { Root } from 'mdast';
import { defaultHandlers, toMarkdown } from 'mdast-util-to-markdown';
import type { Info, State } from 'mdast-util-to-markdown';
import { mdxJsxToMarkdown } from 'mdast-util-mdx-jsx';
import { gfmToMarkdown } from 'mdast-util-gfm';
import { JSX_PARAGRAPH_GUARD } from '@clean-jsdoc-theme/utils';
import { ClassView } from './class-view';
import { classViewToMdast, ClassViewToMdastOptions } from './mdast/class-view';
import { isJsxOnlyParagraph } from './mdast/passthrough-html';

/**
 * Link serializer that always emits the resource form `[label](url)`, never the
 * autolink form `<url>`. mdast-util-to-markdown's default handler autolinks any
 * link whose text equals its URL (e.g. a bare `https://…` or an
 * `<https://…>`) — but MDX parses `<` as JSX, so an emitted `<url>` aborts the
 * whole page compile downstream in dwar. This is a copy of the default handler's
 * resource-form branch with the autolink branch removed, so every link we emit
 * is MDX-safe. (Adapted from `mdast-util-to-markdown/lib/handle/link.js`.)
 */
function resourceLink(node: Link, _parent: Parents | undefined, state: State, info: Info): string {
  const tracker = state.createTracker(info);
  const exit = state.enter('link');
  let subexit = state.enter('label');
  let value = tracker.move('[');
  value += tracker.move(
    state.containerPhrasing(node, { before: value, after: '](', ...tracker.current() })
  );
  value += tracker.move('](');
  subexit();

  if ((!node.url && node.title) || /[\0- ]/.test(node.url)) {
    // URL has whitespace/control chars → angle-bracketed destination literal.
    subexit = state.enter('destinationLiteral');
    value += tracker.move('<');
    value += tracker.move(
      state.safe(node.url, { before: value, after: '>', ...tracker.current() })
    );
    value += tracker.move('>');
  } else {
    subexit = state.enter('destinationRaw');
    value += tracker.move(
      state.safe(node.url, {
        before: value,
        after: node.title ? ' ' : ')',
        ...tracker.current(),
      })
    );
  }
  subexit();

  if (node.title) {
    subexit = state.enter('titleQuote');
    value += tracker.move(' "');
    value += tracker.move(
      state.safe(node.title, { before: value, after: '"', ...tracker.current() })
    );
    value += tracker.move('"');
    subexit();
  }

  value += tracker.move(')');
  exit();
  return value;
}
// peek tells the phrasing serializer our first emitted char, so it can escape a
// leading `[` if needed — always `[` since we never autolink.
resourceLink.peek = (): string => '[';

/**
 * Paragraph serializer that ends a paragraph of only JSX elements and
 * whitespace (`<mark>a</mark> <sub>b</sub>`) with {@link JSX_PARAGRAPH_GUARD}:
 * MDX would otherwise unravel it, dropping the `<p>` and the spaces between the
 * elements. Done at serialization so the mdast stays free of the character.
 */
function guardedParagraph(
  node: Paragraph,
  parent: Parents | undefined,
  state: State,
  info: Info
): string {
  const value = defaultHandlers.paragraph(node, parent, state, info);
  return isJsxOnlyParagraph(node) ? value + JSX_PARAGRAPH_GUARD : value;
}

export interface ToMdxOptions {
  /** Optional YAML frontmatter object. Serialized at the top of the document. */
  frontmatter?: Record<string, unknown>;
}

/** Serialize an mdast Root tree to an MDX-compatible markdown string. */
export function toMdx(tree: Root, options: ToMdxOptions = {}): string {
  const body = toMarkdown(tree, {
    bullet: '-',
    fence: '`',
    fences: true,
    incrementListMarker: false,
    rule: '-',
    strong: '*',
    emphasis: '_',
    // Serialize MDX JSX nodes (e.g. callout blockquotes carrying a `type`
    // attribute) verbatim so their props survive into the compiled MDX, and GFM
    // nodes (tables, strikethrough, task lists) — produced when JSDoc HTML is
    // converted to mdast — back into the `| … |` Markdown that dwar's remark-gfm
    // re-parses and rang renders.
    extensions: [mdxJsxToMarkdown(), gfmToMarkdown()],
    // Force resource-form links so no `<url>` autolink reaches dwar's MDX compile,
    // and keep JSX-only paragraphs paragraphs.
    handlers: { link: resourceLink, paragraph: guardedParagraph },
  });
  return withFrontmatter(body, options.frontmatter);
}

/**
 * Prepend serialized YAML frontmatter to an already-formed MDX/Markdown body.
 * Use this for content that should NOT be re-serialized through mdast (e.g. raw
 * Markdown tutorials, where round-tripping would drop GFM tables and other
 * syntax the mdast serializer doesn't model).
 */
export function withFrontmatter(body: string, frontmatter?: Record<string, unknown>): string {
  const fm = frontmatter ? renderFrontmatter(frontmatter) : '';
  return fm + body;
}

/** Compose a class page MDX string from a ClassView. */
export function classViewToMdx(
  view: ClassView,
  options: ClassViewToMdastOptions & ToMdxOptions = {}
): string {
  const tree = classViewToMdast(view, options);
  const frontmatter = options.frontmatter ?? defaultClassFrontmatter(view);
  return toMdx(tree, { frontmatter });
}

function defaultClassFrontmatter(view: ClassView): Record<string, unknown> {
  return {
    title: view.doclet.name ?? view.doclet.longname,
    kind: 'class',
    longname: view.doclet.longname,
  };
}

/**
 * Minimal YAML frontmatter serializer. Strings are emitted plain when a YAML
 * 1.1 or 1.2 parser reads them back as the same string, double-quoted
 * otherwise. Arrays render as `[a, b]`. Nested objects are not supported.
 */
function renderFrontmatter(data: Record<string, unknown>): string {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${formatYamlString(k, false)}: ${formatYamlValue(v, false)}`);
  if (lines.length === 0) return '';
  return ['---', ...lines, '---', '', ''].join('\n');
}

function formatYamlValue(v: unknown, inFlow: boolean): string {
  if (Array.isArray(v)) return `[${v.map((x) => formatYamlValue(x, true)).join(', ')}]`;
  if (typeof v === 'string') return formatYamlString(v, inFlow);
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '.nan';
    if (!Number.isFinite(v)) return v > 0 ? '.inf' : '-.inf';
    return String(v);
  }
  if (typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  if (v === null || v === undefined) return 'null'; // only reachable inside arrays
  return formatYamlString(String(v), inFlow);
}

function formatYamlString(s: string, inFlow: boolean): string {
  return needsYamlQuote(s, inFlow) ? yamlDoubleQuote(s) : s;
}

// Characters a plain scalar must not carry: C0 controls (tab and line breaks
// included), DEL, C1 controls, the Unicode line separators, BOM, non-characters
// and lone surrogates.
const YAML_UNSAFE_CHAR =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001f\u007f-\u009f\u2028\u2029\ufeff\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
// What JSON.stringify leaves raw but a YAML parser rejects or reads as a break.
const YAML_ESCAPE_EXTRA = /[\u007f-\u009f\u2028\u2029\ufeff\ufffe\uffff]/g;

function needsYamlQuote(s: string, inFlow: boolean): boolean {
  if (s.length === 0) return true;
  if (/^\s|\s$/.test(s)) return true; // edge whitespace is trimmed
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(s)) return true; // leading indicator
  if (/:\s/.test(s) || s.endsWith(':')) return true; // mapping-value indicator
  if (/\s#/.test(s)) return true; // comment start (#384)
  if (YAML_UNSAFE_CHAR.test(s)) return true;
  if (/^(?:~|null|true|false|yes|no|on|off|y|n)$/i.test(s)) return true; // null/bool, 1.1 + 1.2
  if (s === '<<' || s === '=') return true; // 1.1 merge / value types
  if (/^[-+]?\.(?:inf|nan)$/i.test(s)) return true;
  // Deliberately broad: anything spelled only with the number/timestamp
  // alphabet (ints, floats, hex/octal/binary, 1_000, 1:30 sexagesimal, dates).
  if (/^[-+]?(?:[.\d]|[eE][-+]?\d)[\d_.,:eExXoObBa-fA-F+\-TtZz ]*$/.test(s)) return true;
  if (inFlow && /[,[\]{}]/.test(s)) return true; // flow-sequence delimiters
  return false;
}

/** JSON string syntax is valid YAML double-quoted syntax, once the few
 *  characters JSON leaves raw are escaped too. Always a single line. */
function yamlDoubleQuote(s: string): string {
  return JSON.stringify(s).replace(
    YAML_ESCAPE_EXTRA,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
}
