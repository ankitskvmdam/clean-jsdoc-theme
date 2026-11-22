/**
 * Code-aware scanners for raw Markdown/MDX text, shared by setu (which splits
 * authoring containers out of raw prose) and dwar (whose MDX pre-pass drops
 * HTML comments). Both must agree on what is code and what is a comment, or a
 * comment setu left in place would be mis-handled by dwar and vice versa.
 *
 * Both scanners run in linear time — every page body passes through them
 * several times per build, and a pathological one (a stray `<!--` in a huge
 * generated page) must not stall it — and a body without `<!--` costs one
 * `includes`.
 *
 * Each format has ONE definition of a comment: {@link htmlCommentRanges} for
 * Markdown (code-aware) and {@link htmlCommentRangesInHtml} for raw HTML;
 * {@link replaceHtmlComments} and {@link maskHtmlComments} drop, rewrite or
 * blank out what either one found.
 */

/** A half-open `[start, end)` span of a string. */
export interface TextRange {
  start: number;
  end: number;
}

/** An HTML comment found by {@link htmlCommentRanges} or {@link htmlCommentRangesInHtml}. */
export interface HtmlCommentRange extends TextRange {
  /**
   * `false` for an opener with no valid `-->`: then the range covers just the
   * four-character `<!--`, which is literal text, not a comment.
   */
  closed: boolean;
}

// Every pattern here is a regex literal (or built on first use): this module is
// re-exported from the package root, which rang imports into the browser island
// bundle, and a bundler keeps a module-level `new RegExp(…)` (a call, so a
// possible side effect) even when nothing uses it — a literal it can drop.

// Blockquote markers opening a line, each `>` with up to three spaces before
// it and one optional space after. Its `>` count is the line's quote depth.
const QUOTE_PREFIX = /^(?:[ \t]{0,3}>[ \t]?)*/;

// FENCE_OPEN and COMMENT_BLOCK both start with indentation and an optional
// list marker plus its following space(s): `(?:[-*+]|\d{1,9}[.)])[ \t]+`.
//
// On a line with its quote prefix removed: a fence opener — indentation and an
// optional list marker (fences nest in list items), then 3+ backticks or
// tildes. Group 1 is everything before the fence run: its column width is the
// content column the closer's indent is measured from (so for a top-level
// opener indented 1-3 columns, the closer indent is measured from the opener's
// prefix — CommonMark measures from the container; this only ever reads a
// little more as prose, never feeds a code block's comment to MDX). Outside a
// paragraph indentation is not capped, so a fence deep in a list item counts;
// the price is that a 4-space indented code block holding ``` reads as a
// fence, which only ever protects more text, never less.
// (`[^\n]*`, not `.*`: a line may hold a bare `\r` or a U+2028/U+2029, which
// `.` does not match — the same goes for LIST_ITEM.)
const FENCE_OPEN = /^([ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?)(`{3,}|~{3,})([^\n]*)$/;
// A fence closer: a run of the opener's character at least as long, then only
// whitespace. Group 1 is its indentation.
const FENCE_CLOSE = /^([ \t]*)(`{3,}|~{3,})[ \t]*$/;
// An HTML-comment block (CommonMark HTML block type 2): `<!--` after nothing
// but indentation and a list marker. Group 1 is that prefix.
const COMMENT_BLOCK = /^([ \t]*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?)<!--/;

// The rest are tested on a line with its quote prefix AND indentation removed.
const ATX_HEADING = /^#{1,6}(?:[ \t]|$)/;
const SETEXT_UNDERLINE = /^(?:=+|-+)[ \t]*$/;
// A list item: group 1 the marker, group 2 the spaces after it, group 3 text.
const LIST_ITEM = /^([-*+]|\d{1,9}[.)])([ \t]+|$)([^\n]*)$/;
// HTML blocks that may interrupt a paragraph (CommonMark start conditions 1-6;
// condition 7, any other tag, may not). Built on first use from the type-6 tag
// names (see the note at the top).
let htmlBlockStart: RegExp | undefined;
function htmlBlockStartRe(): RegExp {
  return (htmlBlockStart ??= new RegExp(
    String.raw`^(?:<(?:script|pre|style|textarea)(?:[ \t>]|$)|<\?|<![A-Za-z]|<!\[CDATA\[|</?(?:` +
      [
        'address',
        'article',
        'aside',
        'base',
        'basefont',
        'blockquote',
        'body',
        'caption',
        'center',
        'col',
        'colgroup',
        'dd',
        'details',
        'dialog',
        'dir',
        'div',
        'dl',
        'dt',
        'fieldset',
        'figcaption',
        'figure',
        'footer',
        'form',
        'frame',
        'frameset',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'head',
        'header',
        'hr',
        'html',
        'iframe',
        'legend',
        'li',
        'link',
        'main',
        'menu',
        'menuitem',
        'nav',
        'noframes',
        'ol',
        'optgroup',
        'option',
        'p',
        'param',
        'search',
        'section',
        'summary',
        'table',
        'tbody',
        'td',
        'tfoot',
        'th',
        'thead',
        'title',
        'tr',
        'track',
        'ul',
      ].join('|') +
      String.raw`)(?:[ \t>]|/>|$))`,
    'i'
  ));
}

