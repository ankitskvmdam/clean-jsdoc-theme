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
 * as written. {@link remarkInlineTags} likewise decides on that tree which
 * JSDoc inline tags are prose.
 */

/** The mdast fields these passes read; the rest of a node is kept as it is. */
interface MdxNode {
  type: string;
  value?: unknown;
  name?: string | null;
  attributes?: MdxNode[];
  children?: MdxNode[];
  data?: { estree?: { body?: unknown[] } | null };
  position?: {
    start?: { offset?: number; line?: number; column?: number };
    end?: { offset?: number };
  };
  [field: string]: unknown;
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

/**
 * Stands for the `{` of a JSDoc inline tag in the text MDX parses (see
 * `preprocessJsdocInlineTags` in `mdx.ts`); {@link TAG_CLOSE} for its `}`.
 * Private-use characters: no Markdown or MDX syntax gives them a meaning.
 */
export const TAG_OPEN = '\uE000';
export const TAG_CLOSE = '\uE001';
/** Comes before a private-use character the author wrote that a placeholder would claim. */
const TAG_GUARD = '\uE002';
/** How far a guarded character is moved: U+E000–U+E002 become U+E010–U+E012. */
const GUARD_SHIFT = 0x10;
const CLAIMED = /[\uE000-\uE002]/g;
const HAS_PLACEHOLDER = /[\uE000-\uE002]/;
/** A placeholder, or a guarded character (group 1). */
const PLACEHOLDER = /[\uE000\uE001]|\uE002([\uE010-\uE012])/g;
/** A placeholder pair, the tag's text in group 1. */
const PAIR = /\uE000([^\uE000\uE001]*)\uE001/g;

/**
 * `text` with each private-use character a placeholder would claim (U+E000 to
 * U+E002) written as {@link TAG_GUARD} and the character moved out of the
 * way, so that every placeholder in the result is one the tag pass set. The
 * tree pass moves them back.
 */
export function guardTagPlaceholders(text: string): string {
  if (!HAS_PLACEHOLDER.test(text)) return text;
  return text.replace(
    CLAIMED,
    (c) => TAG_GUARD + String.fromCharCode(c.charCodeAt(0) + GUARD_SHIFT)
  );
}

/** `text` with each placeholder back to its brace and each guarded character as written. */
function restoreBraces(text: string): string {
  if (!HAS_PLACEHOLDER.test(text)) return text;
  return text.replace(PLACEHOLDER, (c, guarded: string | undefined) => {
    if (guarded !== undefined) return String.fromCharCode(guarded.charCodeAt(0) - GUARD_SHIFT);
    return c === TAG_OPEN ? '{' : '}';
  });
}

/** Fields that hold text taken from the page, besides a text node's `value`. */
const TEXT_FIELDS = ['value', 'url', 'title', 'label', 'identifier', 'lang', 'meta'] as const;
/** Containers whose markers open each continuation line of a paragraph inside them. */
const CONTAINERS = new Set(['blockquote', 'listItem', 'footnoteDefinition']);

/**
 * Show each JSDoc inline tag that MDX read as prose as inline code, and give
 * every other one its braces back.
 *
 * A placeholder pair inside the text of one paragraph, heading or table cell is
 * a tag in prose: it becomes an `inlineCode` node holding the tag's text
 * (`@link Foo`), as a code span written in its place would show it — taken
 * from the page source, so it reads exactly as before, and with a line break
 * read as a space. A pair whose text MDX split into more than one node (a URL,
 * emphasis or a tag in it) still becomes one code span when both of its ends
 * lie in sibling nodes; everything between them is then code text.
 *
 * Any other placeholder — in inline code, a fenced block, an attribute, a link
 * destination or title, or a pair split between blocks, table cells or
 * nesting levels (`*{@link a* b}`) — turns back into the brace the author
 * wrote, so such a tag shows as written. An image's alt text takes the tag's
 * text, as it took the code span's before. The frontmatter holds none.
 */
export function remarkInlineTags() {
  return (tree: MdxNode, file?: { value?: unknown }): void => {
    const source = typeof file?.value === 'string' ? file.value : '';
    if (!HAS_PLACEHOLDER.test(source)) return;
    restoreTags(tree, source, []);
  };
}

function restoreTags(node: MdxNode, source: string, containers: readonly MdxNode[]): void {
  if (node.type === 'yaml') return;
  if (node.type !== 'text') {
    for (const field of TEXT_FIELDS) {
      const v = node[field];
      if (typeof v === 'string') node[field] = restoreBraces(v);
    }
  }
  if (typeof node.alt === 'string') {
    node.alt = restoreBraces(node.alt.replace(PAIR, (_m, text: string) => tagText(text)));
  }
  for (const attribute of node.attributes ?? []) {
    if (typeof attribute.value === 'string') attribute.value = restoreBraces(attribute.value);
  }
  if (!node.children) return;
  const inner = CONTAINERS.has(node.type) ? [...containers, node] : containers;
  node.children = pairTags(node.children, source, inner);
  for (const child of node.children) {
    if (child.type !== 'text') restoreTags(child, source, inner);
  }
}

/** Where a tag's closing placeholder lies: the sibling and the offsets. */
interface TagEnd {
  /** Index of the sibling that holds it. */
  index: number;
  /** Its offset in the page source. */
  offset: number;
  /** For a text sibling, where to carry on in its value; for a link, its text after the tag. */
  next: number | MdxNode;
}

/** `children` with each tag in their text made inline code and every other placeholder restored. */
function pairTags(
  children: readonly MdxNode[],
  source: string,
  containers: readonly MdxNode[]
): MdxNode[] {
  if (!children.some(hasTextPlaceholder)) return children as MdxNode[];
  const list = children.slice();
  const out: MdxNode[] = [];
  const pushText = (text: string): void => {
    if (text) out.push({ type: 'text', value: restoreBraces(text) });
  };
  let i = 0;
  let from = 0; // where to start in list[i]'s value
  while (i < list.length) {
    const node = list[i];
    if (!hasTextPlaceholder(node)) {
      out.push(node);
      i++;
      from = 0;
      continue;
    }
    const value = node.value as string;
    const marks = placeholderMarks(value);
    const raw = sourceMarks(node, value, marks, source);
    const page = { source, containers };
    let cursor = from;
    let end: TagEnd | undefined;
    for (let k = 0; k < marks.length; k++) {
      const at = marks[k];
      if (at < from || value[at] !== TAG_OPEN) continue;
      if (k + 1 < marks.length) {
        const close = marks[k + 1];
        if (value[close] !== TAG_CLOSE) continue; // another tag starts first: this one is unpaired
        pushText(value.slice(cursor, at));
        const text = raw
          ? tagText(source.slice(raw[k] + 1, raw[k + 1]), page)
          : tagText(value.slice(at + 1, close));
        out.push({ type: 'inlineCode', value: text });
        cursor = close + 1;
        k++;
        continue;
      }
      // The last placeholder here opens a tag: it may close in a later sibling.
      end = raw ? findTagEnd(list, i + 1, source) : undefined;
      if (end && raw) {
        pushText(value.slice(cursor, at));
        out.push({
          type: 'inlineCode',
          value: tagText(source.slice(raw[k] + 1, end.offset), page),
        });
        cursor = value.length;
      }
    }
    pushText(value.slice(cursor));
    if (!end) {
      i++;
      from = 0;
    } else if (typeof end.next === 'number') {
      // Carry on in the closing sibling's text, after the tag.
      i = end.index;
      from = end.next;
    } else {
      // The link's text after the tag, with the link itself gone into the code.
      i = end.index;
      list[i] = end.next;
      from = 0;
    }
  }
  return out;
}

function hasTextPlaceholder(node: MdxNode): boolean {
  return node.type === 'text' && typeof node.value === 'string' && HAS_PLACEHOLDER.test(node.value);
}

/** The offsets of the placeholders (not the guarded characters) in `value`. */
function placeholderMarks(value: string): number[] {
  const marks: number[] = [];
  for (let p = 0; p < value.length; p++) {
    const c = value.charCodeAt(p);
    if (c === 0xe000 || c === 0xe001) marks.push(p);
    else if (c === 0xe002) p++; // a guard: the character after it is the author's
  }
  return marks;
}

/**
 * The page-source offsets of a text node's placeholders, in order, when its
 * position is known and its source holds the same ones (a character reference
 * can decode to a private-use character, which then is not one of them).
 */
function sourceMarks(
  node: MdxNode,
  value: string,
  marks: readonly number[],
  source: string
): number[] | undefined {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== 'number' || typeof end !== 'number') return undefined;
  const raw = placeholderMarks(source.slice(start, end)).map((p) => p + start);
  if (raw.length !== marks.length) return undefined;
  for (let k = 0; k < raw.length; k++) if (source[raw[k]] !== value[marks[k]]) return undefined;
  return raw;
}

