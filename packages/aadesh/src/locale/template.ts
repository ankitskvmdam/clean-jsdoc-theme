/**
 * Build the locale-independent template from a built site: every translatable
 * key with its current source text + hash. This is the regenerate-on-build
 * artifact the merge diffs each locale file against — never committed (the plan,
 * §5: "the structural template … is an internal regenerate-on-build artifact").
 *
 * Two sources, one flat key space:
 *  - **chrome** — bhasha's `EN_CHROME_FLAT` (the canonical UI strings), in
 *    declaration order; hash computed here.
 *  - **api** — the `SiteManifest.slots` setu collected (descriptions, summaries,
 *    example captions), which already carry source + hash, in first-seen order.
 *
 * Chrome and api keys never collide (`chrome.*` vs `api.*`), so the merged list
 * is a single deterministic key space.
 */

import { EN_CHROME_FLAT, sourceHash } from '@clean-jsdoc-theme/bhasha';
import type { SlotEntry } from '@clean-jsdoc-theme/utils';
import type { Template, TemplateEntry } from './types';

/**
 * Assemble the template from the API slots setu emitted (`manifest.slots`). The
 * chrome half is constant (bhasha's catalog); the api half varies per project.
 * Deterministic order — chrome (EN order) then api (slot order), deduped by key.
 */
export function buildTemplate(slots: readonly SlotEntry[] = []): Template {
  const out: TemplateEntry[] = [];
  const seen = new Set<string>();

  for (const [key, source] of Object.entries(EN_CHROME_FLAT)) {
    seen.add(key);
    out.push({ key, source, hash: sourceHash(source) });
  }

  for (const slot of slots) {
    if (seen.has(slot.key)) continue; // dedupe (manifest.slots is already deduped)
    seen.add(slot.key);
    out.push({ key: slot.key, source: slot.sourceText, hash: slot.hash });
  }

  return out;
}
