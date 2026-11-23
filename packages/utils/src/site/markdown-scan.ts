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
/**
 * The same in MDX, which has no indented code: a `>` after any indentation is
 * a blockquote marker (one inside a list item sits four or more columns in).
 * `^(?:[ \t]*>[ \t]?)*` as a hand loop: as a regex it overflows the stack on
 * a line of a few million `>`.
 */
function mdxQuotePrefix(line: string): string {
  let end = 0;
  for (;;) {
    let j = end;
    while (line[j] === ' ' || line[j] === '\t') j++;
    if (line[j] !== '>') return line.slice(0, end);
    j++;
    if (line[j] === ' ' || line[j] === '\t') j++;
    end = j;
  }
}

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

// MDX: a line holding only the empty comment expressions dwar's comment pass
// leaves where a line-starting comment stood (see `stripHtmlComments`). MDX
// reads it as a flow expression, which interrupts a paragraph.
const COMMENT_PLACEHOLDER_LINE = /^\{\/\*\*\/\}(?:[ \t]*\{\/\*\*\/\})*[ \t]*$/;

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

/**
 * For each `>` of a quote prefix, the column width of the whitespace before it
 * (counted from just after the previous marker and the one space it may take).
 * `gaps[d]` is how far a line reaches into a list item opened at quote depth
 * `d` before its next quote marker.
 */
function quoteGaps(quote: string): number[] {
  const gaps: number[] = [];
  let col = 0;
  for (let i = 0; i < quote.length; i++) {
    const ch = quote[i];
    if (ch === '>') {
      gaps.push(col);
      col = 0;
      if (quote[i + 1] === ' ' || quote[i + 1] === '\t') i++;
    } else col = ch === '\t' ? col + 4 - (col % 4) : col + 1;
  }
  return gaps;
}

/** A list item open in the MDX dialect of `scanBlocks`. */
interface OpenItem {
  /** Its content column, counted after the quote prefix of depth `depth`. */
  col: number;
  /** The quote depth it sits at. */
  depth: number;
}

/** A fence opener as `scanBlocks` reads it. */
interface FenceOpener {
  /** The fence character, `` ` `` or `~`. */
  char: string;
  /** The length of its run. */
  len: number;
  /** The quote depth of its content. */
  depth: number;
  /** Columns before the run, after the last quote marker. */
  indent: number;
  /** Whether a list marker precedes the run. */
  marker: boolean;
  /** MDX: the list items its markers open, outermost first. */
  items: OpenItem[];
  /** MDX: an ordered marker other than `1.`/`1)` comes before any quote marker (it can't interrupt a paragraph). */
  ordered: boolean;
}

/** The container markers opening a line, as {@link mdxContainers} reads them. */
interface Containers {
  /** Where the line's content starts. */
  end: number;
  /** Its column, counted after the last quote marker. */
  col: number;
  /** The quote depth of the content. */
  depth: number;
  /** The list items the markers open, outermost first. */
  items: OpenItem[];
  /** Whether a list marker follows the last quote marker. */
  marker: boolean;
  /** An ordered marker other than `1.`/`1)` is among the markers. */
  ordered: boolean;
  /**
   * The containers up to the first such marker: on a line that would
   * otherwise continue a paragraph, that marker opens no item (an ordered
   * list must start at 1 to interrupt one), so the line's content starts
   * there.
   */
  beforeOrdered?: { end: number; col: number; depth: number; items: number };
}

/**
 * MDX: the quote markers and list markers opening `line`, in any order
 * (`- > text`, `- - text`, `1. > text`), each after any indentation. A marker
 * at the end of the line opens an empty item. Written out by hand (one pass
 * over the line) rather than as a regex whose nested, whitespace-sharing
 * repeats could backtrack.
 */
