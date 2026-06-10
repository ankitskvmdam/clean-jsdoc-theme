/**
 * Near-miss key suggestions — a small Levenshtein distance used to turn an
 * unknown opt key into a "did you mean X?" hint. Pure + node-free.
 *
 * Used by the unknown-key policy: for a key not in the recognized set, pick the
 * closest known key and, when it's close enough, surface it as a typo hint.
 */

/**
 * Levenshtein edit distance between two strings (insert/delete/substitute, each
 * cost 1). Iterative two-row DP — O(a·b) time, O(min) space. Comparison is
 * case-sensitive; lowercase both sides first if you want it case-insensitive.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Keep the shorter string as the column axis to bound the row width.
  if (a.length > b.length) [a, b] = [b, a];

  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  let curr = new Array<number>(a.length + 1);

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1, // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[a.length];
}

/**
 * Suggest the closest entry in `candidates` to `input`, or `undefined` when
 * nothing is close enough. Matching is case-insensitive; `maxDistance` (default
 * `2`) is the inclusive edit-distance threshold — a far-off key (no candidate
 * within the threshold) returns `undefined` so we never invent a bad "did you
 * mean". Ties resolve to the first candidate at the best distance.
 */
export function suggestKey(
  input: string,
  candidates: Iterable<string>,
  maxDistance = 2,
): string | undefined {
  const needle = input.toLowerCase();
  let best: string | undefined;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshtein(needle, candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      if (bestDistance === 0) break;
    }
  }

  return bestDistance <= maxDistance ? best : undefined;
}