/**
 * The closing placeholder of a tag opened at the end of a text node, looked
 * for in its later siblings `list[from…]`: the first placeholder there must be
 * it, at the start of a text sibling or of the text of a link (a bare URL
 * that ran into it). Siblings before it may hold anything without one.
 */
function findTagEnd(list: readonly MdxNode[], from: number, source: string): TagEnd | undefined {
  for (let j = from; j < list.length; j++) {
    const node = list[j];
    if (node.type === 'text') {
      const value = String(node.value ?? '');
      const marks = placeholderMarks(value);
      if (marks.length === 0) continue;
      const raw = sourceMarks(node, value, marks, source);
      if (!raw || value[marks[0]] !== TAG_CLOSE) return undefined;
      return { index: j, offset: raw[0], next: marks[0] + 1 };
    }
    if (!holdsPlaceholder(node)) continue;
    const text = node.type === 'link' && node.children?.length === 1 ? node.children[0] : undefined;
    if (!text || text.type !== 'text') return undefined;
    const value = String(text.value ?? '');
    const marks = placeholderMarks(value);
    const raw = sourceMarks(text, value, marks, source);
    if (!raw || value[marks[0]] !== TAG_CLOSE) return undefined;
    return { index: j, offset: raw[0], next: { type: 'text', value: value.slice(marks[0] + 1) } };
  }
  return undefined;
}

