/**
 * Tiny dependency-free fuzzy matcher for the command palette (CtrlK).
 *
 * Matches a query as a case-insensitive subsequence of a target string and
 * scores it the way editor "fuzzy finders" do: matches at a word/camelCase
 * boundary and runs of consecutive matches score highest, earlier and shorter
 * matches break ties. Good enough for ranking page/symbol titles in a docs
 * site, and small enough to inline into the island chunk (no Fuse.js, etc.).
 */

/** A successful fuzzy match: a relevance score plus the matched char indices. */
export interface FuzzyMatch {
  /** Higher is better. Only meaningful relative to other matches of the same query. */
  score: number;
  /** Indices into the (original-case) target that the query matched, ascending. */
  positions: number[];
}

/** Characters that mark a word boundary; a match right after one scores higher. */
const SEPARATORS = new Set(['/', '.', '-', '_', ' ', ':', '~', '#']);

const BOUNDARY_BONUS = 10;
const CONSECUTIVE_BONUS = 6;
const MATCH_BONUS = 1;

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

function isLower(ch: string): boolean {
  return ch !== ch.toUpperCase() && ch === ch.toLowerCase();
}

/**
 * Match `query` against `target` as a subsequence. Returns `null` when not every
 * query character is found in order; an empty query matches everything with a
 * neutral score. Greedy left-to-right matching — optimal enough for the short
 * titles this ranks, and O(target length).
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  const q = query.toLowerCase();
  if (q.length === 0) return { score: 0, positions: [] };
  const t = target.toLowerCase();

  const positions: number[] = [];
  let qi = 0;
  let score = 0;
  let prevMatch = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;

    let bonus = MATCH_BONUS;
    const prev = ti > 0 ? target[ti - 1] : '';
    const atBoundary = ti === 0 || SEPARATORS.has(prev) || (isLower(prev) && isUpper(target[ti]));
    if (atBoundary) bonus += BOUNDARY_BONUS;
    if (ti === prevMatch + 1) bonus += CONSECUTIVE_BONUS;

    score += bonus;
    positions.push(ti);
    prevMatch = ti;
    qi++;
  }

  if (qi < q.length) return null; // ran out of target before matching all of query

  // Tie-breakers: prefer an earlier first match and a shorter target.
  score -= positions[0] * 0.5;
  score -= (t.length - q.length) * 0.1;
  return { score, positions };
}

/** A ranked search hit: the original item plus its match metadata. */
export interface FuzzyResult<T> {
  item: T;
  match: FuzzyMatch;
}

/**
 * Rank `items` against `query` by fuzzy-matching the string `getText` returns.
 * Non-matches are dropped; ties break by shorter text then original order
 * (`sort` is stable). An empty query returns the first `limit` items unranked,
 * so the palette can show the full list before the user types.
 */
export function fuzzySearch<T>(
  query: string,
  items: readonly T[],
  getText: (item: T) => string,
  limit = 25
): FuzzyResult<T>[] {
  if (query.trim().length === 0) {
    return items.slice(0, limit).map((item) => ({ item, match: { score: 0, positions: [] } }));
  }
  const hits: FuzzyResult<T>[] = [];
  for (const item of items) {
    const match = fuzzyMatch(query, getText(item));
    if (match) hits.push({ item, match });
  }
  hits.sort(
    (a, b) => b.match.score - a.match.score || getText(a.item).length - getText(b.item).length
  );
  return hits.slice(0, limit);
}

/** One weighted field of an item to fuzzy-match against (see {@link fuzzySearchMulti}). */
export interface FuzzyField<T> {
  /** Extract the field's text; `undefined`/empty fields are skipped. */
  get: (item: T) => string | undefined;
  /** Score multiplier — a title typically outweighs body content. */
  weight: number;
  /** When this field matches, its positions drive highlighting (the title). */
  highlight?: boolean;
}

/**
 * Like {@link fuzzySearch} but scores each item across several weighted fields
 * (e.g. title + description + full content) and keeps its best-scoring field.
 * An item matches if *any* field matches; the score is the max weighted field
 * score, so a title hit outranks a body-only hit. Highlight positions come from
 * the `highlight` field when it matched, else none (the item still shows, just
 * without emphasis). An empty query returns the first `limit` items unranked.
 */
export function fuzzySearchMulti<T>(
  query: string,
  items: readonly T[],
  fields: readonly FuzzyField<T>[],
  limit = 25
): FuzzyResult<T>[] {
  if (query.trim().length === 0) {
    return items.slice(0, limit).map((item) => ({ item, match: { score: 0, positions: [] } }));
  }
  const hits: FuzzyResult<T>[] = [];
  for (const item of items) {
    let best = -Infinity;
    let positions: number[] = [];
    let matched = false;
    for (const field of fields) {
      const text = field.get(item);
      if (!text) continue;
      const m = fuzzyMatch(query, text);
      if (!m) continue;
      matched = true;
      if (field.highlight) positions = m.positions;
      const weighted = m.score * field.weight;
      if (weighted > best) best = weighted;
    }
    if (matched) hits.push({ item, match: { score: best, positions } });
  }
  hits.sort((a, b) => b.match.score - a.match.score);
  return hits.slice(0, limit);
}

/** A run of text tagged as matched or not — for rendering highlighted titles. */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Split `text` into alternating matched / unmatched runs given the matched
 * `positions` (as returned in {@link FuzzyMatch.positions}). Adjacent chars of
 * the same kind are merged so the caller emits the fewest possible nodes.
 */
export function highlightSegments(text: string, positions: readonly number[]): HighlightSegment[] {
  if (positions.length === 0) return text ? [{ text, match: false }] : [];
  const hit = new Set(positions);
  const segments: HighlightSegment[] = [];
  for (let i = 0; i < text.length; i++) {
    const match = hit.has(i);
    const last = segments[segments.length - 1];
    if (last && last.match === match) last.text += text[i];
    else segments.push({ text: text[i], match });
  }
  return segments;
}
