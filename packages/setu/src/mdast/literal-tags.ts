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
 * A type argument never carries attributes and never has a closing tag, and it
 * sits glued to the type it parameterizes; real markup has at least one of the
 * first two, or is a lowercase element written as such. The rule, per tag:
 * - a name that is neither an HTML element nor a custom element
 *   (`<my-widget>`) — `<User>`, `<T>`, `<string>`, `<Callout>` — is literal
 *   (prose is lowered through HTML, never compiled as MDX, so a capitalized tag
 *   was never rendered as a component);
 * - an element name in any case with attributes or a matching closing tag
 *   (`<kbd>…</kbd>`, `<B>…</B>`, `<A HREF="…">`, `<Img src=…>`) is markup;
 * - otherwise a lowercase element is markup (`<br>`, an unclosed `<p>`), except
 *   one glued to a preceding identifier that isn't void — `Promise<object>`,
 *   `Array<title>` are type arguments, `foo<br>` is still a line break;
 * - otherwise an ALL-CAPS element name of two or more letters is markup
 *   (`<BR>`, `<HR>`, an unclosed `<LI>`), as is a mixed-case void element not
 *   glued to an identifier (`a <Br> b`); anything else — `<P>`, `<S>` or
 *   `<Option>` with no attributes and no closer — reads as a type argument, so
 *   literal;
 * - the theme's containers (`<steps>`, `<tabs>`, …) are lifted out before this
 *   runs; a leftover lowercase one keeps its old handling (tag dropped, content
 *   kept), a capitalized one (`<Steps>` in a sentence) is literal.
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

/** What the decision for one opening tag looks at. */
interface OpenTag {
  /** The name as written. */
  name: string;
  /** Anything but whitespace and `/` between the name and `>`. */
  hasAttributes: boolean;
  /** A closing tag spelled the same way appears later in the string. */
  hasCloser: boolean;
  /** The character before `<` is an identifier character. */
  glued: boolean;
}

/** Is this opening tag real markup (vs. a literal word such as a type argument)? */
function isMarkupOpenTag({ name, hasAttributes, hasCloser, glued }: OpenTag): boolean {
  const lower = name.toLowerCase();
  if (THEME_CONTAINERS.has(lower)) return name === lower;
  if (!HTML_ELEMENTS.has(lower) && !CUSTOM_ELEMENT.test(lower)) return false;
  // A type argument carries neither attributes nor a closing tag.
  if (hasAttributes || hasCloser) return true;
  const isVoid = VOID_ELEMENTS.has(lower);
  if (name === lower) return isVoid || !glued;
  if (name.length > 1 && name === name.toUpperCase()) return true;
  return isVoid && !glued;
}

/**
 * Escape the `<` of every tag in `html` that is not real markup (see the module
 * comment for the rule), so the HTML parser reads `Promise<User>` as the text it
 * is. Only the opener is touched: the tag's `>` (and any attributes) then sit in
 * plain text, which is how the browser would show `&lt;User>` too. A closing tag
 * is kept when it closes an opener kept as markup (or is a lowercase element's,
 * which was never in doubt) and escaped otherwise, so `<Foo>x</Foo>` reads back
 * verbatim. Comments are skipped whole (`<!-->` and `<!--->` included; an
 * unterminated one runs to the end, as in HTML); inside an attribute value the
 * entity decodes back to the same `<`; code spans arrive entity-escaped, so they
 * never match. Linear in the input.
 */
export function escapeLiteralTags(html: string): string {
  // Last index of each closing tag, by the name as written.
  const lastCloser = new Map<string, number>();
  for (const m of html.matchAll(/<\/([A-Za-z][^\s/<>]*)/g)) lastCloser.set(m[1], m.index);
  // Openers kept as markup and not yet closed, by the name as written.
  const open = new Map<string, number>();

  let out = '';
  let cursor = 0;
  let i = html.indexOf('<');
  while (i !== -1) {
    if (html.startsWith('<!--', i)) {
      // `<!-->` and `<!--->` are complete (empty) comments in HTML.
      const empty = /^<!---?>/.exec(html.slice(i, i + 6));
      let end: number;
      if (empty) {
        end = i + empty[0].length;
      } else {
        const close = html.indexOf('-->', i + 4);
        if (close === -1) break; // unterminated: a comment to the end of the input
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
    const [head, slash, name] = m;
    const after = i + head.length;
    let markup: boolean;
    if (slash) {
      const depth = open.get(name) ?? 0;
      if (depth > 0) open.set(name, depth - 1);
      const lower = name.toLowerCase();
      markup =
        depth > 0 ||
        (name === lower &&
          (HTML_ELEMENTS.has(lower) || THEME_CONTAINERS.has(lower) || CUSTOM_ELEMENT.test(lower)));
    } else {
      TAG_REST.lastIndex = after;
      const rest = TAG_REST.exec(html)?.[0] ?? '';
      markup = isMarkupOpenTag({
        name,
        hasAttributes: /[^\s/]/.test(rest),
        hasCloser: (lastCloser.get(name) ?? -1) > i,
        glued: i > 0 && IDENT_CHAR.test(html[i - 1]),
      });
      if (markup) open.set(name, (open.get(name) ?? 0) + 1);
    }
    if (!markup) {
      out += `${html.slice(cursor, i)}&lt;${slash}${name}`;
      cursor = after;
    }
    i = html.indexOf('<', after);
  }
  return out + html.slice(cursor);
}