/** Column width of a run of spaces/tabs (tabs stop every four columns). */
function columns(ws: string): number {
  let n = 0;
  for (const ch of ws) n = ch === '\t' ? n + 4 - (n % 4) : n + 1;
  return n;
}

/** A line split into its blockquote markers, indentation and the rest. */
interface LineParts {
  /** The quote prefix ({@link QUOTE_PREFIX}). */
  quote: string;
  /** Its `>` count: the line's quote depth. */
  depth: number;
  /** The spaces/tabs after the quote prefix. */
  ws: string;
  /** Their column width. */
  indent: number;
  /** The line after both. */
  rest: string;
}

function lineParts(line: string): LineParts {
  const quote = QUOTE_PREFIX.exec(line)![0];
  let depth = 0;
  for (const ch of quote) if (ch === '>') depth++;
  const body = line.slice(quote.length);
  const ws = /^[ \t]*/.exec(body)![0];
  return { quote, depth, ws, indent: columns(ws), rest: body.slice(ws.length) };
}

/**
 * What dwar's `stripHtmlComments` keeps of a later line of a multi-line comment
 * block opened at quote depth `depth`: the line's quote markers and
 * indentation, or — when it is quoted deeper — just its first `depth` markers
 * (each with the one space it may take).
 */
function blockContinuationPrefix(line: string, depth: number): string {
  const p = lineParts(line);
  if (p.depth <= depth) return p.quote + p.ws;
  let i = 0;
  for (let d = 0; d < depth; d++) {
    i = p.quote.indexOf('>', i) + 1;
    if (p.quote[i] === ' ' || p.quote[i] === '\t') i++;
  }
  return p.quote.slice(0, i);
}

// The two line tests below are written out by hand: as regexes
// (`^([-*_])(?:[ \t]*\1){2,}[ \t]*$` and
// `^\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$`) V8 runs out of
// stack on a single line of a few megabytes (`--- --- …`, `|---|---|…`) and
// throws. Each is one linear pass over the line.

/** Whether `s` holds nothing but spaces and tabs from `i` on. */
function blankFrom(s: string, i: number): boolean {
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  return i === s.length;
}

/**
 * A thematic break (on a line with its quote prefix and indentation removed):
 * three or more of the same `-`, `*` or `_`, with only spaces or tabs between
 * and after them.
 */
function isThematicBreak(rest: string): boolean {
  const ch = rest[0];
  if (ch !== '-' && ch !== '*' && ch !== '_') return false;
  let count = 0;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === ch) count++;
    else if (rest[i] !== ' ' && rest[i] !== '\t') return false;
  }
  return count >= 3;
}

/**
 * A GFM table delimiter row (on a line with its quote prefix and indentation
 * removed): cells of dashes with optional alignment colons (`:?-+:?`), split by
 * pipes, with an optional pipe opening and closing the row and spaces or tabs
 * around each cell.
 */
function isTableDelimiter(rest: string): boolean {
  const n = rest.length;
  let i = rest[0] === '|' ? 1 : 0;
  for (;;) {
    while (i < n && (rest[i] === ' ' || rest[i] === '\t')) i++;
    // A cell: `:?-+:?`.
    if (rest[i] === ':') i++;
    const dashes = i;
    while (rest[i] === '-') i++;
    if (i === dashes) return false;
    if (rest[i] === ':') i++;
    while (i < n && (rest[i] === ' ' || rest[i] === '\t')) i++;
    if (i === n) return true;
    if (rest[i] !== '|') return false;
    i++;
    // A pipe closing the row.
    if (blankFrom(rest, i)) return true;
  }
}

/**
 * The number of cells in a GFM table row: its unescaped pipes split it, and a
 * pipe opening or closing the row only bounds it. (Pipes split cells even
 * inside a code span, as GFM has it.)
 */
function tableCells(row: string): number {
  const text = row.trim();
  let pipes = 0;
  let last = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === '|') {
      pipes++;
      last = i;
    }
  }
  let cells = pipes + 1;
  if (text.startsWith('|')) cells--;
  if (last === text.length - 1 && last > 0) cells--;
  return cells;
}

/**
 * Whether `text` (a paragraph line, no newline) is the header row of a table
 * whose delimiter row has `cells` cells. Either its raw cell count matches, or
 * the count of the line as MDX reads it when it starts a table: each comment
 * that opens and closes on the line is dropped by dwar, pipes included, and
 * leaves an expression behind — a cell's worth of text, never a pipe (so the
 * stand-in is `x`, not blanks: `<!-- c --> | a | b` is three cells to MDX).
 *
 * The comments are found by {@link htmlCommentRanges} on the line alone, so
 * there is one definition of a comment. That nested scan cannot recurse — the
 * line has no newline, so its `scanBlocks` never reaches a header check — and
 * it is done with the shared `TOKEN` regex before the outer scan resets
 * `TOKEN.lastIndex` and starts its own loop.
 */
