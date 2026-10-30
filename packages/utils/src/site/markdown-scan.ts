/**
 * Code-aware scanners for raw Markdown/MDX text, shared by setu (which splits
 * authoring containers out of raw prose) and dwar (whose MDX pre-pass drops
 * HTML comments). Both must agree on what is code and what is a comment, or a
 * comment setu left in place would be mis-handled by dwar and vice versa.
 *
 * Both scanners run in linear-ish time — every page body passes through them
 * several times per build, and a pathological one (a stray `<!--` in a huge
 * generated page) must not stall it.
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

// Up to any number of blockquote markers (`>`), as a line prefix.
const QUOTE = String.raw`(?:[ \t]*>)*`;
// One list-item marker plus its following space.
const LIST_MARKER = String.raw`(?:[-*+]|\d{1,9}[.)])[ \t]+`;

// A fence opener: optional quote markers, indentation and one list marker
// (fences nest in quotes and list items), then a run of 3+ backticks or tildes.
// Indentation is not capped at three spaces so a fence inside a list item
// counts; the price is that a 4-space indented code block holding ``` is read
// as a fence, which only ever protects more text, never less.
const FENCE_OPEN_LINE = new RegExp(
  String.raw`^${QUOTE}[ \t]*(?:${LIST_MARKER})?(\`{3,}|~{3,})(.*)$`
);
const FENCE_CLOSE_LINE = new RegExp(String.raw`^${QUOTE}[ \t]*(\`{3,}|~{3,})[ \t]*$`);

// A line that starts an HTML-comment block (CommonMark HTML block type 2):
// `<!--` after nothing but quote/list markers and indentation. Group 1 is that
// prefix.
const COMMENT_BLOCK_LINE = new RegExp(String.raw`^(${QUOTE}[ \t]*(?:${LIST_MARKER})?)<!--`);

// Lines that end a paragraph (so an inline comment can't run past them): blank
// (also inside a quote), an ATX heading, a thematic break, a list item.
const HARD_INTERRUPT_LINE = new RegExp(
  [
    String.raw`^${QUOTE}[ \t]*$`,
    String.raw`^${QUOTE}[ \t]{0,3}#{1,6}(?:[ \t]|$)`,
    String.raw`^${QUOTE}[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$`,
    String.raw`^${QUOTE}[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)`,
  ].join('|')
);
// A blockquote line ends a paragraph that is NOT itself in a quote (inside a
// quote, the next `>` line is just the paragraph's continuation).
const QUOTE_LINE = /^[ \t]{0,3}>/;

/** Block-level structure of a source: fences, comment blocks, paragraph breaks. */
interface BlockScan {
  fences: TextRange[];
  /** Comments that start a line (closed or not), in source order. */
  blockComments: HtmlCommentRange[];
  /** Sorted start offsets of lines that end any paragraph. */
  hardBreaks: number[];
  /** Sorted start offsets of `>` lines (end a paragraph that isn't quoted). */
  quoteLines: number[];
}

/**
 * Finds the next `-->` at or after a position, for non-decreasing positions,
 * reusing the last answer while it is still ahead — one `indexOf` per closer
 * found instead of one per opener, so a page full of stray `<!--` stays linear.
 */
function closerFinder(source: string): (from: number) => number {
  let at = -2;
  return (from) => {
    if (at === -1) return -1;
    if (at < from) at = source.indexOf('-->', from);
    return at;
  };
}

/**
 * One ordered pass over the lines, per CommonMark block parsing: a fence opens
 * only outside a comment block, and a comment block (a line starting `<!--`)
 * opens only outside a fence and runs through the line holding its `-->` — so
 * a lone fence line inside a comment is not a fence.
 */
