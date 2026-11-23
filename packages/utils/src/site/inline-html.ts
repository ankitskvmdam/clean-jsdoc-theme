/**
 * Inline HTML that setu passes through to the page as lowercase MDX JSX, and
 * dwar treats as part of the surrounding text (#360).
 */

/**
 * Phrasing HTML elements with no Markdown form, kept as markup through setu's
 * HTML → mdast lowering instead of being flattened to their text (`H<sub>2</sub>O`
 * stays a subscript). setu emits a `<span>` only when it keeps an attribute
 * (`lang`, `dir`, `title`); a bare one is unwrapped. Elements that do have a
 * Markdown form (`<b>`, `<em>`, `<code>`, `<kbd>`, `<a>`, …) lower as before.
 */
export const PASSTHROUGH_INLINE_HTML: readonly string[] = [
  'sub',
  'sup',
  'abbr',
  'mark',
  'small',
  'ins',
  'u',
  'cite',
  'dfn',
  'time',
  'data',
  'bdi',
  'bdo',
  'ruby',
  'rt',
  'rp',
  'span',
];

/**
 * U+2060 WORD JOINER, appended by setu to a paragraph whose only content is JSX
 * elements and whitespace (`<mark>a</mark> <sub>b</sub>`). MDX unravels such a
 * paragraph — drops its `<p>` and the whitespace between the elements — before
 * any remark plugin runs; one invisible, non-whitespace character keeps it a
 * paragraph. dwar strips it from search text and excerpts.
 */
export const JSX_PARAGRAPH_GUARD = '\u2060';