function isTableHeader(text: string, cells: number): boolean {
  if (tableCells(text) === cells) return true;
  if (!text.includes('<!--')) return false;
  const seen = replaceHtmlComments(text, htmlCommentRanges(text), (c, raw) =>
    c.closed ? 'x' : raw
  );
  return tableCells(seen) === cells;
}

/** Block-level structure of a source: fences, comment blocks, paragraph breaks. */
interface BlockScan {
  fences: TextRange[];
  /** Comment blocks (all closed; see `scanBlocks`), in source order. */
  blockComments: HtmlCommentRange[];
  /**
   * Comments that start a line of text — no block, as MDX reads the line — in
   * source order: one that closes on its line with text after it, or an
   * unclosed opener (covering just the `<!--`).
   */
  lineComments: HtmlCommentRange[];
  /** Sorted start offsets of lines that end the paragraph before them. */
  breaks: number[];
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
 * Finds where the inline code span opened by the backtick run `[start, end)`
 * ends, or -1 when the run opens none, for runs at increasing positions.
 * CommonMark: a run of N backticks closes on the next maximal run of exactly N
 * (backslashes are literal INSIDE a span, so `a\` closes on the backtick after
 * the backslash); a run with no closer is literal backticks. A span may not
 * cross a blank line either, but that is the caller's check: every blank line
 * outside a fence or comment block is one of `scanBlocks`' paragraph breaks,
 * which `htmlCommentRanges` already tests each span against.
 *
 * Linear in the source however the runs fall: the maximal runs are collected
 * once, on the first call, and grouped by length, and each length keeps a
 * cursor that only moves forward — so an unclosed run costs one step past each
 * later run of its own length, never a rescan of the paragraph (a regex closer
 * search rescans it once per unclosed run, and once more per shorter length).
 *
 * Runs inside the sorted, disjoint `ignore` ranges (comments dwar drops before
 * MDX reads the text) are not runs at all.
 */
function codeSpanFinder(
  source: string,
  ignore: readonly TextRange[] = []
): (start: number, end: number) => number {
  let runsByLength: Map<number, number[]> | undefined;
  const cursors = new Map<number, number>();
  return (start, end) => {
    if (!runsByLength) {
      runsByLength = new Map();
      const run = /`+/g;
      let g = 0;
      for (let m = run.exec(source); m !== null; m = run.exec(source)) {
        while (g < ignore.length && ignore[g].end <= m.index) g++;
        if (g < ignore.length && ignore[g].start <= m.index) continue;
        const runs = runsByLength.get(m[0].length);
        if (runs) runs.push(m.index);
        else runsByLength.set(m[0].length, [m.index]);
      }
    }
    const len = end - start;
    const runs = runsByLength.get(len);
    if (!runs) return -1;
    let c = cursors.get(len) ?? 0;
    while (c < runs.length && runs[c] < end) c++;
    cursors.set(len, c);
    if (c === runs.length) return -1;
    return runs[c] + len;
  };
}

/** An inline code span found by {@link inlineCodeSpans}. */
export interface CodeSpanRange extends TextRange {
  /** Length of each delimiter run; the content is `[start + ticks, end - ticks)`. */
  ticks: number;
}

/**
 * Every inline code span in a stretch of prose, in source order, by CommonMark's
 * rules: a backtick run opens a span only if the next maximal run of exactly
 * its length closes it before a blank line; a run with no closer is literal
 * backticks, all of them (a shorter run inside it is never tried). A backslash
 * escapes the character after it outside a span, so `` \` `` opens nothing and
 * `` \\` `` is an escaped backslash then a real opener; inside a span a
 * backslash is literal, so `` `a\` `` closes on the backtick after it.
 *
 * An inline-only scan: the caller removes fenced code and comments first.
 * Linear in the source however the runs fall (see `codeSpanFinder`).
 */
export function inlineCodeSpans(source: string): CodeSpanRange[] {
  if (!source.includes('`')) return [];
  const spanEnd = codeSpanFinder(source);
  // The next blank line at or after a position, for non-decreasing positions
  // (like `closerFinder`): -1 once there is none.
  const blank = /\n[ \t\r]*\n/g;
  let blankAt = -2;
  const nextBlank = (from: number): number => {
    if (blankAt === -1 || blankAt >= from) return blankAt;
    blank.lastIndex = from;
    const m = blank.exec(source);
    blankAt = m ? m.index : -1;
    return blankAt;
  };

  const out: CodeSpanRange[] = [];
  const token = /\\[^\n]|`+/g;
  let m: RegExpExecArray | null;
  while ((m = token.exec(source)) !== null) {
    if (m[0][0] !== '`') continue;
    const start = m.index;
    const runEnd = start + m[0].length;
    const end = spanEnd(start, runEnd);
    if (end === -1) continue;
    const blankLine = nextBlank(runEnd);
    if (blankLine !== -1 && blankLine < end) continue;
    out.push({ start, end, ticks: runEnd - start });
    token.lastIndex = end;
  }
  return out;
}