function scanBlocks(source: string): BlockScan {
  const fences: TextRange[] = [];
  const blockComments: HtmlCommentRange[] = [];
  const hardBreaks: number[] = [];
  const quoteLines: number[] = [];
  const nextCloser = closerFinder(source);

  let fence: { char: string; len: number; start: number } | undefined;
  let pos = 0;
  while (pos <= source.length) {
    const nl = source.indexOf('\n', pos);
    const lineEnd = nl === -1 ? source.length : nl;
    const line = source.slice(pos, lineEnd).replace(/\r$/, '');
    let next = nl === -1 ? source.length + 1 : nl + 1;

    if (fence) {
      const close = FENCE_CLOSE_LINE.exec(line);
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) {
        fences.push({ start: fence.start, end: lineEnd });
        fence = undefined;
      }
    } else {
      const open = FENCE_OPEN_LINE.exec(line);
      const comment = open ? null : COMMENT_BLOCK_LINE.exec(line);
      if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
        fence = { char: open[1][0], len: open[1].length, start: pos };
        hardBreaks.push(pos);
      } else if (comment) {
        hardBreaks.push(pos);
        const start = pos + comment[1].length;
        const openEnd = start + 4;
        const empty = /^-?>/.exec(source.slice(openEnd, openEnd + 2));
        const closer = empty ? -1 : nextCloser(openEnd);
        if (empty) {
          blockComments.push({ start, end: openEnd + empty[0].length, closed: true });
        } else if (closer === -1) {
          blockComments.push({ start, end: openEnd, closed: false });
        } else {
          blockComments.push({ start, end: closer + 3, closed: true });
          // The block ends with the line holding `-->`; whatever follows the
          // closer on that line is left to the inline scan.
          const closeLineEnd = source.indexOf('\n', closer + 3);
          next = closeLineEnd === -1 ? source.length + 1 : closeLineEnd + 1;
        }
      } else if (HARD_INTERRUPT_LINE.test(line)) {
        hardBreaks.push(pos);
      } else if (QUOTE_LINE.test(line)) {
        quoteLines.push(pos);
      }
    }
    pos = next;
  }
  if (fence) fences.push({ start: fence.start, end: source.length });
  return { fences, blockComments, hardBreaks, quoteLines };
}

/** First value in sorted `arr` strictly greater than `x`, or `Infinity`. */
function firstAfter(arr: readonly number[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo < arr.length ? arr[lo] : Infinity;
}

/**
 * The range in `ranges` — sorted by `start`, non-overlapping, as both scanners
 * here return them — that contains `pos`, by binary search (callers test many
 * positions against many ranges; a linear `find` per position is quadratic).
 */
export function rangeContaining<T extends TextRange>(
  ranges: readonly T[],
  pos: number
): T | undefined {
  let lo = 0;
  let hi = ranges.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ranges[mid].end <= pos) lo = mid + 1;
    else hi = mid;
  }
  const hit = ranges[lo];
  return hit && hit.start <= pos ? hit : undefined;
}

/**
 * Every fenced code block in `source`, from the start of its opening line to
 * the end of its closing line. CommonMark rules: the closer is a line holding
 * only a run of the SAME character at least as long as the opener's, so a
 * ```` fence (setu emits four backticks whenever the code contains ```) is not
 * closed by an inner ``` line; a backtick fence's info string may not contain a
 * backtick (```` ```x``` ```` on one line is inline code); an unclosed fence
 * runs to the end of the input; and a fence line inside an HTML-comment block
 * is not a fence.
 */
export function fencedCodeRanges(source: string): TextRange[] {
  return scanBlocks(source).fences;
}