/** Whether a node, its attributes or its descendants hold a placeholder. */
function holdsPlaceholder(node: MdxNode): boolean {
  for (const field of [...TEXT_FIELDS, 'alt'] as const) {
    const v = node[field];
    if (typeof v === 'string' && HAS_PLACEHOLDER.test(v)) return true;
  }
  if (node.attributes?.some(holdsPlaceholder)) return true;
  return node.children?.some(holdsPlaceholder) ?? false;
}

/**
 * What the code span `` `@link Foo` `` that used to stand for a tag showed:
 * its text trimmed, each line break read as a space. Taken from the page
 * `source` (`at`), each line after the first loses the markers of the
 * `containers` it is in (quote markers, list indentation), as a code span's
 * lines do, and an `import`/`export` line start is shown as written
 * (`escapeEsmLookalikes` wrote its first letter as a character reference).
 * Without `at`, `text` is a text node's value: its lines are already bare.
 */
function tagText(text: string, at?: { source: string; containers: readonly MdxNode[] }): string {
  let t = text;
  if (at) {
    t = t.replace(/(?<=[\r\n])&#x(?:69;(?=mport\s)|65;(?=xport\s))/g, (m) =>
      m === '&#x69;' ? 'i' : 'e'
    );
  }
  const lines = restoreBraces(t)
    .trim()
    .split(/\r\n|\r|\n/);
  if (at && at.containers.length > 0) {
    for (let k = 1; k < lines.length; k++) {
      lines[k] = stripContainers(lines[k], at.containers, at.source);
    }
  }
  return lines.join(' ');
}

/**
 * `line` without the container markers that open it, as CommonMark reads
 * them: for each container, outermost first, a quote's `>` (after up to three
 * spaces, with one optional space after it) or a list item's (or footnote's)
 * content indentation. A tab counts to the next multiple of four columns, and
 * the part of one a marker does not use stays as spaces. A lazy line, without
 * a container's marker or indentation, keeps the rest as it is.
 */
function stripContainers(line: string, containers: readonly MdxNode[], source: string): string {
  let rest = line;
  let col = 0;
  for (const c of containers) {
    if (c.type === 'blockquote') {
      const marker = /^ {0,3}>/.exec(rest);
      if (!marker) break;
      col += marker[0].length;
      rest = rest.slice(marker[0].length);
      const space = takeColumns(rest, col, col + 1);
      if (space) ({ rest, col } = space);
      continue;
    }
    const target = c.type === 'listItem' ? listContentColumn(c, source) : col + 4;
    if (target === undefined) break;
    const indent = takeColumns(rest, col, target);
    if (!indent) break;
    ({ rest, col } = indent);
  }
  return rest;
}

/**
 * The 0-based column a list item's content lines start at: where its first
 * block starts when that is on the marker's line, else one past the marker.
 */
function listContentColumn(item: MdxNode, source: string): number | undefined {
  const start = item.position?.start;
  const first = item.children?.[0]?.position?.start;
  if (typeof start?.offset !== 'number') return undefined;
  if (first && first.line === start.line && typeof first.offset === 'number') {
    return visualColumn(source, first.offset);
  }
  const marker = /^(?:[-*+]|\d{1,9}[.)])/.exec(source.slice(start.offset, start.offset + 10));
  return marker ? visualColumn(source, start.offset) + marker[0].length + 1 : undefined;
}

/** The 0-based column of `offset` on its line, a tab counting to the next multiple of four. */
function visualColumn(source: string, offset: number): number {
  let p = offset;
  while (p > 0 && source[p - 1] !== '\n' && source[p - 1] !== '\r') p--;
  let col = 0;
  for (; p < offset; p++) col = source[p] === '\t' ? col + 4 - (col % 4) : col + 1;
  return col;
}

/**
 * `text`, which starts at column `col`, without the whitespace up to column
 * `target` (a tab running past it leaves its extra columns as spaces), or
 * undefined when it has less whitespace than that.
 */
function takeColumns(
  text: string,
  col: number,
  target: number
): { rest: string; col: number } | undefined {
  let c = col;
  let p = 0;
  while (c < target) {
    if (text[p] === ' ') {
      c++;
    } else if (text[p] === '\t') {
      const next = c + 4 - (c % 4);
      if (next > target)
        return { rest: ' '.repeat(next - target) + text.slice(p + 1), col: target };
      c = next;
    } else {
      return undefined;
    }
    p++;
  }
  return { rest: text.slice(p), col: c };
}