/**
 * One ordered pass over the lines, per CommonMark block parsing:
 *   - a fence opens only outside a comment block, and closes on a long-enough
 *     run of its character at the same quote depth, indented at most three
 *     columns past the opener's prefix — or when the blockquote it opened in
 *     ends; a fence in a list item also ends when a non-blank line is indented
 *     less than the item's content;
 *   - a comment block (a line starting `<!--`) opens only outside a fence and
 *     runs through the line holding its `-->`, so a fence line inside one is
 *     not a fence. The rules follow MDX, which reads the page once dwar has
 *     dropped the comment: text after a `-->` on a later line opens a
 *     paragraph, and a line where the comment closes with text after it, or
 *     whose `<!--` is unclosed (literal), is no comment block at all but a
 *     line of text like any other — it may continue the paragraph above it;
 *   - a line ends the paragraph before it (a "break", where an inline comment
 *     must stop) only if CommonMark lets it interrupt a paragraph: blank, an
 *     ATX heading, a thematic break or (in the paragraph's own container, not
 *     on a lazy line) a setext underline, a fence, a comment or
 *     other HTML block of kinds 1-6, a bullet item or an ordered item starting
 *     at 1 (non-empty), or a deeper blockquote — and never when indented four
 *     or more columns past the paragraph's own content (that is continuation
 *     text). A shallower quote depth is a lazy continuation, not a break;
 *   - a GFM table (a paragraph line followed by a delimiter row with as many
 *     cells) breaks at every one of its rows, so an inline comment can't span
 *     two rows — each row is its own block. The header row interrupts the
 *     paragraph above it; the table ends at a blank line or a line that starts
 *     another block (any list item, a quote of another depth, a heading, a
 *     fence, …), or — inside a list item — at a line indented less than the
 *     item's content. A row indented four or more columns stays in the table:
 *     MDX, which renders these pages, has no indented code (GFM would end the
 *     table there). The header row's cells are counted on the raw line, or on
 *     the line as MDX reads it once dwar drops each comment that opens and
 *     closes on it (pipes inside included) — either count matching makes a
 *     table. A table declared where MDX sees none only adds breaks, so a
 *     comment there stays open (literal `\<!--` at worst), never an error.
 */
