import { defaultHandlers, type Options, type State } from 'hast-util-to-mdast';
import type { Paragraph, PhrasingContent, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { PASSTHROUGH_INLINE_HTML } from '@clean-jsdoc-theme/utils';

/** A `hast-util-to-mdast` element handler. */
type Handle = NonNullable<NonNullable<Options['handlers']>[string]>;
/** A hast element (typed through the handler, as setu has no direct `hast` dependency). */
type Element = Parameters<Handle>[1];
/** The children of an MDX JSX flow element. */
type FlowChildren = MdxJsxFlowElement['children'];

/**
 * hast property → attribute name, for the attributes every passthrough element
 * may keep. Everything else (`class`, `id`, `style`, `on*`, `data-*`, `aria-*`,
 * …) is dropped: the element is there for its meaning, not to carry styling or
 * script into the page.
 */
const GLOBAL_ATTRIBUTES: Readonly<Record<string, string>> = {
  title: 'title',
  lang: 'lang',
  dir: 'dir',
};

/** Extra attributes, per element, as hast property → attribute name. */
const ELEMENT_ATTRIBUTES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  time: { dateTime: 'datetime' },
  data: { value: 'value' },
  ins: { cite: 'cite', dateTime: 'datetime' },
  details: { open: 'open' },
};

/** Valid values, where an attribute has a fixed shape. */
const VALID: Readonly<Record<string, RegExp>> = {
  lang: /^[A-Za-z0-9-]+$/,
  dir: /^(?:ltr|rtl|auto)$/,
  // http(s) or relative: a `javascript:` (or any other scheme) cite is dropped.
  cite: /^(?:https?:|(?![a-z][a-z0-9+.-]*:))/i,
};

/**
 * Write `&` and `|` in an attribute value as character references, which MDX
 * decodes back. The serializer escapes only the quote: a raw `&lt;` would read
 * back as `<`, and a raw `|` inside a GFM table row splits the cell mid-tag.
 */
const encodeAttribute = (value: string): string =>
  value.replace(/&/g, '&#38;').replace(/\|/g, '&#124;');

/**
 * `value` without ASCII control characters and spaces, which a browser strips
 * from (or ignores in) a URL's scheme: `&#1;javascript:` is still `javascript:`.
 */
const withoutControls = (value: string): string =>
  [...value].filter((c) => c.charCodeAt(0) > 32 && c.charCodeAt(0) !== 127).join('');

/**
 * One attribute value as a plain string: whitespace collapsed and trimmed, and a
 * backtick turned into `'` — inside an attribute it would still read as an
 * inline-code delimiter to dwar's unbalanced-backtick check. Empty → dropped.
 */
