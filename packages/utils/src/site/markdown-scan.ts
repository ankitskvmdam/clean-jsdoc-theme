/**
 * Code-aware scanners for raw Markdown/MDX text, shared by setu (which splits
 * authoring containers out of raw prose) and dwar (whose MDX pre-pass drops
 * HTML comments). Both must agree on what is code and what is a comment, or a
 * comment setu left in place would be mis-handled by dwar and vice versa.
 */

/** A half-open `[start, end)` span of a string. */
export interface TextRange {
  start: number;
  end: number;
}

/** An HTML comment found by {@link htmlCommentRanges}. */
export interface HtmlCommentRange extends TextRange {
  /**
   * `false` for an opener with no valid `-->`: then the range covers just the
   * four-character `<!--`, which is literal text, not a comment.
   */
  closed: boolean;
}

// A fence opener: optional blockquote markers, indentation and one list marker
// (fences nest in quotes and list items), then a run of 3+ backticks or tildes.
// Indentation is not capped at three spaces so a fence inside a list item
// counts; the price is that a 4-space indented code block holding ``` is read
// as a fence, which only ever protects more text, never less.
const FENCE_OPEN_LINE = /^(?:[ \t]*>)*[ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_LINE = /^(?:[ \t]*>)*[ \t]*(`{3,}|~{3,})[ \t]*$/;

/**
 * Every fenced code block in `source`, from the start of its opening line to
 * the end of its closing line. CommonMark rules: the closer is a line holding
 * only a run of the SAME character at least as long as the opener's, so a
 * ```` fence (setu emits four backticks whenever the code contains ```) is not
 * closed by an inner ``` line; a backtick fence's info string may not contain a
 * backtick (```` ```x``` ```` on one line is inline code); and an unclosed
 * fence runs to the end of the input.
 */
export function fencedCodeRanges(source: string): TextRange[] {
  const out: TextRange[] = [];
  let open: { char: string; len: number; start: number } | undefined;
  let pos = 0;
  for (;;) {
    const nl = source.indexOf('\n', pos);
    const lineEnd = nl === -1 ? source.length : nl;
    const line = source.slice(pos, lineEnd).replace(/\r$/, '');
    if (open) {
      const close = FENCE_CLOSE_LINE.exec(line);
      if (close && close[1][0] === open.char && close[1].length >= open.len) {
        out.push({ start: open.start, end: lineEnd });
        open = undefined;
      }
    } else {
      const m = FENCE_OPEN_LINE.exec(line);
      if (m && !(m[1][0] === '`' && m[2].includes('`'))) {
        open = { char: m[1][0], len: m[1].length, start: pos };
      }
    }
    if (nl === -1) break;
    pos = nl + 1;
  }
  if (open) out.push({ start: open.start, end: source.length });
  return out;
}

// Tokens that can hide a `<!--` from the comment scan, then the comment opener
// itself (not backslash-escaped):
//   - an inline code span — CommonMark delimiter rules (a maximal run of N
//     backticks closes on a run of exactly N, `\`` is literal) and it never
//     crosses a blank line;
//   - an MDX JSX / HTML tag, whose quoted attribute values are literal strings;
//   - a link/image tail `](destination "title")` — MDX takes destinations and
//     titles verbatim, so `[a](http://x/<!--y-->z)` keeps its URL.
const TOKEN =
  /(?<![`\\])(`+)(?:[^\n]|\n(?![ \t\r]*\n))*?(?<![`\\])\1(?!`)|<\/?[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][\w-]*(?:="[^"]*")?)*\s*\/?>|\]\((?:<[^<>\n]*>|(?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))*)(?:\s+(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?\s*\)|(?<!\\)<!--/g;

// What may precede a comment opener on its line for it to start an HTML block
// (CommonMark type 2) rather than sit inline in a paragraph.
const BLOCK_PREFIX = /^(?:[ \t]*>)*[ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?$/;

/**
 * Every HTML comment in prose — outside fenced code, inline code, tags and link
 * destinations/titles — with CommonMark's extent:
 *   - one that starts a line (after any quote/list markers) is an HTML block
 *     and runs to the first `-->` anywhere, even across blank lines and fences
 *     (the usual way to comment out a whole section, code blocks included);
 *   - one inside a paragraph ends at the first `-->` before the paragraph does,
 *     so it may not cross a blank line or a fenced block;
 *   - `<!-->` and `<!--->` are complete empty comments.
 * An opener that finds no valid `-->` is reported with `closed: false`.
 */
export function htmlCommentRanges(source: string): HtmlCommentRange[] {
  const fences = fencedCodeRanges(source);
  const fenceContaining = (i: number): TextRange | undefined =>
    fences.find((f) => i >= f.start && i < f.end);
  const fenceStartingIn = (from: number, to: number): boolean =>
    fences.some((f) => f.start >= from && f.start < to);

  const out: HtmlCommentRange[] = [];
  const re = new RegExp(TOKEN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const start = m.index;
    const fence = fenceContaining(start);
    if (fence) {
      re.lastIndex = fence.end;
      continue;
    }
    if (m[0] !== '<!--') {
      // A span/tag/link that would reach into a fence is not one: the fence
      // ends the paragraph first. Rescan from the next character.
      if (fenceStartingIn(start, start + m[0].length)) re.lastIndex = start + 1;
      continue;
    }

    const openEnd = start + 4;
    const empty = /^-?>/.exec(source.slice(openEnd, openEnd + 2));
    let end = -1;
    if (empty) {
      end = openEnd + empty[0].length;
    } else {
      const close = source.indexOf('-->', openEnd);
      if (close !== -1) {
        const lineStart = source.lastIndexOf('\n', start - 1) + 1;
        const isBlock = BLOCK_PREFIX.test(source.slice(lineStart, start));
        const crossesParagraph =
          /\n[ \t\r]*\n/.test(source.slice(openEnd, close)) || fenceStartingIn(openEnd, close);
        if (isBlock || !crossesParagraph) end = close + 3;
      }
    }
    if (end === -1) {
      out.push({ start, end: openEnd, closed: false });
      re.lastIndex = openEnd;
    } else {
      out.push({ start, end, closed: true });
      re.lastIndex = end;
    }
  }
  return out;
}