function scanBlocks(source: string): BlockScan {
  const fences: TextRange[] = [];
  const blockComments: HtmlCommentRange[] = [];
  const lineComments: HtmlCommentRange[] = [];
  const breaks: number[] = [];
  const nextCloser = closerFinder(source);

  let fence:
    | {
        char: string;
        len: number;
        start: number;
        depth: number;
        /** Columns before the fence run on the opener line (indentation + list marker). */
        indent: number;
        /** Opened on a list-item line: a less-indented line leaves the item and ends it. */
        inItem: boolean;
      }
    | undefined;
  // The open paragraph, if any: its content column and quote depth, and
  // whether it is a list item's first paragraph (its column is then the item's).
  let para: { indent: number; depth: number; inItem?: boolean } | undefined;
  // The open GFM table, if any: its quote depth, content column, whether it
  // sits in a list item, and where its delimiter row starts.
  let table: { depth: number; indent: number; inItem: boolean; delim: number } | undefined;
  let pos = 0;
  while (pos <= source.length) {
    const nl = source.indexOf('\n', pos);
    const lineEnd = nl === -1 ? source.length : nl;
    const line = source.slice(pos, lineEnd).replace(/\r$/, '');
    let next = nl === -1 ? source.length + 1 : nl + 1;

    const { quote, depth, indent, rest } = lineParts(line);
    const body = line.slice(quote.length);

    // A fence opened inside a blockquote ends with the quote.
    if (fence && depth < fence.depth) {
      fences.push({ start: fence.start, end: pos - 1 });
      fence = undefined;
    }

    if (fence) {
      if (fence.inItem && depth === fence.depth && rest !== '' && indent < fence.indent) {
        // A non-blank line indented less than the item's content column leaves
        // the list item, and the fence with it (fenced code has no lazy
        // continuation). The line is then read afresh — it may open a new fence.
        fences.push({ start: fence.start, end: pos - 1 });
        fence = undefined;
      } else {
        // The closer sits at the fence's own quote depth (a deeper quote line is
        // content) and is indented at most three columns past the content
        // column the opener set (CommonMark): `- ```` closes at columns 2–5, a
        // bare ``` at 0–3.
        const close = depth === fence.depth ? FENCE_CLOSE.exec(body) : null;
        if (
          close &&
          close[2][0] === fence.char &&
          close[2].length >= fence.len &&
          columns(close[1]) <= fence.indent + 3
        ) {
          fences.push({ start: fence.start, end: lineEnd });
          fence = undefined;
        }
        pos = next;
        continue;
      }
    }

    if (rest === '') {
      breaks.push(pos);
      para = undefined;
      table = undefined;
      pos = next;
      continue;
    }

    const open = FENCE_OPEN.exec(body);
    // A comment starting the line: a comment block, unless MDX reads the line
    // as text — when dwar leaves text on it, after the `{/**/}` of a comment
    // that closes on the line, or after the `\<!--` of one left unclosed. Such
    // a line is read like any other (it may continue the paragraph above, or
    // be a table row), and its comment is a line comment.
    let comment: TextRange | undefined;
    const commentOpen = open ? null : COMMENT_BLOCK.exec(body);
    if (commentOpen) {
      const start = pos + quote.length + commentOpen[1].length;
      const openEnd = start + 4;
      const empty = /^-?>/.exec(source.slice(openEnd, openEnd + 2));
      const closer = empty ? -1 : nextCloser(openEnd);
      const end = empty ? openEnd + empty[0].length : closer === -1 ? -1 : closer + 3;
      if (end === -1) lineComments.push({ start, end: openEnd, closed: false });
      else if (end <= lineEnd && source.slice(end, lineEnd).trim() !== '') {
        lineComments.push({ start, end, closed: true });
      } else comment = { start, end };
    }
    const item = LIST_ITEM.exec(rest);

    if (table) {
      const row =
        pos === table.delim ||
        (depth === table.depth &&
          !(table.inItem && indent < table.indent) &&
          !open &&
          !comment &&
          !item &&
          !ATX_HEADING.test(rest) &&
          !isThematicBreak(rest) &&
          !htmlBlockStartRe().test(rest));
      // Every row is its own block; the line that ends the table starts one.
      breaks.push(pos);
      para = undefined;
      if (row) {
        pos = next;
        continue;
      }
      table = undefined;
    }

    // Inside a paragraph, indentation counts from the paragraph's content
    // column (a list item's text); four or more columns past it, or past the
    // margin when the line is outdented, is plain continuation text.
    const relIndent = para && indent >= para.indent ? indent - para.indent : indent;
    if (para && relIndent >= 4) {
      pos = next;
      continue;
    }

    // The text of a line that holds a paragraph's first or later line, which a
    // delimiter row below would make a table's header row.
    let paraText: string | undefined;
    if (open && !(open[2][0] === '`' && open[3].includes('`'))) {
      fence = {
        char: open[2][0],
        len: open[2].length,
        start: pos,
        depth,
        indent: columns(open[1]),
        inItem: /[^ \t]/.test(open[1]),
      };
      breaks.push(pos);
      para = undefined;
    } else if (comment) {
      breaks.push(pos);
      para = undefined;
      blockComments.push({ ...comment, closed: true });
      if (comment.end > lineEnd) {
        // The block ends with the line holding `-->`; whatever follows the
        // closer on that line is left to the inline scan. MDX reads it as a
        // paragraph: dwar blanks the lines in between, each keeping its
        // prefix, so the text starts one after the closer line's prefix.
        const closeLine = source.lastIndexOf('\n', comment.end - 1) + 1;
        const closeLineEnd = source.indexOf('\n', comment.end);
        next = closeLineEnd === -1 ? source.length + 1 : closeLineEnd + 1;
        const text = source.slice(comment.end, next - 1).replace(/\r$/, '');
        if (text.trim() !== '') {
          const p = lineParts(
            blockContinuationPrefix(source.slice(closeLine, comment.end), depth) + text
          );
          para = { indent: p.indent, depth: p.depth };
          paraText = p.rest;
        }
      }
    } else if (
      ATX_HEADING.test(rest) ||
      isThematicBreak(rest) ||
      // A setext underline needs a paragraph in its own container: a lazy
      // line (another quote depth, or outdented out of a list item) is text.
      (para &&
        depth === para.depth &&
        !(para.inItem && indent < para.indent) &&
        SETEXT_UNDERLINE.test(rest))
    ) {
      // One-line blocks: the next line starts a new block too, so an inline
      // comment in a heading can't run on into it.
      breaks.push(pos, next);
      para = undefined;
    } else if (htmlBlockStartRe().test(rest)) {
      breaks.push(pos);
      para = undefined;
    } else if (item) {
      // Any list item ends a paragraph in another container; within the same
      // one, only a bullet or `1.`/`1)` item with text may interrupt it.
      const interrupts =
        !para ||
        depth !== para.depth ||
        (item[3].trim() !== '' && (/^[-*+]$/.test(item[1]) || /^1[.)]$/.test(item[1])));
      if (interrupts) {
        breaks.push(pos);
        para =
          item[3].trim() === ''
            ? undefined
            : { indent: indent + item[1].length + columns(item[2]), depth, inItem: true };
        paraText = item[3];
      }
    } else if (para && depth > para.depth) {
      // A deeper blockquote starts here.
      breaks.push(pos);
      para = { indent, depth };
      paraText = rest;
    } else if (!para) {
      para = { indent, depth };
      paraText = rest;
    } else if (depth === para.depth) {
      paraText = rest;
    }
    if (para && paraText !== undefined && next < source.length) {
      // A delimiter row on the next line, at the paragraph's depth and within
      // three columns of its content, with as many cells: a table, whose header
      // row interrupts the paragraph.
      const nl2 = source.indexOf('\n', next);
      const below = lineParts(
        source.slice(next, nl2 === -1 ? source.length : nl2).replace(/\r$/, '')
      );
      const delim = below.rest;
      const i2 = below.indent;
      if (
        below.depth === para.depth &&
        i2 < para.indent + 4 &&
        !(para.inItem && i2 < para.indent) &&
        /[|:]/.test(delim) &&
        isTableDelimiter(delim) &&
        // `- | -` is a list item, which interrupts the paragraph first.
        !LIST_ITEM.test(delim) &&
        isTableHeader(paraText, tableCells(delim))
      ) {
        breaks.push(pos);
        table = {
          depth: para.depth,
          indent: para.inItem ? para.indent : 0,
          inItem: para.inItem === true,
          delim: next,
        };
        para = undefined;
      }
    }
    pos = next;
  }
  if (fence) fences.push({ start: fence.start, end: source.length });
  return { fences, blockComments, lineComments, breaks };
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
// opener itself:
//   - a backslash escape `\x` (any char but a newline): consumed as a token, so
//     `\<!--` and `\`` never start anything, while `\\<!--` is an escaped
//     backslash followed by a real opener — parity by construction;
//   - a backtick run, which may open an inline code span — matched here as the
//     whole run only; `htmlCommentRanges` finds its closer by hand (see
//     `codeSpanEnd`), because a regex closer search backtracks into shorter
//     opener runs and rescans the paragraph once per length;
//   - an MDX JSX / HTML tag, whose quoted attribute values (double- or
//     single-quoted; MDX accepts both) are literal strings — its name may be
//     dashed, namespaced or a member (`my-element`, `svg:rect`, `Tabs.Item`),
//     and so may an attribute name (`xlink:href`);
//   - a link/image tail `](destination "title")` — MDX takes destinations and
//     titles verbatim, so `[a](http://x/<!--y-->z)` keeps its URL (an escaped
//     `\]` is consumed above, so it opens no tail and protects nothing).
const TOKEN =
  /\\[^\n]|`+|<\/?[A-Za-z][\w.:-]*(?:\s+[A-Za-z_:][\w.:-]*(?:="[^"]*"|='[^']*')?)*\s*\/?>|\]\((?:<[^<>\n]*>|(?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))*)(?:\s+(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?\s*\)|<!--/g;

/**
 * Every HTML comment in prose — outside fenced code, inline code, tags and link
 * destinations/titles — with CommonMark's extent:
 *   - one that starts a line (after any quote/list markers) and ends it or
 *     runs past it is an HTML block and runs to the first `-->` anywhere, even
 *     across blank lines and fences (the usual way to comment out a whole
 *     section, code blocks included);
 *   - one that starts a line and closes on it with text after it, and an
 *     unclosed opener starting a line, are always reported: MDX rejects a raw
 *     `<!` at the start of a line even inside a code span or a tag. A code
 *     span, tag or link may still run across such a comment, as MDX reads the
 *     line around it;
 *   - one inside a paragraph ends at the first `-->` before the paragraph does,
 *     so it may not cross a line that interrupts the paragraph (see
 *     `scanBlocks`);
 *   - `<!-->` and `<!--->` are complete empty comments.
 * An opener that finds no valid `-->` is reported with `closed: false`.
 *
 * Not modelled: a reference definition's destination and title
 * (`[a]: http://x/<!--y-->z`) — telling one from a paragraph line that merely
 * looks like it takes block context this scan does not keep, and protecting a
 * look-alike would hand its `<!--` to MDX, which rejects it. Its comment is
 * reported (and so dropped), changing the URL; a link's inline `](…)` tail is
 * protected.
 */