// Tokens that can hide a `<!--` from the inline comment scan, then the comment
// opener itself (not backslash-escaped):
//   - an inline code span — CommonMark delimiter rules (a maximal run of N
//     backticks closes on a run of exactly N, `\`` is literal) and it never
//     crosses a blank line;
//   - an MDX JSX / HTML tag, whose quoted attribute values are literal strings;
//   - a link/image tail `](destination "title")` — MDX takes destinations and
//     titles verbatim, so `[a](http://x/<!--y-->z)` keeps its URL (an escaped
//     `\]` closes no link, so it protects nothing).
const TOKEN =
  /(?<![`\\])(`+)(?:[^\n]|\n(?![ \t\r]*\n))*?(?<![`\\])\1(?!`)|<\/?[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][\w-]*(?:="[^"]*")?)*\s*\/?>|(?<!\\)\]\((?:<[^<>\n]*>|(?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))*)(?:\s+(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?\s*\)|(?<!\\)<!--/g;

/**
 * Every HTML comment in prose — outside fenced code, inline code, tags and link
 * destinations/titles — with CommonMark's extent:
 *   - one that starts a line (after any quote/list markers) is an HTML block
 *     and runs to the first `-->` anywhere, even across blank lines and fences
 *     (the usual way to comment out a whole section, code blocks included);
 *   - one inside a paragraph ends at the first `-->` before the paragraph does,
 *     so it may not cross a blank line, heading, thematic break, list item,
 *     fence or (outside a quote) a `>` line;
 *   - `<!-->` and `<!--->` are complete empty comments.
 * An opener that finds no valid `-->` is reported with `closed: false`.
 */
export function htmlCommentRanges(source: string): HtmlCommentRange[] {
  const { fences, blockComments, hardBreaks, quoteLines } = scanBlocks(source);
  // Fences and comment blocks never overlap (one pass decided both), so one
  // sorted list of regions the inline scan must skip, walked with a pointer.
  const regions: HtmlCommentRange[] = [
    ...fences.map((f) => ({ ...f, closed: true })),
    ...blockComments,
  ].sort((a, b) => a.start - b.start);
  let r = 0;
  const nextCloser = closerFinder(source);
  // Start of the line holding a position, for non-decreasing positions: walks
  // newlines forward once overall (a backwards search per opener would be
  // quadratic on one huge line full of openers).
  let lineStart = 0;
  let nextNl = source.indexOf('\n');
  const lineStartOf = (pos: number): number => {
    while (nextNl !== -1 && nextNl < pos) {
      lineStart = nextNl + 1;
      nextNl = source.indexOf('\n', lineStart);
    }
    return lineStart;
  };

  const out: HtmlCommentRange[] = [];
  let b = 0;
  const flushBlocksBefore = (pos: number): void => {
    while (b < blockComments.length && blockComments[b].start < pos) out.push(blockComments[b++]);
  };

  const re = new RegExp(TOKEN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const start = m.index;
    while (r < regions.length && regions[r].end <= start) r++;
    const region = regions[r];
    if (region && region.start <= start) {
      re.lastIndex = Math.max(region.end, start + 1);
      continue;
    }
    if (m[0] !== '<!--') {
      // A span/tag/link that would reach into a fence or comment block is not
      // one: that block ends the paragraph first. Rescan from the next char.
      if (region && region.start < start + m[0].length) re.lastIndex = start + 1;
      continue;
    }

    const openEnd = start + 4;
    const empty = /^-?>/.exec(source.slice(openEnd, openEnd + 2));
    let end = -1;
    if (empty) {
      end = openEnd + empty[0].length;
    } else {
      const closer = nextCloser(openEnd);
      if (closer !== -1) {
        const from = lineStartOf(start);
        const quoted = QUOTE_LINE.test(source.slice(from, Math.min(from + 4, start)));
        const paragraphEnd = Math.min(
          firstAfter(hardBreaks, start),
          quoted ? Infinity : firstAfter(quoteLines, start),
          region ? region.start : Infinity
        );
        if (closer + 3 <= paragraphEnd) end = closer + 3;
      }
    }
    flushBlocksBefore(start);
    if (end === -1) {
      out.push({ start, end: openEnd, closed: false });
      re.lastIndex = openEnd;
    } else {
      out.push({ start, end, closed: true });
      re.lastIndex = end;
    }
  }
  flushBlocksBefore(Infinity);
  return out;
}
