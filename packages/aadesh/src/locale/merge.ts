/**
 * Merge a regenerated {@link Template} into an existing locale file — the core of
 * `aadesh extract`. Classifies every key and produces the next file + a report:
 *
 *  - **added**    — a template key the file lacked (incl. one resurrected from
 *                   `_obsolete` because its symbol came back).
 *  - **stale**    — a translated (non-default) value whose source text changed
 *                   since it was translated (stored hash ≠ current hash).
 *  - **obsolete** — a key the file had but the template no longer does; soft-
 *                   deleted into `_obsolete` (the locked decision: a rename must
 *                   never hard-drop a translator's work) unless `prune` clears it.
 *  - **pruned**   — keys removed for good this run (only with `prune`).
 *
 * The **default locale** is the skeleton: its values are always re-synced to the
 * source text, so it's never "stale" and always 100% covered. Other locales keep
 * their translations; a changed source bumps the tracked hash and reports stale
 * once. Determinism: with no source change the output is byte-identical (zero
 * git diff) — values, hashes, and key order are all stable.
 */

import { flattenLocaleFile, obsoleteEntries, toLocaleFile } from './file';
import { emptyLocaleFile } from './file';
import type { FlatEntry, LocaleFile, Template } from './types';

export interface MergeOptions {
  /** Locale code, for the report. */
  locale: string;
  /** The default locale's file is the skeleton (values = source text). */
  isDefault?: boolean;
  /** Permanently remove obsolete entries instead of soft-deleting them. */
  prune?: boolean;
}

/** Classification of one extract/merge run. Drives the report + `aadesh prompt`. */
export interface MergeReport {
  locale: string;
  /** Keys newly added (need translation, unless default). */
  added: string[];
  /** Keys whose source drifted since translation (need review). */
  stale: string[];
  /** Keys gone from the template — soft-deleted (or pruned). */
  obsolete: string[];
  /** Keys permanently removed this run (only with `prune`). */
  pruned: string[];
  /** Active keys with a non-empty value. */
  translated: number;
  /** Total template keys. */
  total: number;
}

export interface MergeResult {
  file: LocaleFile;
  report: MergeReport;
}

/** Coverage ratio in [0, 1]; 1 for an empty template. */
export function coverageRatio(report: Pick<MergeReport, 'translated' | 'total'>): number {
  return report.total === 0 ? 1 : report.translated / report.total;
}

/**
 * Merge `template` into `existing` (or a fresh empty file on first run).
 */
export function mergeLocale(
  template: Template,
  existing: LocaleFile | null,
  opts: MergeOptions
): MergeResult {
  const isDefault = opts.isDefault ?? false;
  const prune = opts.prune ?? false;

  const base = existing ?? emptyLocaleFile();
  const activeIn = flattenLocaleFile(base);
  const obsoleteIn = obsoleteEntries(base);
  const templateKeys = new Set(template.map((t) => t.key));

  const activeOut = new Map<string, FlatEntry>();
  const added: string[] = [];
  const stale: string[] = [];

  for (const t of template) {
    const prevActive = activeIn.get(t.key);
    if (prevActive) {
      if (isDefault) {
        // Skeleton: always mirror the current source.
        activeOut.set(t.key, { value: t.source, hash: t.hash });
      } else {
        const value = prevActive.value;
        // A non-empty translation whose tracked hash no longer matches is stale.
        if (value !== '' && prevActive.hash !== t.hash) stale.push(t.key);
        activeOut.set(t.key, { value, hash: t.hash });
      }
      continue;
    }

    const prevObsolete = obsoleteIn.get(t.key);
    if (prevObsolete) {
      // The symbol came back: resurrect the retired translation rather than
      // re-asking for it. Counts as added (it re-enters the active set).
      const value = isDefault ? t.source : prevObsolete.value;
      if (!isDefault && value !== '' && prevObsolete.hash !== t.hash) stale.push(t.key);
      activeOut.set(t.key, { value, hash: t.hash });
      obsoleteIn.delete(t.key);
      added.push(t.key);
      continue;
    }

    // Brand new key.
    activeOut.set(t.key, { value: isDefault ? t.source : '', hash: t.hash });
    added.push(t.key);
  }

  // Keys the file had but the template dropped → obsolete (soft-delete or prune).
  const obsolete: string[] = [];
  const pruned: string[] = [];
  const obsoleteOut = new Map<string, FlatEntry>();
  for (const [key, entry] of activeIn) {
    if (templateKeys.has(key)) continue;
    obsolete.push(key);
    if (prune) pruned.push(key);
    else obsoleteOut.set(key, entry);
  }
  // Carry forward (or prune) entries already in `_obsolete` that weren't resurrected.
  for (const [key, entry] of obsoleteIn) {
    if (prune) pruned.push(key);
    else obsoleteOut.set(key, entry);
  }

  const file = toLocaleFile(
    activeOut,
    obsoleteOut,
    template.map((t) => t.key)
  );

  const translated = [...activeOut.values()].filter((e) => e.value !== '').length;

  return {
    file,
    report: {
      locale: opts.locale,
      added,
      stale,
      obsolete,
      pruned,
      translated,
      total: template.length,
    },
  };
}