export function htmlCommentRanges(source: string): HtmlCommentRange[] {
  if (!source.includes('<!--')) return [];
  const { fences, blockComments, lineComments, breaks } = scanBlocks(source);
  // Fences and comment blocks never overlap (one pass decided both), so one
  // sorted list of regions the inline scan must skip, walked with a pointer.
  const regions: HtmlCommentRange[] = [
    ...fences.map((f) => ({ ...f, closed: true })),
    ...blockComments,
  ].sort((a, b) => a.start - b.start);
  let r = 0;
  // Line comments are skipped too, but a code span, tag or link may run
  // across one (MDX reads the text around it as one paragraph), and a
  // backtick inside one opens or closes no span (dwar drops it).
  let l = 0;
  const nextCloser = closerFinder(source);
  const codeSpanEnd = codeSpanFinder(source, lineComments);

  // The comments scanBlocks found, in source order, each reported once the
  // scan has passed its start — unless an inline comment before it ran on
  // into it (its `<!--` is that comment's text).
  const found: HtmlCommentRange[] = [...blockComments, ...lineComments].sort(
    (x, y) => x.start - y.start
  );
  const out: HtmlCommentRange[] = [];
  let b = 0;
  const flushFoundBefore = (pos: number): void => {
    for (; b < found.length && found[b].start < pos; b++) {
      if (out.length === 0 || out[out.length - 1].end <= found[b].start) out.push(found[b]);
    }
  };

  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(source)) !== null) {
    const start = m.index;
    while (r < regions.length && regions[r].end <= start) r++;
    const region = regions[r];
    if (region && region.start <= start) {
      TOKEN.lastIndex = Math.max(region.end, start + 1);
      continue;
    }
    while (l < lineComments.length && lineComments[l].end <= start) l++;
    if (l < lineComments.length && lineComments[l].start <= start) {
      TOKEN.lastIndex = lineComments[l].end;
      continue;
    }
    if (m[0][0] === '`') {
      // A backtick run: skip its code span, if it opens one. Like a tag or
      // link below, a span may not reach into a fence or comment block, or
      // across a line that ends the paragraph; a run that opens no span is
      // literal backticks, all of them — scanning goes on after the run, and
      // a shorter run inside it is never tried.
      const runEnd = start + m[0].length;
      const end = codeSpanEnd(start, runEnd);
      const crosses = (region && region.start < end) || firstAfter(breaks, start) < end;
      TOKEN.lastIndex = end === -1 || crosses ? runEnd : end;
      continue;
    }
    if (m[0] !== '<!--') {
      // A tag/link that would reach into a fence or comment block, or
      // across a line that ends the paragraph, is not one: the block ends the
      // paragraph first, and inline syntax never spans blocks. Rescan from the
      // next character.
      const end = start + m[0].length;
      if ((region && region.start < end) || firstAfter(breaks, start) < end) {
        TOKEN.lastIndex = start + 1;
      }
      continue;
    }

    const openEnd = start + 4;
    const empty = /^-?>/.exec(source.slice(openEnd, openEnd + 2));
    let end = -1;
    if (empty) {
      end = openEnd + empty[0].length;
    } else {
      const closer = nextCloser(openEnd);
      // The comment may not outlive its paragraph. The next fence or comment
      // block always starts on a break line, so the next break covers both.
      if (closer !== -1 && closer + 3 <= firstAfter(breaks, start)) end = closer + 3;
    }
    flushFoundBefore(start);
    if (end === -1) {
      out.push({ start, end: openEnd, closed: false });
      TOKEN.lastIndex = openEnd;
    } else {
      out.push({ start, end, closed: true });
      TOKEN.lastIndex = end;
    }
  }
  flushFoundBefore(Infinity);
  return out;
}

