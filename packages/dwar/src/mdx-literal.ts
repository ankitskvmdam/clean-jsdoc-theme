/**
 * Remark plugins that run on the MDX tree dwar compiles, right after parsing.
 *
 * A page body is documentation text: setu emits plain Markdown plus its own
 * component tags with string attributes, and never an MDX expression (`{…}`),
 * an attribute expression (`a={…}`), a spread attribute (`{...x}`) or an ES
 * module statement. The pre-passes in `mdx.ts` escape the braces they find in
 * prose, but they read the page with a scanner of their own, and whatever it
 * misreads reaches MDX as a real expression. {@link remarkLiteralExpressions}
 * settles that on the tree MDX itself parsed: braces in page text always show
 * as written.
 */

/** The mdast fields this pass reads; the rest of a node is kept as it is. */
interface MdxNode {
  type: string;
  value?: unknown;
  name?: string | null;
  attributes?: MdxNode[];
  children?: MdxNode[];
  data?: { estree?: { body?: unknown[] } | null };
  position?: unknown;
}

/**
 * Show every MDX expression, attribute expression and ES module statement in
 * the tree as the literal text it was written as.
 *
 * - `{x}` in text becomes the text `{x}`; on a line of its own, a paragraph
 *   holding it.
 * - An attribute `a={x}` becomes the string attribute `a="{x}"`, and a spread
 *   attribute `{...x}` is dropped.
 * - An `import`/`export` block becomes a paragraph holding its text.
 *
 * An expression holding nothing but comments and whitespace is kept: it
 * renders nothing. That is the `{/**\/}` placeholder `stripHtmlComments` leaves
 * where an HTML comment stood (and `escapeStrayBraces` empties to `{}`).
 */
export function remarkLiteralExpressions() {
  return (tree: MdxNode): void => {
    literalize(tree);
  };
}

function literalize(node: MdxNode): void {
  if (node.attributes) {
    const kept: MdxNode[] = [];
    for (const attribute of node.attributes) {
      if (attribute.type !== 'mdxJsxAttribute') continue; // a spread `{...x}`
      const value = attribute.value as MdxNode | string | null | undefined;
      if (value && typeof value === 'object') attribute.value = braced(value);
      kept.push(attribute);
    }
    node.attributes = kept;
  }
  const children = node.children;
  if (!children) return;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    switch (child.type) {
      case 'mdxTextExpression':
        if (!isEmptyExpression(child)) children[i] = textOf(child, braced(child));
        break;
      case 'mdxFlowExpression':
        if (!isEmptyExpression(child)) children[i] = paragraphOf(child, braced(child));
        break;
      case 'mdxjsEsm':
        children[i] = paragraphOf(child, String(child.value ?? ''));
        break;
      default:
        literalize(child);
    }
  }
}

/** Whether an expression holds only comments and whitespace (no code at all). */
function isEmptyExpression(node: MdxNode): boolean {
  const body = node.data?.estree?.body;
  if (Array.isArray(body)) return body.length === 0;
  return String(node.value ?? '').trim() === '';
}

/** The source text of an expression, braces included. */
function braced(node: MdxNode): string {
  return `{${String(node.value ?? '')}}`;
}

/** A text node standing where `node` stood. */
function textOf(node: MdxNode, value: string): MdxNode {
  return { type: 'text', value, position: node.position };
}

/** A paragraph holding `value` as text, standing where the block `node` stood. */
function paragraphOf(node: MdxNode, value: string): MdxNode {
  return { type: 'paragraph', children: [textOf(node, value)], position: node.position };
}
