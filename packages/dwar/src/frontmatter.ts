/**
 * Length of the leading YAML frontmatter block, 0 when there is none. Accepts
 * exactly what remark-frontmatter (micromark-extension-frontmatter) parses as a
 * `yaml` node, so the pre-passes, the search text and the rendered page agree:
 * `---` at offset 0 (after an optional BOM), a closing `---` on its own line,
 * spaces/tabs allowed after either fence, any line ending (LF, CRLF, CR), an
 * empty block, and a closer at end of input. A `---` inside a value, an
 * indented ` ---`, `----`, `--- x` and `...` do not close it; an unclosed block
 * is not frontmatter (MDX renders it as text). The returned length includes the
 * closing fence's line ending. Linear: one lazy scan, one bounded attempt per line.
 */
// The lazy `??` is load-bearing: a greedy `?` would let an empty block
// (`---\n---\n`) run on to a later `---` line in the body.
const FRONTMATTER =
  /^\uFEFF?---[ \t]*(?:\r\n?|\n)(?:[\s\S]*?(?:\r\n?|\n))??---[ \t]*(?:\r\n?|\n|$)/;

export function frontmatterLength(source: string): number {
  const fm = FRONTMATTER.exec(source);
  return fm ? fm[0].length : 0;
}
