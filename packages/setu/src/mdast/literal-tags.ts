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
 * and `Foo<P>` closes the surrounding paragraph. So the decision has to be made
 * on the RAW string, before parsing, while the author's casing is still there.
 *
 * The rule, by the name as written:
 * - the theme's own authoring containers (`<steps>`, `<tabs>`, …, matched
 *   case-insensitively like the container pre-pass does) keep their old
 *   handling;
 * - a lowercase name that is an HTML element (`<kbd>`, `<sub>`, `<details>`,
 *   `<br>`, `<img>`) is markup, as is an ALL-CAPS one (`<BR>`, `<TABLE>`, the
 *   old-school spelling) of two or more letters;
 * - everything else is literal text: capitalized names (`<User>`, `<Object>`,
 *   `<Callout>` — prose is lowered through HTML, never compiled as MDX, so a
 *   capitalized tag was never rendered as a component), single capital letters (generic
 *   parameters `<T>`, `<P>`, `<S>` — even where `p`/`s`/`b` are elements), and
 *   lowercase non-elements (`<string>`, `<void>`, `<my-widget>`).
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

/**
 * The theme's prose containers. `from-html.ts` lifts matched ones out before
 * conversion (case-insensitively); an unmatched/degenerate one reaches the HTML
 * parser and keeps its long-standing behavior there (tag dropped, content kept).
 */
const THEME_CONTAINERS = new Set<string>(['steps', 'step', 'tabs', 'tab', 'playground']);

/** Is the tag name, as the author wrote it, real markup (vs. literal prose)? */
export function isMarkupTagName(name: string): boolean {
  const lower = name.toLowerCase();
  if (THEME_CONTAINERS.has(lower)) return true;
  if (!HTML_ELEMENTS.has(lower)) return false;
  if (name === lower) return true;
  // All-caps HTML (`<BR>`, `<TD>`) is markup; a lone capital is a generic.
  return name.length > 1 && name === name.toUpperCase();
}

/**
 * An HTML comment (left verbatim), or a tag opener: `<` or `</` plus the tag
 * name as the HTML tokenizer reads it (an ASCII letter, then anything up to
 * whitespace, `/` or `>`) — except that a `<` ends the name too, so each level
 * of a nested `Promise<Array<string>>` is judged (and escaped) on its own.
 */
const TAG_OPEN = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][^\s/<>]*)/g;

/**
 * Escape the `<` of every tag in `html` whose name is not markup (see
 * {@link isMarkupTagName}), so the HTML parser reads `Promise<User>` as the text
 * it is. Only the opener is touched: the tag's `>` (and any attributes) then sit
 * in plain text, which is how the browser would show `&lt;User>` too. Comments
 * are skipped whole; inside an attribute value the entity decodes back to the
 * same `<`; and code spans arrive entity-escaped, so they never match.
 */
export function escapeLiteralTags(html: string): string {
  return html.replace(TAG_OPEN, (match, slash: string | undefined, name: string | undefined) =>
    name === undefined || isMarkupTagName(name) ? match : `&lt;${slash}${name}`
  );
}
