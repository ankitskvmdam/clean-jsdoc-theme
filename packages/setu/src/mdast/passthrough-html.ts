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
};

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
    if (VALID[name] && !VALID[name].test(value)) continue;
    out.push({ type: 'mdxJsxAttribute', name, value });
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

/**
 * Keep an inline element with no Markdown form (`<sub>`, `<sup>`, `<abbr>`, …)
 * as a lowercase `mdxJsxTextElement` with its allow-listed attributes, where
 * `hast-util-to-mdast` would keep only its text (#360). Falls back to the
 * element's children, unwrapped, when it has none, when one of them is flow
 * content (`<ins><p>…</p></ins>`: a JSX text element can't hold a paragraph),
 * or for a `<span>` with no attribute left.
 */
const passthrough: Handle = (state: State, node: Element) => {
  const children = state.all(node) as RootContent[];
  const attributes = passthroughAttributes(node);
  if (children.length === 0 || !allPhrasing(children)) return children;
  if (node.tagName === 'span' && attributes.length === 0) return children;
  const result: MdxJsxTextElement = {
    type: 'mdxJsxTextElement',
    name: node.tagName,
    attributes,
    children: children as PhrasingContent[],
  };
  state.patch(node, result);
  return result;
};

/**
 * How many table cells the conversion is inside. A GFM table cell is one line,
 * so a `<details>` there can't be a multi-line JSX block: it keeps the default
 * lowering (its text). `toMdast` is synchronous, so a counter is enough.
 */
let cellDepth = 0;

/** Wrap a default table-cell handler to track {@link cellDepth}. */
function trackCell(handle: Handle): Handle {
  return (state, node, parent) => {
    cellDepth++;
    try {
      return handle(state, node, parent);
    } finally {
      cellDepth--;
    }
  };
}

/**
 * Keep `<details>` collapsible (#360): a `details` flow element whose first
 * child is its `<summary>` — a `summary` text element, so it serializes on one
 * line with no inner paragraph — followed by the rest of its content as flow.
 * `hast-util-to-mdast` would flatten both into plain paragraphs. A `<summary>`
 * outside a `<details>` keeps the default lowering (a paragraph of its text),
 * as does a `<details>` inside a table cell.
 */
const details: Handle = (state: State, node: Element) => {
  if (cellDepth > 0) return state.all(node);
  const summary = node.children.find(
    (c): c is Element => c.type === 'element' && c.tagName === 'summary'
  );
  const rest = node.children.filter((c) => c !== summary);
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
          children: label as PhrasingContent[],
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
  td: trackCell(defaultHandlers.td),
  th: trackCell(defaultHandlers.th),
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
