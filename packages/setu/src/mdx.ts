import type { Link, Parents } from 'mdast';
import type { Root } from 'mdast';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Info, State } from 'mdast-util-to-markdown';
import { mdxJsxToMarkdown } from 'mdast-util-mdx-jsx';
import { gfmToMarkdown } from 'mdast-util-gfm';
import { ClassView } from './class-view';
import { classViewToMdast, ClassViewToMdastOptions } from './mdast/class-view';

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
    state.containerPhrasing(node, { before: value, after: '](', ...tracker.current() }),
  );
  value += tracker.move('](');
  subexit();

  if ((!node.url && node.title) || /[\0- ]/.test(node.url)) {
    // URL has whitespace/control chars → angle-bracketed destination literal.
    subexit = state.enter('destinationLiteral');
    value += tracker.move('<');
    value += tracker.move(state.safe(node.url, { before: value, after: '>', ...tracker.current() }));
    value += tracker.move('>');
  } else {
    subexit = state.enter('destinationRaw');
    value += tracker.move(
      state.safe(node.url, {
        before: value,
        after: node.title ? ' ' : ')',
        ...tracker.current(),
      }),
    );
  }
  subexit();

  if (node.title) {
    subexit = state.enter('titleQuote');
    value += tracker.move(' "');
    value += tracker.move(state.safe(node.title, { before: value, after: '"', ...tracker.current() }));
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
    // Force resource-form links so no `<url>` autolink reaches dwar's MDX compile.
    handlers: { link: resourceLink },
  });
  return withFrontmatter(body, options.frontmatter);
}

/**
 * Prepend serialized YAML frontmatter to an already-formed MDX/Markdown body.
 * Use this for content that should NOT be re-serialized through mdast (e.g. raw
 * Markdown tutorials, where round-tripping would drop GFM tables and other
 * syntax the mdast serializer doesn't model).
 */
export function withFrontmatter(
  body: string,
  frontmatter?: Record<string, unknown>,
): string {
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
 * Minimal YAML frontmatter serializer. Strings are quoted, scalars are
 * emitted bare. Arrays render as `[a, b]`. Nested objects are not supported
 * — we'd reach for `yaml` proper if we needed that.
 */
function renderFrontmatter(data: Record<string, unknown>): string {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${formatYamlScalar(v)}`);
  if (lines.length === 0) return '';
  return ['---', ...lines, '---', '', ''].join('\n');
}

function formatYamlScalar(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => formatYamlScalar(x)).join(', ')}]`;
  if (typeof v === 'string') return needsYamlQuote(v) ? JSON.stringify(v) : v;
  return String(v);
}

function needsYamlQuote(s: string): boolean {
  if (s.length === 0) return true;
  // Leading char that would be interpreted by YAML as a structure indicator.
  if (/^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(s)) return true;
  // `: ` mid-string would split into key/value.
  if (/:\s/.test(s)) return true;
  // Multiline scalars need quoting.
  if (/[\n\r]/.test(s)) return true;
  return false;
}
