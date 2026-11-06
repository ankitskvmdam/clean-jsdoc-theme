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

// Blockquote markers opening a line, each `>` with up to three spaces before
// it and one optional space after. Its `>` count is the line's quote depth.
const QUOTE_PREFIX = /^(?:[ \t]{0,3}>[ \t]?)*/;
// One list-item marker plus its following space(s).
const LIST_MARKER = String.raw`(?:[-*+]|\d{1,9}[.)])[ \t]+`;

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
const FENCE_OPEN = new RegExp(String.raw`^([ \t]*(?:${LIST_MARKER})?)(\`{3,}|~{3,})(.*)$`);
// A fence closer: a run of the opener's character at least as long, then only
// whitespace. Group 1 is its indentation.
const FENCE_CLOSE = /^([ \t]*)(`{3,}|~{3,})[ \t]*$/;
// An HTML-comment block (CommonMark HTML block type 2): `<!--` after nothing
// but indentation and a list marker. Group 1 is that prefix.
const COMMENT_BLOCK = new RegExp(String.raw`^([ \t]*(?:${LIST_MARKER})?)<!--`);

// The rest are tested on a line with its quote prefix AND indentation removed.
const ATX_HEADING = /^#{1,6}(?:[ \t]|$)/;
const THEMATIC_BREAK = /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const SETEXT_UNDERLINE = /^(?:=+|-+)[ \t]*$/;
// A list item: group 1 the marker, group 2 the spaces after it, group 3 text.
const LIST_ITEM = /^([-*+]|\d{1,9}[.)])([ \t]+|$)(.*)$/;
// HTML blocks that may interrupt a paragraph (CommonMark start conditions 1-6;
// condition 7, any other tag, may not).
const HTML_BLOCK_START = new RegExp(
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
);

/** Column width of a run of spaces/tabs (tabs stop every four columns). */
function columns(ws: string): number {
  let n = 0;
  for (const ch of ws) n = ch === '\t' ? n + 4 - (n % 4) : n + 1;
  return n;
}

/** Block-level structure of a source: fences, comment blocks, paragraph breaks. */
interface BlockScan {
  fences: TextRange[];
  /** Comments that start a line (closed or not), in source order. */
  blockComments: HtmlCommentRange[];
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
 * One ordered pass over the lines, per CommonMark block parsing:
 *   - a fence opens only outside a comment block, and closes on a long-enough
 *     run of its character at the same quote depth, indented at most three
 *     columns past the opener's prefix — or when the blockquote it opened in
 *     ends; a fence in a list item also ends when a non-blank line is indented
 *     less than the item's content;
 *   - a comment block (a line starting `<!--`) opens only outside a fence and
 *     runs through the line holding its `-->`, so a fence line inside one is
 *     not a fence;
 *   - a line ends the paragraph before it (a "break", where an inline comment
 *     must stop) only if CommonMark lets it interrupt a paragraph: blank, an
 *     ATX heading, a thematic break or setext underline, a fence, a comment or
 *     other HTML block of kinds 1-6, a bullet item or an ordered item starting
 *     at 1 (non-empty), or a deeper blockquote — and never when indented four
 *     or more columns past the paragraph's own content (that is continuation
 *     text). A shallower quote depth is a lazy continuation, not a break.
 */
function scanBlocks(source: string): BlockScan {
  const fences: TextRange[] = [];
  const blockComments: HtmlCommentRange[] = [];
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
  // The open paragraph, if any: its content column and quote depth.
  let para: { indent: number; depth: number } | undefined;
  let pos = 0;
  while (pos <= source.length) {
    const nl = source.indexOf('\n', pos);
    const lineEnd = nl === -1 ? source.length : nl;
    const line = source.slice(pos, lineEnd).replace(/\r$/, '');
    let next = nl === -1 ? source.length + 1 : nl + 1;

    const quote = QUOTE_PREFIX.exec(line)![0];
    let depth = 0;
    for (const ch of quote) if (ch === '>') depth++;
    const body = line.slice(quote.length);
    const ws = /^[ \t]*/.exec(body)![0];
    const indent = columns(ws);
    const rest = body.slice(ws.length);

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
      pos = next;
      continue;
    }

    // Inside a paragraph, indentation counts from the paragraph's content
    // column (a list item's text); four or more columns past it, or past the
    // margin when the line is outdented, is plain continuation text.
    const relIndent = para && indent >= para.indent ? indent - para.indent : indent;
    if (para && relIndent >= 4) {
      pos = next;
      continue;
    }

    const open = FENCE_OPEN.exec(body);
    const comment = open ? null : COMMENT_BLOCK.exec(body);
    const item = LIST_ITEM.exec(rest);
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
      const start = pos + quote.length + comment[1].length;
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
    } else if (
      ATX_HEADING.test(rest) ||
      THEMATIC_BREAK.test(rest) ||
      (para && SETEXT_UNDERLINE.test(rest))
    ) {
      // One-line blocks: the next line starts a new block too, so an inline
      // comment in a heading can't run on into it.
      breaks.push(pos, next);
      para = undefined;
    } else if (HTML_BLOCK_START.test(rest)) {
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
            : { indent: indent + item[1].length + columns(item[2]), depth };
      }
    } else if (para && depth > para.depth) {
      // A deeper blockquote starts here.
      breaks.push(pos);
      para = { indent, depth };
    } else if (!para) {
      para = { indent, depth };
    }
    pos = next;
  }
  if (fence) fences.push({ start: fence.start, end: source.length });
  return { fences, blockComments, breaks };
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
//   - an inline code span — CommonMark delimiter rules: a maximal run of N
//     backticks closes on the next maximal run of exactly N (backslashes are
//     literal INSIDE a span, so `a\` closes on the backtick after the
//     backslash), and it never crosses a blank line;
//   - an MDX JSX / HTML tag, whose quoted attribute values (double- or
//     single-quoted; MDX accepts both) are literal strings;
//   - a link/image tail `](destination "title")` — MDX takes destinations and
//     titles verbatim, so `[a](http://x/<!--y-->z)` keeps its URL (an escaped
//     `\]` is consumed above, so it opens no tail and protects nothing).
const TOKEN =
  /\\[^\n]|(?<!`)(`+)(?:[^\n]|\n(?![ \t\r]*\n))*?(?<!`)\1(?!`)|<\/?[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][\w-]*(?:="[^"]*"|='[^']*')?)*\s*\/?>|\]\((?:<[^<>\n]*>|(?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))*)(?:\s+(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)))?\s*\)|<!--/g;

/**
 * Every HTML comment in prose — outside fenced code, inline code, tags and link
 * destinations/titles — with CommonMark's extent:
 *   - one that starts a line (after any quote/list markers) is an HTML block
 *     and runs to the first `-->` anywhere, even across blank lines and fences
 *     (the usual way to comment out a whole section, code blocks included);
 *   - one inside a paragraph ends at the first `-->` before the paragraph does,
 *     so it may not cross a line that interrupts the paragraph (see
 *     `scanBlocks`);
 *   - `<!-->` and `<!--->` are complete empty comments.
 * An opener that finds no valid `-->` is reported with `closed: false`.
 */
export function htmlCommentRanges(source: string): HtmlCommentRange[] {
  const { fences, blockComments, breaks } = scanBlocks(source);
  // Fences and comment blocks never overlap (one pass decided both), so one
  // sorted list of regions the inline scan must skip, walked with a pointer.
  const regions: HtmlCommentRange[] = [
    ...fences.map((f) => ({ ...f, closed: true })),
    ...blockComments,
  ].sort((a, b) => a.start - b.start);
  let r = 0;
  const nextCloser = closerFinder(source);

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
      // A span/tag/link that would reach into a fence or comment block, or
      // across a line that ends the paragraph, is not one: the block ends the
      // paragraph first, and inline syntax never spans blocks. Rescan from the
      // next character.
      const end = start + m[0].length;
      if ((region && region.start < end) || firstAfter(breaks, start) < end) {
        re.lastIndex = start + 1;
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