// How the HTML tokenizer reads a `<` in text, which decides whether a later
// `<!--` is still text:
//   - `<` or `</` then an ASCII letter opens a tag, which runs to its `>`; a
//     quoted attribute value in it (`="…"` / `='…'`, HTML whitespace allowed
//     after the `=`) may hold `>`, `<` and `<!--` as plain characters, and so
//     may an attribute name (`<a <!-- >`) or an unquoted value;
//   - `<!` (other than `<!--`), `<?` and `</` + non-letter open a doctype or
//     "bogus comment", which runs to the next `>`;
//   - any other `<` is text.
// A tag or bogus comment with no `>` runs to the end of the input, as in a
// browser (nothing after it is content), and so ends the scan. The tag opener
// is this regex; the rest of the tag is read by hand (`tagEndFinder`).
const TAG_OPEN = /<\/?[A-Za-z]/y;

/**
 * Finds the `>` that ends a tag whose body (what follows the first letter of
 * `<name` or `</name`) starts at `from`, or -1 when the tag runs to the end of
 * the input, for non-decreasing positions. The body grammar:
 *   - any character but `>` and `=` is part of the body (the rest of the name,
 *     whitespace, `/`, `<`, `<!--`, `-->`, a quote not right after an `=`);
 *   - `>` ends the tag;
 *   - `=` takes the HTML whitespace after it (space, tab, LF, FF, CR — not VT
 *     or NBSP), then a quoted value whole (`"…"` or `'…'`, anything literal up
 *     to the same quote) when one follows; a quote that never closes makes the
 *     tag run to the end of the input, even past a later `>`. Without a quote,
 *     what follows is ordinary body (`=>` ends the tag, `==` starts over).
 * Linear over all calls: the next `>` and the next `=` are remembered while they
 * are still ahead, a quoted value costs one `indexOf`, and -1 is final (the
 * caller stops). Hand-written because a regex loop over the body,
 * `(?:[^>=]|=…)*`, overflows the regex engine's backtrack stack on a tag of
 * several million characters (#382).
 */
