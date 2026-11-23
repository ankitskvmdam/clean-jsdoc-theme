/**
 * `sectionOrder` label check. A label that names no sidebar section is silently
 * ignored by the nav assembler, and — since an unlisted kind label is dropped —
 * a typo can quietly hide a whole section. The bridge reports these labels.
 */

import { suggestKey } from '../config/suggest';

/** A `sectionOrder` entry that names no known section. */
export interface UnknownSectionLabel {
  label: string;
  /** A near-miss known label (see {@link suggestionDistance}), if any. */
  suggestion?: string;
  /** Why a theme-placed entry can't be ordered here; replaces `suggestion`. */
  hint?: string;
}

/**
 * Sidebar entries the theme places itself, never by `sectionOrder` — listing
 * them is reported with a specific hint rather than a did-you-mean.
 */
const THEME_PLACED_HINTS: Readonly<Record<string, string>> = {
  Home: 'always first; place it with `menu`, not sectionOrder',
  'Source Files': 'always last; place it with `menu`, not sectionOrder',
};

/**
 * Edit distance allowed for a did-you-mean, scaled to the label's length so a
 * short label needs a closer match (`Home` must not suggest `Core`).
 */
function suggestionDistance(label: string): number {
  return Math.min(2, Math.floor(label.length / 3));
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
    const hint = Object.hasOwn(THEME_PLACED_HINTS, label) ? THEME_PLACED_HINTS[label] : undefined;
    if (hint) {
      out.push({ label, hint });
      continue;
    }
    const suggestion = suggestKey(label, known, suggestionDistance(label));
    out.push(suggestion ? { label, suggestion } : { label });
  }
  return out;
}