function attributeValue(value: Element['properties'][string]): string | undefined {
  if (value === null || value === undefined || typeof value === 'boolean') return undefined;
  const raw = Array.isArray(value) ? value.join(' ') : String(value);
  const text = raw.replace(/\s+/g, ' ').trim().replace(/`/g, "'");
  return text === '' ? undefined : text;
}

/**
 * The allow-listed attributes of `node`, in the order the policy lists them,
 * always as plain string `mdxJsxAttribute`s (never expressions, so nothing in
 * a value is evaluated by MDX).
 */
export function passthroughAttributes(node: Element): MdxJsxAttribute[] {
  const allowed = { ...GLOBAL_ATTRIBUTES, ...ELEMENT_ATTRIBUTES[node.tagName] };
  const out: MdxJsxAttribute[] = [];
  for (const [property, name] of Object.entries(allowed)) {
    // A boolean attribute (`<details open>`) is written bare.
    if (node.properties[property] === true) {
      out.push({ type: 'mdxJsxAttribute', name, value: null });
      continue;
    }
    const value = attributeValue(node.properties[property]);
    if (value === undefined) continue;
    if (VALID[name] && !VALID[name].test(name === 'cite' ? withoutControls(value) : value)) {
      continue;
    }
    out.push({ type: 'mdxJsxAttribute', name, value: encodeAttribute(value) });
  }
  return out;
}

/** mdast node types that may sit inside a passthrough (phrasing) element. */
const PHRASING = new Set<string>([
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
  'mdxJsxTextElement',
]);

/** Whether every node in `nodes`, at any depth, is phrasing content. */
function allPhrasing(nodes: readonly RootContent[]): boolean {
  return nodes.every(
    (n) => PHRASING.has(n.type) && (!('children' in n) || allPhrasing(n.children as RootContent[]))
  );
}

/** Phrasing wrappers that serialize as bare markers (`__`, `**`, `~~`) when empty. */
const MARKERS = new Set(['emphasis', 'strong', 'delete']);

/** `nodes` without empty emphasis/strong/delete, at any depth. */
function dropEmptyMarkers(nodes: readonly RootContent[]): RootContent[] {
  return nodes.flatMap((n) => {
    if (!('children' in n)) return [n];
    const children = dropEmptyMarkers(n.children as RootContent[]);
    if (MARKERS.has(n.type) && children.length === 0) return [];
    return [{ ...n, children } as RootContent];
  });
}

/** A `<br>`, or whitespace-only text. */
const isBlank = (n: RootContent): boolean =>
  n.type === 'break' || (n.type === 'text' && n.value.trim() === '');

/** The content of a JSX text element, split for {@link tidyPhrasing}. */
interface Tidied {
  /** Breaks (and whitespace) that stood at the start. */
  lead: RootContent[];
  body: RootContent[];
  /** Breaks (and whitespace) that stood at the end. */
  trail: RootContent[];
}

/**
 * The content of a JSX text element, made safe to serialize: empty markers
 * dropped, and a run of breaks (and whitespace) at either edge split off. A
 * break serializes as `\` + newline, so at the end it left the closing tag
 * alone on its line, where MDX reads it as a flow tag and fails the page.
 */
function tidyPhrasing(nodes: readonly RootContent[]): Tidied {
  const out = dropEmptyMarkers(nodes);
  const hasBreak = (run: RootContent[]): boolean => run.some((n) => n.type === 'break');
  let end = out.length;
  while (end > 0 && isBlank(out[end - 1])) end--;
  if (!hasBreak(out.slice(end))) end = out.length;
  let start = 0;
  while (start < end && isBlank(out[start])) start++;
  if (!hasBreak(out.slice(0, start))) start = 0;
  return { lead: out.slice(0, start), body: out.slice(start, end), trail: out.slice(end) };
}

/**
 * Keep an inline element with no Markdown form (`<sub>`, `<sup>`, `<abbr>`, …)
 * as a lowercase `mdxJsxTextElement` with its allow-listed attributes, where
 * `hast-util-to-mdast` would keep only its text (#360). Falls back to the
 * element's children, unwrapped, when it has none, when one of them is flow
 * content (`<ins><p>…</p></ins>`: a JSX text element can't hold a paragraph),
 * or for a `<span>` with no attribute left. A `<br>` at its edge moves out of
 * it, where it is the line break it was before.
 */
const passthrough: Handle = (state: State, node: Element) => {
  const all = state.all(node) as RootContent[];
  const attributes = passthroughAttributes(node);
  if (!allPhrasing(all)) return all;
  const { lead, body: children, trail } = tidyPhrasing(all);
  if (children.length === 0) return [...lead, ...trail];
  if (node.tagName === 'span' && attributes.length === 0) return all;
  const result: MdxJsxTextElement = {
    type: 'mdxJsxTextElement',
    name: node.tagName,
    attributes,
    children: children as PhrasingContent[],
  };
  state.patch(node, result);
  return [...lead, result, ...trail];
};

/**
 * How many one-line Markdown constructs (table cells, headings) the conversion
 * is inside, at any depth. A `<details>` there can't be a multi-line JSX block:
 * it keeps the default lowering (its text). `toMdast` is synchronous, so a
 * counter is enough.
 */
let lineDepth = 0;

/** Wrap a default handler to track {@link lineDepth}. */
function oneLine(handle: Handle): Handle {
  return (state, node, parent) => {
    lineDepth++;
    try {
      return handle(state, node, parent);
    } finally {
      lineDepth--;
    }
  };
}

/**
 * Elements whose content lowers to flow, so a `<details>` directly inside one
 * can stay a block. Inside anything else (`<em>`, `<a>`, `<p>`, …) it would
 * land in phrasing content, so it keeps the default lowering.
 */
const FLOW_PARENTS = new Set<string>([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'center',
  'dd',
  'details',
  'div',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'header',
  'html',
  'li',
  'main',
  'nav',
  'section',
]);

/** Whether `nodes` hold anything but whitespace text. */
const hasContent = (nodes: Element['children']): boolean =>
  nodes.some((c) => c.type !== 'comment' && (c.type !== 'text' || c.value.trim() !== ''));

/**
 * Keep `<details>` collapsible (#360): a `details` flow element whose first
 * child is its `<summary>` — a `summary` text element, so it serializes on one
 * line with no inner paragraph — followed by the rest of its content as flow.
 * `hast-util-to-mdast` would flatten both into plain paragraphs. A `<summary>`
 * outside a `<details>` keeps the default lowering (a paragraph of its text),
 * as does a `<details>` in a table cell, a heading or phrasing content.
 */
const details: Handle = (state: State, node: Element, parent) => {
  const inFlow = !parent || parent.type !== 'element' || FLOW_PARENTS.has(parent.tagName);
  if (lineDepth > 0 || !inFlow) return state.all(node);
  const at = node.children.findIndex((c) => c.type === 'element' && c.tagName === 'summary');
  const summary = at === -1 ? undefined : (node.children[at] as Element);
  // A summary between body text leaves a space, so the text around it isn't glued.
  const gap =
    summary && hasContent(node.children.slice(0, at)) && hasContent(node.children.slice(at + 1));
  const rest = node.children.flatMap((c): Element['children'] =>
    c !== summary ? [c] : gap ? [{ type: 'text', value: ' ' }] : []
  );
  const children: FlowChildren = [];
  if (summary) {
    const label = state.all(summary) as RootContent[];
    // A summary holding flow content (`<summary><p>…</p></summary>`) stays a
    // flow element; the usual phrasing one is a text element.
    const element: MdxJsxTextElement | MdxJsxFlowElement = allPhrasing(label)
      ? {
          type: 'mdxJsxTextElement',
          name: 'summary',
          attributes: passthroughAttributes(summary),
          // An edge `<br>` in a summary has nothing to break: dropped.
          children: tidyPhrasing(label).body as PhrasingContent[],
        }
      : {
          type: 'mdxJsxFlowElement',
          name: 'summary',
          attributes: passthroughAttributes(summary),
          children: state.toFlow(label as FlowChildren) as FlowChildren,
        };
    state.patch(summary, element);
    // A JSX text element among flow children: mdast-util-mdx-jsx serializes it
    // on its own line, and MDX reads it back as the same element.
    children.push(element as FlowChildren[number]);
  }
  const body = state.all({ ...node, children: rest }) as FlowChildren;
  children.push(...(state.toFlow(body) as FlowChildren));
  const result: MdxJsxFlowElement = {
    type: 'mdxJsxFlowElement',
    name: 'details',
    attributes: passthroughAttributes(node),
    children,
  };
  state.patch(node, result);
  return result;
};

/**
 * `hast-util-to-mdast` handlers for the passthrough elements, keyed by tag
 * name, plus `<details>`. Spread it into a `handlers` option (alongside other
 * handlers).
 */
export const passthroughHandlers: Record<string, Handle> = {
  ...Object.fromEntries(PASSTHROUGH_INLINE_HTML.map((name) => [name, passthrough])),
  details,
  ...Object.fromEntries(
    ['td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((name) => [
      name,
      oneLine(defaultHandlers[name as keyof typeof defaultHandlers]),
    ])
  ),
};

/**
 * Whether `node` holds only JSX text elements and whitespace — the paragraph
 * shape MDX unravels (see `JSX_PARAGRAPH_GUARD`).
 */
export function isJsxOnlyParagraph(node: Paragraph): boolean {
  let jsx = false;
  for (const child of node.children) {
    if (child.type === 'mdxJsxTextElement') jsx = true;
    else if (child.type !== 'text' || child.value.trim() !== '') return false;
  }
  return jsx;
}
