/**
 * Translatable API slots — the locale-independent template half of the two-phase
 * localization build (see `packages/aadesh-bhasha-plan.md`, Phase 2).
 *
 * Every translatable doclet prose field (a description, a `@summary`, an
 * `@example` caption) is funneled through {@link resolveSlotText} as its source
 * string is read, *before* it's converted to mdast. With no resolver the source
 * passes through untouched, so the default (no-locale) build is byte-identical.
 * When a resolver is threaded in, each slot is (a) recorded for extraction via
 * `collect` and (b) substituted with the active locale's translation via
 * `translate` — so the very same build pass, re-run with a translating resolver,
 * is the per-locale "stamp".
 *
 * Keys + hashes come from bhasha (`apiSlotKey` / `sourceHash`) so setu and aadesh
 * agree on identity and staleness. Only prose is a slot: names, type strings,
 * enum values, and `@example` code stay locale-invariant.
 */

import { apiSlotKey, sourceHash } from '@clean-jsdoc-theme/bhasha';
import type { SlotEntry } from '@clean-jsdoc-theme/utils';

/**
 * Build-time resolver threaded through the doclet→mdast conversion. Both hooks
 * are optional: `collect` records a slot for the extractable template, `translate`
 * swaps in a locale's text. Omit both (or the whole resolver) for the
 * byte-identical default build.
 */
export interface SlotResolver {
  /** Record a slot as its source string is read (template extraction). */
  collect?: (entry: SlotEntry) => void;
  /**
   * Return the active-locale text for `key`, or `sourceText` when untranslated.
   * Whatever it returns is fed to the same mdast converter as the source, so a
   * translation must be authored in the source's format (HTML/Markdown prose).
   */
  translate?: (key: string, sourceText: string) => string;
}

/**
 * Resolve one translatable prose field to the string that should be rendered:
 * collect it (for extraction) and translate it (for stamping). Empty/absent
 * source, an absent longname, or no resolver all short-circuit to the source
 * unchanged — so nothing is keyed or substituted when there's nothing to
 * translate, and the default build is byte-identical.
 *
 * @param longname - The owning symbol's longname (the key's namespace).
 * @param field - Field path within the doclet (e.g. `'description'` or
 *   `['examples', '0', 'caption']`); must be `#`-free (bhasha key invariant).
 */
export function resolveSlotText(
  resolver: SlotResolver | undefined,
  longname: string | undefined,
  field: string | readonly string[],
  sourceText: string | null | undefined
): string | null | undefined {
  if (!sourceText || !longname || !resolver) return sourceText;
  const key = apiSlotKey(longname, field);
  resolver.collect?.({ key, sourceText, hash: sourceHash(sourceText) });
  const translated = resolver.translate?.(key, sourceText);
  // An empty translation counts as untranslated → fall back to the source.
  return translated != null && translated !== '' ? translated : sourceText;
}

/**
 * Accumulate {@link SlotEntry}s into a deduped, insertion-ordered list — the
 * `manifest.slots` template. Dedup is by key (the same symbol+field is rendered
 * once per build, but the collector tolerates repeats); the first-seen source
 * wins, which is deterministic given setu's stable build order.
 */
export class SlotCollector {
  private readonly byKey = new Map<string, SlotEntry>();

  /** A `collect` hook bound to this collector, for a {@link SlotResolver}. */
  readonly collect = (entry: SlotEntry): void => {
    if (!this.byKey.has(entry.key)) this.byKey.set(entry.key, entry);
  };

  /** The collected slots, in first-seen order. */
  list(): SlotEntry[] {
    return [...this.byKey.values()];
  }
}

/**
 * Make a `translate` hook from a flat locale message map (`key → translated
 * text`). A missing or empty entry falls back to the source string, so a
 * partially-translated catalog renders the default text for the gaps.
 */
export function makeSlotTranslator(
  messages: Readonly<Record<string, string>>
): NonNullable<SlotResolver['translate']> {
  return (key, sourceText) => {
    const value = messages[key];
    return value != null && value !== '' ? value : sourceText;
  };
}
