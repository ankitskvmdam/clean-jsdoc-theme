/**
 * `sectionOrder` label check. A label that names no sidebar section is silently
 * ignored by the nav assembler, and — since an unlisted kind label is dropped —
 * a typo can quietly hide a whole section. The bridge reports these labels.
 */

import { suggestKey } from '../config/suggest';

/** A `sectionOrder` entry that names no known section. */
export interface UnknownSectionLabel {
  label: string;
  /** A near-miss known label (case-insensitive edit distance ≤ 2), if any. */
  suggestion?: string;
}

/**
 * `sectionOrder` entries that name no known section, each with a near-miss
 * hint. Matching is exact and case-sensitive, as the nav assembler matches.
 *
 * @param known Section labels, in suggestion priority order.
 * @param aliases Labels that are accepted but never suggested (v4's `Global`).
 */
export function unknownSectionOrderLabels(
  sectionOrder: readonly string[] | undefined,
  known: readonly string[],
  aliases: readonly string[] = []
): UnknownSectionLabel[] {
  if (!sectionOrder || sectionOrder.length === 0) return [];
  const accepted = new Set([...known, ...aliases]);
  const seen = new Set<string>();
  const out: UnknownSectionLabel[] = [];
  for (const label of sectionOrder) {
    if (accepted.has(label) || seen.has(label)) continue;
    seen.add(label);
    const suggestion = suggestKey(label, known);
    out.push(suggestion ? { label, suggestion } : { label });
  }
  return out;
}