function mdxContainers(line: string): Containers {
  let i = 0;
  let col = 0;
  let depth = 0;
  const items: OpenItem[] = [];
  let pending = -1; // the depth of a marker whose content column is not known yet
  let pendingCol = 0; // the column right after that marker
  let marker = false;
  let beforeOrdered: Containers['beforeOrdered'];
  for (;;) {
    while (line[i] === ' ' || line[i] === '\t') {
      col = line[i] === '\t' ? col + 4 - (col % 4) : col + 1;
      i++;
    }
    if (pending !== -1) {
      // Whitespace that runs to the end leaves the item empty: its content
      // column is one past the marker.
      items.push({ col: i === line.length ? pendingCol + 1 : col, depth: pending });
      pending = -1;
    }
    const c = line.charCodeAt(i);
    if (c === 62) {
      // `>`, and the one space it may take.
      depth++;
      i++;
      if (line[i] === ' ' || line[i] === '\t') i++;
      col = 0;
      marker = false;
      continue;
    }
    let j = i;
    if (c === 45 || c === 42 || c === 43)
      j = i + 1; // `-`, `*`, `+`
    else {
      while (j - i < 9 && isDigit(line.charCodeAt(j))) j++;
      j = j > i && (line[j] === '.' || line[j] === ')') ? j + 1 : i;
    }
    if (j > i && (line[j] === ' ' || line[j] === '\t' || j === line.length)) {
      if (!beforeOrdered && c !== 45 && c !== 42 && c !== 43 && line.slice(i, j - 1) !== '1') {
        beforeOrdered = { end: i, col, depth, items: items.length };
      }
      col += j - i;
      i = j;
      marker = true;
      if (j === line.length) {
        // An empty item: its content column is one past the marker.
        items.push({ col: col + 1, depth });
        break;
      }
      pending = depth;
      pendingCol = col;
      continue;
    }
    break;
  }
  return { end: i, col, depth, items, marker, ordered: beforeOrdered !== undefined, beforeOrdered };
}

/**
 * A fence opener in the MDX dialect, or null: container markers in any order
 * (see {@link mdxContainers}), then the run of three or more backticks or
 * tildes and an info string — which, for backticks, may not hold a backtick.
 */
