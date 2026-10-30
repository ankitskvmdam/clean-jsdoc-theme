/**
 * Angle-bracketed words in prose that are NOT markup — `Promise<User>`,
 * `Array<string>`, a generic `<T>` — and must stay visible as text.
 *
 * JSDoc's markdown plugin (and the Markdown → HTML lowering setu runs for docs
 * and TypeDoc comments) passes any `<Name>` through as a raw HTML tag. Handed to
 * the HTML parser, an unknown tag becomes an element that `hast-util-to-mdast`
 * unwraps, so the word silently vanishes ("Resolves to a Promise or Array"). It
 * can be worse when the name collides with a real element: `Array<Option>` opens
 * an `<option>` that swallows the rest of the paragraph (to-mdast ignores it),
 * `Array<title>` an RCDATA element that eats the rest of the page, and `Foo<P>`
 * closes the surrounding paragraph. So the decision has to be made on the RAW
 * string, before parsing, while the author's casing and spacing are still there.
 *
 * The rule, per tag, by the name as written:
 * - a lowercase HTML or custom element (`<kbd>`, `<br>`, `<my-widget>`) is
 *   markup — unless it is glued to a preceding word with no attributes, no
 *   closer and isn't void: `Promise<object>`, `Array<title>` are type arguments,
 *   `foo<br>` is still a line break;
 * - an ALL-CAPS element name of two or more letters is markup (`<BR>`,
 *   `<TABLE>`, `<DIV>`);
 * - a single capital letter that names an element is markup only with
 *   attributes or a closer (`<B>bold</B>`, `<A HREF="…">`, `<P ALIGN=center>`);
 *   alone (`<T>`, `<P>`, `<B>`) it is a generic, so literal;
 * - everything else is literal text: unknown names (`<User>`, `<string>`) and
 *   every other capitalized name, even an element's with attributes or a closer
 *   (`<Button variant="primary">…</Button>`, `<Option value>`, `<Img src>`,
 *   `<Div>`). Prose is lowered through HTML, never compiled as MDX, so a
 *   component tag in prose never rendered as a component — showing it is how
 *   component-library and TypeDoc docs mean it;
 * - the theme's containers (`<steps>`, `<tabs>`, …) are lifted out before this
 *   runs; a leftover lowercase one keeps its old handling (tag dropped, content
 *   kept), a capitalized one (`<Steps>` in a sentence) is literal.
 *
 * "A closer" means a balanced closing tag with the same spelling inside the same
 * block: before the next block boundary (an opening or closing `<p>`, `<li>`,
 * `<td>`, heading, … or a blank line). Every converted page has `</p>`, so a
 * closer anywhere later would make `List<a>` a link. Block elements pair among
 * themselves, except one opened inside another of its name (`<p>Array<p>…</p>`).
 * The one residual ambiguity:
 * a single-letter generic followed in the same block by a matching stray closer
 * (`Map<B> … </B>`) reads as markup.
 */

/**
 * Lowercase element names the HTML parser treats as markup: the current WHATWG
 * set, the SVG/MathML roots, and the legacy presentational elements old READMEs
 * still use. Obsolete parser oddities (`<image>` is rewritten to `<img>`,
 * `<element>`, `<content>`, `<command>`, …) are deliberately absent — nobody
 * authors them, while a type argument spelled that way is plausible.
 */
const HTML_ELEMENTS = new Set<string>([
  // WHATWG HTML
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'menu',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'search',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
  // Embedded vocabularies (their children are SVG/MathML, never reached here
  // as prose: to-mdast drops both subtrees whole).
  'svg',
  'math',
  // Legacy / presentational
  'acronym',
  'applet',
  'basefont',
  'bgsound',
  'big',
  'blink',
  'center',
  'dir',
  'font',
  'frame',
  'frameset',
  'keygen',
  'listing',
  'marquee',
  'menuitem',
  'nobr',
  'noembed',
  'noframes',
  'plaintext',
  'rb',
  'rtc',
  'strike',
  'tt',
  'xmp',
]);