function tagEndFinder(source: string): (from: number) => number {
  let gt = -2; // next `>` at or after the cursor; -1 once there is none
  let eq = -2; // next `=`, likewise
  return (from) => {
    let i = from;
    for (;;) {
      if (gt !== -1 && gt < i) gt = source.indexOf('>', i);
      if (gt === -1) return -1;
      if (eq !== -1 && eq < i) eq = source.indexOf('=', i);
      if (eq === -1 || eq > gt) return gt;
      let j = eq + 1;
      for (;;) {
        const c = source.charCodeAt(j);
        if (c === 32 || c === 9 || c === 10 || c === 12 || c === 13) j++;
        else break;
      }
      const quote = source[j];
      if (quote === '"' || quote === "'") {
        const close = source.indexOf(quote, j + 1);
        if (close === -1) return -1; // the value, and so the tag, never ends
        i = close + 1;
      } else i = j; // unquoted or missing value: ordinary body from here
    }
  };
}

/**
 * Every `<!-- … -->` in raw HTML (not Markdown), per the HTML tokenizer. Code
 * reaches an HTML string entity-escaped (`&lt;!--`), so there is no code to
 * skip — only tags: a `<!--` inside a start or end tag (in a quoted attribute
 * value such as `title="<!--"`, an attribute name or an unquoted value) is
 * part of the tag, and one inside a doctype, `<?…>` or other bogus comment
 * (`<![CDATA[…`, `</ …`) is part of that, which ends at the next `>`. A tag or
 * bogus comment left open at the end of the input runs to the end, so nothing
 * after it is reported. Comment semantics are unchanged: a comment ends at the
 * first `-->` after its opener (a nested `<!--` is comment text); `<!-->` and
 * `<!--->` are complete empty comments; an opener with no `-->` after it is
 * reported `closed: false` over its four characters (the HTML parser would run
 * it to the end of the input — callers decide what to do with it), and the scan
 * goes on, so every later opener is reported too. Not modelled: the raw-text
 * elements (`<script>`, `<style>`, `<textarea>`, `<title>`), whose content the
 * tokenizer never reads as a comment — a `<!--` there is reported as one, as
 * the Markdown scanner also does — and `--!>`, which the tokenizer accepts as
 * a closer. Linear: one `indexOf` per `<`, one pass over each tag by
 * `indexOf` (no regex over a tag body, which overflowed on a multi-megabyte
 * tag), one `indexOf` per `-->`.
 */
export function htmlCommentRangesInHtml(source: string): HtmlCommentRange[] {
  const out: HtmlCommentRange[] = [];
  if (!source.includes('<!--')) return out;
  const nextCloser = closerFinder(source);
  const tagEnd = tagEndFinder(source);
  for (let from = 0; ; ) {
    const lt = source.indexOf('<', from);
    if (lt === -1) return out;
    if (source.startsWith('<!--', lt)) {
      const openEnd = lt + 4;
      const empty = /^-?>/.exec(source.slice(openEnd, openEnd + 2));
      if (empty) out.push({ start: lt, end: openEnd + empty[0].length, closed: true });
      else {
        const closer = nextCloser(openEnd);
        if (closer === -1) out.push({ start: lt, end: openEnd, closed: false });
        else out.push({ start: lt, end: closer + 3, closed: true });
      }
      from = out[out.length - 1].end;
      continue;
    }
    TAG_OPEN.lastIndex = lt;
    if (TAG_OPEN.test(source)) {
      const gt = tagEnd(TAG_OPEN.lastIndex);
      if (gt === -1) return out; // the tag runs to the end of the input
      from = gt + 1;
      continue;
    }
    const next = source[lt + 1];
    if (next === '!' || next === '?' || next === '/') {
      const gt = source.indexOf('>', lt + 2);
      if (gt === -1) return out; // the bogus comment runs to the end of the input
      from = gt + 1;
      continue;
    }
    from = lt + 1; // a `<` that opens nothing is text
  }
}

/**
 * Rewrite the comments of `source` — the ranges {@link htmlCommentRanges}
 * (Markdown) or {@link htmlCommentRangesInHtml} (HTML) found in it — through
 * `replacer`, which receives each range (closed or not) and its text. Text
 * between comments is copied once; with no comments `source` itself is returned.
 */
export function replaceHtmlComments(
  source: string,
  comments: readonly HtmlCommentRange[],
  replacer: (comment: HtmlCommentRange, text: string) => string
): string {
  if (comments.length === 0) return source;
  let out = '';
  let cursor = 0;
  for (const c of comments) {
    out += source.slice(cursor, c.start) + replacer(c, source.slice(c.start, c.end));
    cursor = c.end;
  }
  return out + source.slice(cursor);
}

/**
 * A copy of `source` with every CLOSED comment blanked out — each of its
 * characters but newlines becomes `fill` — so the copy has the same length,
 * line breaks and offsets as `source`: scan the mask, slice the original. An
 * unclosed opener is literal text and stays as it is.
 */
export function maskHtmlComments(
  source: string,
  comments: readonly HtmlCommentRange[],
  fill = ' '
): string {
  return replaceHtmlComments(source, comments, (c, text) =>
    c.closed ? text.replace(/[^\n]/g, fill) : text
  );
}
