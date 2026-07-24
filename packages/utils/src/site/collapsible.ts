/**
 * Collapsible top-level sidebar sections — the build-time resolver for the
 * `collapsibleSidebarSections` opt. A function form is deliberately NOT
 * supported: the decision is static per build, and neither the pure
 * `SiteManifest` boundary nor the JSON island-props payload can carry a
 * function. All input forms resolve here to a concrete `string[]` of section
 * labels that rang renders as collapse toggles.
 */

import type { NavNode } from './manifest';

/** `boolean` (all / none) or an explicit allowlist of section labels. */
export type CollapsibleSidebarSections = boolean | string[];

/**
 * The distinct top-level section labels present in a nav tree, in first-seen
 * order. Mirrors rang's `groupNav` bucketing: a "section" is a run of non-menu
 * nodes sharing a truthy `group`. Menu entries and ungrouped nodes are ignored.
 */
export function topLevelSectionLabels(nav: readonly NavNode[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const node of nav) {
    if (node.menu) continue;
    const g = node.group;
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
  }
  return out;
}

/**
 * Resolve the config against the sections actually present:
 *  - `undefined` (default) or `true` → every present section is collapsible.
 *  - `false` → none.
 *  - `string[]` → only present sections whose label EXACTLY matches an entry
 *    (case-sensitive), keeping present order. Non-matching entries are dropped
 *    here and surfaced as a warning by the bridge (see
 *    {@link unmatchedCollapsibleSections}).
 * The result is always a subset of `present`, so rang can trust it.
 */
export function resolveCollapsibleSections(
  config: CollapsibleSidebarSections | undefined,
  present: readonly string[]
): string[] {
  if (config === false) return [];
  if (config === undefined || config === true) return [...present];
  const wanted = new Set(config);
  return present.filter((label) => wanted.has(label));
}

/** Array entries that matched no present section — for the bridge's warning. */
export function unmatchedCollapsibleSections(
  config: CollapsibleSidebarSections | undefined,
  present: readonly string[]
): string[] {
  if (!Array.isArray(config)) return [];
  const have = new Set(present);
  return config.filter((label) => !have.has(label));
}

/**
 * Normalize a raw opt value into the accepted shape, collecting human-readable
 * warnings (each bridge routes them to its own logger). Only `boolean` and
 * `string[]` are accepted; anything else falls back to `undefined` (default:
 * all sections collapsible) with a warning.
 */
export function normalizeCollapsibleSidebarSections(raw: unknown): {
  value: CollapsibleSidebarSections | undefined;
  warnings: string[];
} {
  if (raw === undefined) return { value: undefined, warnings: [] };
  if (typeof raw === 'boolean') return { value: raw, warnings: [] };
  if (Array.isArray(raw)) {
    const labels = raw.filter((x): x is string => typeof x === 'string');
    const warnings =
      labels.length !== raw.length
        ? ['collapsibleSidebarSections — ignoring non-string entries in the array.']
        : [];
    return { value: labels, warnings };
  }
  return {
    value: undefined,
    warnings: [
      `collapsibleSidebarSections must be a boolean or an array of section labels; got ${typeof raw}. Ignoring it (all sections collapsible).`,
    ],
  };
}