/** Void elements: never closed, so "no closing tag" says nothing about them. */
const VOID_ELEMENTS = new Set<string>([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Block elements whose opening or closing tag ends the scope in which a closer
 * can match an opener (see the module comment).
 */
const BLOCK_BOUNDARIES = new Set<string>([
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'pre',
  'table',
  'td',
  'th',
  'tr',
  'ul',
]);

/** A blank line: a block boundary in Markdown-derived input. */
const BLANK_LINE = /\n[ \t]*\n/;

/** A valid custom element name (lowercased): starts with a letter, holds a `-`. */
const CUSTOM_ELEMENT = /^[a-z][a-z0-9]*-[a-z0-9._-]*$/;

/**
 * The theme's prose containers. `from-html.ts` lifts matched ones out before
 * conversion; an unmatched/degenerate one that reaches the HTML parser keeps its
 * long-standing behavior there (tag dropped, content kept) when lowercase.
 */
const THEME_CONTAINERS = new Set<string>(['steps', 'step', 'tabs', 'tab', 'playground']);

/** An identifier character right before `<` glues a tag to it: `Promise<object>`. */
const IDENT_CHAR = /[A-Za-z0-9_$]/;

/** A tag's name: an ASCII letter, then anything up to whitespace, `/`, `<` or `>`. */
const TAG_NAME = /<(\/?)([A-Za-z][^\s/<>]*)/y;

/** What follows a tag's name up to its `>` (quoted values may hold `>`). */
const TAG_REST = /(?:"[^"]*"|'[^']*'|[^<>"'])*/y;

/** One tag found in the input. */
interface Tag {
  /** Index of its `<`. */
  start: number;
  /** Index just past its name (where escaping resumes). */
  nameEnd: number;
  closing: boolean;
  /** The name as written. */
  name: string;
  /** Opener: anything but whitespace and `/` between the name and `>`. */
  hasAttributes: boolean;
  /** Opener: the character before `<` is an identifier character. */
  glued: boolean;
  /** Opener: index of its balanced closer in the same block (see module comment). */
  closer?: number;
  /** Closer: index of the opener it balances, if any. */
  opener?: number;
  /** Block opener: another of the same name was still open (see pairClosers). */
  nestedInSame?: boolean;
}

/**
 * Find every tag outside comments, in order. Comments are skipped whole
 * (`<!-->` and `<!--->` are complete, empty ones); an unterminated `<!--` runs to
 * the end of the input, as in HTML.
 */
function scanTags(html: string): Tag[] {
  const tags: Tag[] = [];
  let i = html.indexOf('<');
  while (i !== -1) {
    if (html.startsWith('<!--', i)) {
      const empty = /^<!---?>/.exec(html.slice(i, i + 6));
      let end: number;
      if (empty) {
        end = i + empty[0].length;
      } else {
        const close = html.indexOf('-->', i + 4);
        if (close === -1) break;
        end = close + 3;
      }
      i = html.indexOf('<', end);
      continue;
    }
    TAG_NAME.lastIndex = i;
    const m = TAG_NAME.exec(html);
    if (!m) {
      i = html.indexOf('<', i + 1);
      continue;
    }
    const nameEnd = i + m[0].length;
    TAG_REST.lastIndex = nameEnd;
    tags.push({
      start: i,
      nameEnd,
      closing: m[1] === '/',
      name: m[2],
      hasAttributes: /[^\s/]/.test(TAG_REST.exec(html)?.[0] ?? ''),
      glued: i > 0 && IDENT_CHAR.test(html[i - 1]),
    });
    i = html.indexOf('<', nameEnd);
  }
  return tags;
}

/**
 * Pair each closer with the nearest unclosed opener of the same spelling.
 *
 * Inline tags pair only within a block: a block boundary tag or a blank line
 * between tags resets their open set, so a `</a>` in the next paragraph can't
 * close a `List<a>`. Block tags pair among themselves across that (a glued
 * `item<blockquote>…</blockquote>` is real markup); one opened while another of
 * the same name is still open is flagged instead (`<p>Array<p> glued.</p>` —
 * HTML would close the outer paragraph there). Linear: every opener is pushed
 * and dropped at most once.
 */
function pairClosers(html: string, tags: Tag[]): void {
  const inline = new Map<string, number[]>();
  const block = new Map<string, number[]>();
  const pair = (stacks: Map<string, number[]>, tag: Tag, index: number): void => {
    const stack = stacks.get(tag.name);
    if (!tag.closing) {
      if (stack) stack.push(index);
      else stacks.set(tag.name, [index]);
    } else if (stack && stack.length > 0) {
      const opener = stack.pop()!;
      tags[opener].closer = index;
      tag.opener = opener;
    }
  };
  let prevEnd = 0;
  tags.forEach((tag, index) => {
    const between = html.slice(prevEnd, tag.start);
    prevEnd = tag.nameEnd;
    // A lone capital (`Props<P>`) is a generic, not a paragraph.
    const boundary = BLOCK_BOUNDARIES.has(tag.name.toLowerCase()) && isHtmlSpelling(tag.name);
    if (boundary || BLANK_LINE.test(between)) inline.clear();
    if (!boundary) {
      pair(inline, tag, index);
      return;
    }
    if (!tag.closing) tag.nestedInSame = (block.get(tag.name)?.length ?? 0) > 0;
    pair(block, tag, index);
  });
}

/** Lowercase, or ALL-CAPS of two or more letters: how HTML (not a type) is spelled. */
function isHtmlSpelling(name: string): boolean {
  return name === name.toLowerCase() || (name.length > 1 && name === name.toUpperCase());
}

/** Is this opening tag real markup (vs. a literal word such as a type argument)? */
function isMarkupOpenTag(tag: Tag): boolean {
  const { name, hasAttributes, glued } = tag;
  const hasCloser = tag.closer !== undefined && !tag.nestedInSame;
  const lower = name.toLowerCase();
  if (THEME_CONTAINERS.has(lower)) return name === lower;
  if (!HTML_ELEMENTS.has(lower) && !CUSTOM_ELEMENT.test(lower)) return false;
  if (name === lower) return hasAttributes || hasCloser || VOID_ELEMENTS.has(lower) || !glued;
  if (name === name.toUpperCase()) return name.length > 1 || hasAttributes || hasCloser;
  return false; // PascalCase / mixed case: a component or type name, shown as written
}

/**
 * Escape the `<` of every tag in `html` that is not real markup (see the module
 * comment for the rule), so the HTML parser reads `Promise<User>` as the text it
 * is. Only the opener is touched: the tag's `>` (and any attributes) then sit in
 * plain text, which is how the browser would show `&lt;User>` too. A closing tag
 * is kept when it balances an opener kept as markup, or is an element's spelled
 * as HTML (lowercase or ALL-CAPS — a stray `</p>`, `</DIV>`), and escaped
 * otherwise, so `<Foo>x</Foo>` reads back
 * verbatim. Inside an attribute value the entity decodes back to the same `<`;
 * code spans arrive entity-escaped, so they never match. Linear in the input.
 */
export function escapeLiteralTags(html: string): string {
  const tags = scanTags(html);
  pairClosers(html, tags);
  const markup = tags.map((tag) => !tag.closing && isMarkupOpenTag(tag));
  let out = '';
  let cursor = 0;
  tags.forEach((tag, index) => {
    if (tag.closing) {
      const lower = tag.name.toLowerCase();
      markup[index] =
        (tag.opener !== undefined && markup[tag.opener]) ||
        (tag.name === lower && THEME_CONTAINERS.has(lower)) ||
        (isHtmlSpelling(tag.name) && (HTML_ELEMENTS.has(lower) || CUSTOM_ELEMENT.test(lower)));
    }
    if (!markup[index]) {
      out += `${html.slice(cursor, tag.start)}&lt;${tag.closing ? '/' : ''}${tag.name}`;
      cursor = tag.nameEnd;
    }
  });
  return out + html.slice(cursor);
}