function mdxFenceOpener(line: string): FenceOpener | null {
  const { end: i, col, depth, items, marker, ordered } = mdxContainers(line);
  const char = line[i];
  if (char !== '`' && char !== '~') return null;
  let k = i;
  while (line[k] === char) k++;
  if (k - i < 3) return null;
  if (char === '`' && line.includes('`', k)) return null;
  return { char, len: k - i, depth, indent: col, marker, items, ordered };
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

function lineParts(line: string, mdx = false): LineParts {
  const quote = mdx ? mdxQuotePrefix(line) : QUOTE_PREFIX.exec(line)![0];
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
 * The comment-dropped count is used only when every comment on the line
 * closes on it. An opener left unclosed on the line may close on a later one,
 * swallowing the delimiter row: MDX then sees no table, and declaring one
 * would end the paragraph under that comment, leave it unclosed and hand its
 * text to MDX (`h <!-- a | b --> | i <!-- x <br>` / `-|-` / `-->` failed on
 * the `<br>`). Such a line keeps the raw count alone, as before.
 *
 * The comments are found by {@link htmlCommentRanges} on the line alone, so
 * there is one definition of a comment. That nested scan cannot recurse — the
 * line has no newline, so its `scanBlocks` never reaches a header check — and
 * it is done with the shared `TOKEN` regex before the outer scan resets
 * `TOKEN.lastIndex` and starts its own loop.
 *
 * Known gap: a comment opened on the paragraph line above and closed on this
 * one (`a <!-- note` then `" > | | <!-- c --><!-- | -->` over `-|-|-`) is not
 * seen by the one-line scan, whose count can then differ from MDX's. Getting
 * it right needs the inline comment state in `scanBlocks`.
 */
function isTableHeader(text: string, cells: number): boolean {
  if (tableCells(text) === cells) return true;
  if (!text.includes('<!--')) return false;
  const ranges = htmlCommentRanges(text);
  if (ranges.some((c) => !c.closed)) return false;
  const seen = replaceHtmlComments(text, ranges, () => 'x');
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

/** Whether char code `c` is one JavaScript's `\s` matches. */
function isSpace(c: number): boolean {
  return (
    c === 32 ||
    (c >= 9 && c <= 13) ||
    c === 0xa0 ||
    c === 0x1680 ||
    (c >= 0x2000 && c <= 0x200a) ||
    c === 0x2028 ||
    c === 0x2029 ||
    c === 0x202f ||
    c === 0x205f ||
    c === 0x3000 ||
    c === 0xfeff
  );
}

/** Whether char code `c` is an ASCII letter. */
function isAlpha(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}

/** Whether char code `c` is an ASCII digit. */
function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

/**
 * Finds where the MDX JSX tag opening at `lt` (a `<`) ends, or -1 when none
 * opens there. The tag grammar is dwar's, as the regex it used to be:
 * `<\/?[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][\w-]*(?:="[^"]*"|='[^']*')?)*\s*\/?>`
 * — a name, then attributes with an optional double- or single-quoted value
 * (setu downgrades any `"` inside a value to `'`, so a value may hold `{`, `}`,
 * `<` or `>`), then an optional `/` and the `>`. A tag may span lines.
 *
 * Written out by hand: as a regex, V8 runs out of stack on one tag of several
 * million characters. One `indexOf` per quoted value; once a quote character
 * has no later occurrence, every later value opened with it fails at once, so
 * a page of unterminated values stays linear.
 */
function jsxTagEndFinder(source: string): (lt: number) => number {
  let noDouble = Infinity;
  let noSingle = Infinity;
  return (lt) => {
    const n = source.length;
    let i = lt + 1;
    if (source.charCodeAt(i) === 47) i++; // `/`
    if (!isAlpha(source.charCodeAt(i))) return -1;
    i++;
    for (let c = source.charCodeAt(i); isAlpha(c) || isDigit(c); c = source.charCodeAt(++i));
    for (;;) {
      const ws = i;
      while (i < n && isSpace(source.charCodeAt(i))) i++;
      if (i > ws && isAlpha(source.charCodeAt(i))) {
        // An attribute name: letters, digits, `_` and `-`.
        i++;
        for (
          let c = source.charCodeAt(i);
          isAlpha(c) || isDigit(c) || c === 95 || c === 45;
          c = source.charCodeAt(++i)
        );
        if (source.charCodeAt(i) === 61) {
          // `=` and a quoted value.
          const q = source.charCodeAt(i + 1);
          if (q !== 34 && q !== 39) return -1;
          if (i + 2 >= (q === 34 ? noDouble : noSingle)) return -1;
          const close = source.indexOf(q === 34 ? '"' : "'", i + 2);
          if (close === -1) {
            if (q === 34) noDouble = i + 2;
            else noSingle = i + 2;
            return -1;
          }
          i = close + 1;
        }
        continue;
      }
      if (source.charCodeAt(i) === 47) i++; // `/`
      return source.charCodeAt(i) === 62 ? i + 1 : -1; // `>`
    }
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
 *     table there). The header row's cells are counted on the raw line, or —
 *     when every comment on the line closes on it — on the line as MDX reads
 *     it once dwar drops those comments (pipes inside included); either count
 *     matching makes a table. A comment left open on the header line keeps
 *     the raw count alone: it may close below and swallow the delimiter row,
 *     and a table declared there would hand its text to MDX (see
 *     `isTableHeader`).
 *
 * With `mdx`, lines are read the way MDX reads them ({@link mdxCodeRanges}
 * uses this dialect, the comment scanners never do). MDX has no indented code
 * and no HTML:
 *   - indentation never makes a line plain text: a `>` after any indentation
 *     is a quote marker, a closer may be indented any amount, and a fence,
 *     list item or heading interrupts a paragraph however far it is indented;
 *   - a line may open quote and list markers in any order (`- > text`,
 *     `- - ```js`), and a fence opener may follow them; an ordered marker
 *     other than 1 can't interrupt a paragraph, so it opens no fence there —
 *     unless the line is left of the innermost item's content, where any
 *     marker starts that list's next item;
 *   - the open list items are tracked (each with its quote depth and content
 *     column, a tab after a marker reaching the next tab stop), and a fence
 *     belongs to the innermost one. It ends with that item: at a line that
 *     does not reach the item's column (before its next quote marker, when
 *     the item sits outside a quote), a `>` alone included, or when a quote
 *     the item is in ends. An item opened empty ends at a blank line — a
 *     line holding only quote markers inside the item is not blank to it;
 *   - a line holding only MDX JSX tags (flow JSX), or only the empty comment
 *     expressions dwar's comment pass leaves, interrupts a paragraph and
 *     ends the list items it is left of; the lines a multi-line tag covers
 *     (after a list marker too) are attribute text, never block starts;
 *   - an HTML block start (`<div>`) is no block: a line that begins with a
 *     tag and holds text after it is paragraph text, or a table row.
 */
function scanBlocks(source: string, mdx = false): BlockScan {
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
        /** In a list item: a line indented less than `itemCol` leaves the item and ends it. */
        inItem: boolean;
        /** Column a non-blank line must reach to stay in the fence's list item. */
        itemCol: number;
        /** MDX: the quote depth of that list item (`itemCol` counts from its quote prefix). */
        itemDepth: number;
      }
    | undefined;
  // MDX only: the open list items, innermost last — so a fence on an item's
  // continuation line knows which item it is in — and an item just opened
  // empty (a blank line next ends it: an item may start with one blank line
  // only after content on its marker line).
  const items: OpenItem[] = [];
  let emptyItem: OpenItem | undefined;
  const flowTagEnd = mdx ? jsxTagEndFinder(source) : undefined;
  /**
   * MDX: close the list items a line is not in: those quoted deeper than it,
   * and those it does not reach into — its indentation (after the quote
   * prefix of the item's depth, or before the next quote marker when it is
   * quoted deeper) is narrower than the item's content column.
   */
  function leaveItems(depth: number, indent: number, gaps: readonly number[]): void {
    const k = firstUnreached(depth, indent, gaps);
    if (k !== -1) items.length = k;
  }
  /**
   * MDX: the outermost open list item a line does not reach into (its
   * indentation, after the quote prefix of the item's depth or before the
   * next quote marker when it is quoted deeper, is narrower than the item's
   * content column; an item quoted deeper than the line is never reached),
   * or -1. The items inside it end with it.
   */
  function firstUnreached(depth: number, indent: number, gaps: readonly number[]): number {
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      const reach = it.depth === depth ? indent : it.depth < depth ? gaps[it.depth] : -1;
      if (reach < it.col) return k;
    }
    return -1;
  }
  /** MDX: whether a line does not reach the innermost open list item's content. */
  function leftOfItem(depth: number, indent: number, gaps: readonly number[]): boolean {
    if (items.length === 0) return false;
    const top = items[items.length - 1];
    return (top.depth === depth ? indent : top.depth < depth ? gaps[top.depth] : -1) < top.col;
  }
  /**
   * MDX flow JSX: one or more tags from `at`, then nothing else on the last
   * one's line. Returns the start of the line after it, or -1.
   */
  function flowTagLineEnd(at: number): number {
    for (;;) {
      const end = flowTagEnd!(at);
      if (end === -1) return -1;
      let k = end;
      while (source[k] === ' ' || source[k] === '\t') k++;
      const c = source.charCodeAt(k);
      if (k >= source.length || c === 10 || (c === 13 && source.charCodeAt(k + 1) === 10)) {
        const nl2 = source.indexOf('\n', end - 1);
        return nl2 === -1 ? source.length + 1 : nl2 + 1;
      }
      if (c !== 60) return -1;
      at = k;
    }
  }
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

    const { quote, depth, indent, rest } = lineParts(line, mdx);
    const body = line.slice(quote.length);
    // MDX: how far the line reaches before each of its quote markers.
    const gaps = mdx && depth > 0 ? quoteGaps(quote) : [];

    // A fence opened inside a blockquote ends with the quote.
    if (fence && depth < fence.depth) {
      fences.push({ start: fence.start, end: pos - 1 });
      fence = undefined;
    }

    if (fence) {
      // In MDX the item may sit outside the fence's quote (`- > ```js`), and a
      // deeper-quoted line leaves it too when it doesn't reach the item's
      // column before its next quote marker.
      // (In MDX a line holding a quote marker outside the item, `>` alone
      // included, is not blank.)
      const leavesItem =
        fence.inItem &&
        (rest !== '' || (mdx && depth > fence.itemDepth)) &&
        (mdx
          ? (depth === fence.itemDepth ? indent : gaps[fence.itemDepth]) < fence.itemCol
          : depth === fence.depth && indent < fence.itemCol);
      if (leavesItem) {
        // A non-blank line indented less than the item's content column leaves
        // the list item, and the fence with it (fenced code has no lazy
        // continuation). The line is then read afresh — it may open a new fence.
        fences.push({ start: fence.start, end: pos - 1 });
        fence = undefined;
      } else {
        // The closer sits at the fence's own quote depth (a deeper quote line is
        // content) and is indented at most three columns past the content
        // column the opener set (CommonMark): `- ```` closes at columns 2–5, a
        // bare ``` at 0–3. MDX closes on a closer indented any amount.
        const close = depth === fence.depth ? FENCE_CLOSE.exec(body) : null;
        if (
          close &&
          close[2][0] === fence.char &&
          close[2].length >= fence.len &&
          (mdx || columns(close[1]) <= fence.indent + 3)
        ) {
          fences.push({ start: fence.start, end: lineEnd });
          fence = undefined;
        }
        pos = next;
        continue;
      }
    }

    let justEmpty: OpenItem | undefined;
    if (mdx) {
      // A line quoted less deeply (even a marker-only one) ends the items
      // inside the quotes it left.
      while (items.length > 0 && items[items.length - 1].depth > depth) items.pop();
      justEmpty = emptyItem;
      emptyItem = undefined;
    }

    if (rest === '') {
      // An item that opened empty ends at a blank line, and in MDX a `>`
      // alone outside an item's column leaves it.
      // (A `>`-only line inside the item is not blank to it.)
      if (justEmpty && items[items.length - 1] === justEmpty && depth <= justEmpty.depth) {
        items.pop();
      }
      while (mdx && items.length > 0) {
        const top = items[items.length - 1];
        if (top.depth >= depth || gaps[top.depth] >= top.col) break;
        items.pop();
      }
      breaks.push(pos);
      para = undefined;
      table = undefined;
      pos = next;
      continue;
    }

    if (mdx) {
      // A quote marker left of an open item's content starts a new quote: it
      // ends the paragraph, never continues it lazily.
      if (para) {
        const k = firstUnreached(depth, indent, gaps);
        if (k !== -1 && items[k].depth < depth) {
          breaks.push(pos);
          para = undefined;
        }
      }
      // A lazy paragraph line stays in its item; any other outdented line leaves it.
      if (!para) leaveItems(depth, indent, gaps);
      // MDX flow JSX — one or more tags starting the line, then nothing else
      // on the last one's line — and the empty comment expressions dwar's
      // comment pass leaves where a line-starting comment stood: each
      // interrupts a paragraph, and the lines a multi-line tag covers are
      // attribute text, never block starts.
      const flowEnd =
        rest.charCodeAt(0) === 60
          ? flowTagLineEnd(pos + line.length - rest.length)
          : COMMENT_PLACEHOLDER_LINE.test(rest)
            ? next
            : -1;
      if (flowEnd !== -1) {
        next = flowEnd;
        leaveItems(depth, indent, gaps);
        breaks.push(pos, next);
        para = undefined;
        table = undefined;
        pos = next;
        continue;
      }
    }

    // MDX reads openers the MDX way: quote and list markers in any order.
    const mdxOpen = mdx ? mdxFenceOpener(line) : null;
    const open = mdx ? null : FENCE_OPEN.exec(body);
    const opener: FenceOpener | null = mdx
      ? mdxOpen
      : open && {
          char: open[2][0],
          len: open[2].length,
          depth,
          indent: columns(open[1]),
          marker: /[^ \t]/.test(open[1]),
          items: [],
          ordered: false,
        };
    const opensFence =
      opener !== null &&
      (mdx
        ? // An ordered item other than 1 can't interrupt a paragraph — nor can
          // one opening on the same line inside new containers (`- 2.`, `> 2.`).
          !(opener.ordered && para && depth >= para.depth && !leftOfItem(depth, indent, gaps))
        : !(open![2][0] === '`' && open![3].includes('`')));
    // A comment starting the line: a comment block, unless MDX reads the line
    // as text — when dwar leaves text on it, after the `{/**/}` of a comment
    // that closes on the line, or after the `\<!--` of one left unclosed. Such
    // a line is read like any other (it may continue the paragraph above, or
    // be a table row), and its comment is a line comment.
    let comment: TextRange | undefined;
    const commentOpen = opener ? null : COMMENT_BLOCK.exec(body);
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
          !opener &&
          !comment &&
          !item &&
          !ATX_HEADING.test(rest) &&
          !isThematicBreak(rest) &&
          // (MDX has no HTML blocks: a tag-only line is flow JSX, read above.)
          !(!mdx && htmlBlockStartRe().test(rest)));
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
    // (MDX has no indented code: there indentation never makes a line plain
    // text, so a fence, list item or heading interrupts at any indentation.)
    if (!mdx && para && relIndent >= 4) {
      pos = next;
      continue;
    }

    // The text of a line that holds a paragraph's first or later line, which a
    // delimiter row below would make a table's header row.
    let paraText: string | undefined;
    if (opensFence) {
      // On a list marker line the fence starts the item; in MDX one on a
      // continuation line sits in the innermost open item, and the markers
      // before it (`- > ```js`, `- - ```js`) open items of their own.
      let item: OpenItem | undefined;
      if (mdx) {
        leaveItems(depth, indent, gaps);
        for (const it of opener.items) items.push(it);
        item = items[items.length - 1];
      } else if (opener.marker) item = { col: opener.indent, depth };
      fence = {
        char: opener.char,
        len: opener.len,
        start: pos,
        depth: opener.depth,
        indent: opener.indent,
        inItem: item !== undefined,
        itemCol: item ? item.col : 0,
        itemDepth: item ? item.depth : depth,
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
      if (mdx) leaveItems(depth, indent, gaps);
      breaks.push(pos, next);
      para = undefined;
    } else if (!mdx && htmlBlockStartRe().test(rest)) {
      breaks.push(pos);
      para = undefined;
    } else if (item) {
      // Any list item ends a paragraph in another container; within the same
      // one, only a bullet or `1.`/`1)` item with text may interrupt it.
      // (MDX: an item left of an item's text is that list's next item.)
      const interrupts =
        !para ||
        depth !== para.depth ||
        (mdx && leftOfItem(depth, indent, gaps)) ||
        (item[3].trim() !== '' && (/^[-*+]$/.test(item[1]) || /^1[.)]$/.test(item[1])));
      // MDX: a paragraph this line would otherwise continue (see `beforeOrdered`).
      const continuesPara =
        mdx && para !== undefined && depth >= para.depth && !leftOfItem(depth, indent, gaps);
      if (interrupts) {
        const content = indent + item[1].length + columns(item[2]);
        breaks.push(pos);
        para = item[3].trim() === '' ? undefined : { indent: content, depth, inItem: true };
        paraText = item[3];
        if (mdx) {
          // Every container the line opens — nested items and quotes after
          // the marker (`- - text`, `- > text`) included — and the paragraph
          // in the innermost one. An empty item's content column is one past
          // its marker.
          leaveItems(depth, indent, gaps);
          let c = mdxContainers(line);
          if (continuesPara && c.beforeOrdered) {
            const b = c.beforeOrdered;
            c = { ...c, end: b.end, col: b.col, depth: b.depth, items: c.items.slice(0, b.items) };
          }
          for (const it of c.items) items.push(it);
          const text = line.slice(c.end);
          if (text.trim() === '') {
            para = undefined;
            if (c.items.length > 0 && c.depth === c.items[c.items.length - 1].depth) {
              emptyItem = items[items.length - 1];
            }
          } else if (ATX_HEADING.test(text) || isThematicBreak(text)) {
            // A one-line block after the markers: no paragraph follows it.
            breaks.push(next);
            para = undefined;
          } else {
            // Flow JSX after the markers: a tag that runs on past its line
            // holds those lines as attribute text.
            const flowEnd = text.charCodeAt(0) === 60 ? flowTagLineEnd(pos + c.end) : -1;
            if (flowEnd !== -1) {
              next = flowEnd;
              breaks.push(next);
              para = undefined;
            } else para = { indent: c.col, depth: c.depth, inItem: c.depth === depth };
          }
          paraText = para ? text : undefined;
        }
      }
    } else if (para && depth > para.depth) {
      // A deeper blockquote starts here.
      if (mdx) leaveItems(depth, indent, gaps);
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
        source.slice(next, nl2 === -1 ? source.length : nl2).replace(/\r$/, ''),
        mdx
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

/** A stretch of an MDX body that is not prose, found by {@link mdxCodeRanges}. */
export interface CodeRange extends TextRange {
  kind: 'fence' | 'span' | 'tag';
}

/** What {@link mdxCodeRanges} finds in an MDX body. */
export interface MdxCodeScan {
  /** Fenced code blocks, inline code spans and JSX tags: sorted, disjoint. */
  code: CodeRange[];
  /** Unescaped backtick runs outside all of those that opened no span. */
  strayTicks: TextRange[];
}

/**
 * The code of an MDX body — what dwar's pre-passes must leave alone: fenced
 * code blocks, inline code spans and JSX tags — and the backtick runs that
 * opened no span.
 *
 * Fences are read the way MDX reads them (see the `mdx` dialect of
 * `scanBlocks`): a fence closes only on a run of its own character at least as
 * long, so a ```` fence around ``` lines, or an odd number of them, is one
 * block (#372); an unclosed one runs to the end. Between fences, a backslash
 * escapes the character after it (`` \` `` and `\<Foo>` open nothing, while
 * `\\<Foo>` is an escaped backslash then a real tag); a backtick run opens a
 * span by CommonMark's rules (see {@link inlineCodeSpans}) unless its closer
 * lies past a line that ends the paragraph — a blank line, a heading, a list
 * item, a table row, a flow JSX line; a run that opens none is a stray tick. A
 * `<` opens a JSX tag in dwar's tag grammar (see `jsxTagEndFinder`), which may
 * cross lines, blank ones included, but not into a fence.
 *
 * Precondition, as for {@link inlineCodeSpans}: the caller has dropped or
 * masked the HTML comments and removed the YAML frontmatter.
 *
 * Known limits: a code span that crosses a line starting with `{` is still a
 * span here, where MDX may read that line as a flow expression first. A GFM
 * table row's pipes split it into cells before code spans are read; here a
 * span may hold a pipe. Container lines are approximated, not parsed as a
 * full block parser would: a lazy paragraph line keeps its list items (a
 * line that starts a block does not, nor does a quote marker left of an
 * item's content, which starts a new quote), a quote marker's optional
 * space is always taken whole (a tab after `>` included, where MDX takes one
 * column of it), columns restart after each quote marker rather than
 * following the line's tab stops, and a code span after a thematic break may
 * still cross a later `>` line that MDX reads as paragraph text. Lines end at
 * `\n` (a `\r` before it is dropped); a bare `\r` does not end a line here,
 * where MDX ends one. A `>` indented four or more columns always continues a
 * quote here, which MDX does not always do. A JSX attribute whose value is an
 * expression (`n={1}`) is outside dwar's tag grammar, so that tag is prose
 * here and its braces are escaped (as before #372). And dwar's comment pass,
 * which runs before the passes using this scanner, still finds comments with
 * {@link htmlCommentRanges} — the CommonMark dialect, and the regex `TOKEN`
 * for tags (a follow-up).
 *
 * Linear in the source: a body without a backtick, `~` or `<` costs three
 * `includes`; the block scan runs only when a backtick or `~` is present, and
 * the token search between fences never restarts inside text it has passed.
 */
export function mdxCodeRanges(source: string): MdxCodeScan {
  const code: CodeRange[] = [];
  const strayTicks: TextRange[] = [];
  const ticks = source.includes('`');
  const tildes = source.includes('~');
  if (!ticks && !tildes && !source.includes('<')) return { code, strayTicks };
  const { fences, breaks } =
    ticks || tildes ? scanBlocks(source, true) : { fences: [], breaks: [] };
  const spanEnd = codeSpanFinder(source);
  const tagEnd = jsxTagEndFinder(source);
  let b = 0; // the first break after the current backtick run
  const token = /\\[^\n]|`+|</g;
  // The next token, kept across fences: a search that ran past a gap into a
  // fence (or beyond) is reused, and only one that landed inside the fence is
  // repeated from its end — so the text between tokens is searched once, not
  // once per fence (a page of `~~~` fences and plain prose was quadratic).
  let m = token.exec(source);
  for (let f = 0; f <= fences.length; f++) {
    // The gap of prose before fence `f` (or the end of the source).
    const gapEnd = f < fences.length ? fences[f].start : source.length;
    for (; m !== null && m.index < gapEnd; m = token.exec(source)) {
      const start = m.index;
      const c = m[0].charCodeAt(0);
      if (c === 92) continue; // a backslash escape
      if (c === 96) {
        // A backtick run: a span, unless it has no closer or the closer lies
        // past a paragraph break.
        const runEnd = start + m[0].length;
        const end = spanEnd(start, runEnd);
        while (b < breaks.length && breaks[b] <= start) b++;
        // (A fence opener is a break, so `end > gapEnd` is caught there too;
        // the explicit test keeps the ranges disjoint whatever the breaks say.)
        if (end === -1 || end > gapEnd || (b < breaks.length && breaks[b] < end)) {
          strayTicks.push({ start, end: runEnd });
        } else {
          code.push({ start, end, kind: 'span' });
          token.lastIndex = end;
        }
        continue;
      }
      const end = tagEnd(start);
      if (end !== -1 && end <= gapEnd) {
        code.push({ start, end, kind: 'tag' });
        token.lastIndex = end;
      }
    }
    if (f < fences.length) {
      code.push({ ...fences[f], kind: 'fence' });
      if (m !== null && m.index < fences[f].end) {
        token.lastIndex = fences[f].end;
        m = token.exec(source);
      }
    }
  }
  return { code, strayTicks };
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
