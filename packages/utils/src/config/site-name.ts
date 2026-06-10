/**
 * `siteName` validation — strict shape checking + diagnostics on top of the
 * lenient resolution `prepareSiteName` does in the bridge. Validation only
 * checks the *shape*; the bridge still does the file-copy I/O for local logo
 * paths. Pure + node-free.
 */

import type { SiteLogo, SiteName } from '../site/site-name';
import type { DiagnosticBag } from './diagnostics';
import { SITE_LOGO_KEYS } from './opts-schema';
import { suggestKey } from './suggest';

/** Logo sub-keys that carry an image source (vs. the `alt` text label). */
const IMAGE_KEYS = ['default', 'dark', 'light'] as const;

/** Build the "did you mean X?" tail for an unknown sub-key, when one is close. */
function suggestionHint(key: string): string {
  const guess = suggestKey(key, SITE_LOGO_KEYS);
  return guess ? `did you mean \`${guess}\`?` : `expected one of: ${SITE_LOGO_KEYS.join(', ')}.`;
}

/**
 * Validate `raw` (the user's `siteName` opt) into a clean {@link SiteName}, or
 * `undefined` when it carries nothing usable. Collects diagnostics into `bag`:
 *
 * - `string` → trimmed; empty → `undefined` (no diagnostic — an omitted name).
 * - object → only `{ default?, dark?, light?, alt? }` are recognized:
 *   - unknown sub-keys → `warning` + a typo suggestion, then ignored.
 *   - non-string values → `error` + hint, then dropped.
 *   - a set with no image source AND no `alt` → `warning` (nothing to render).
 * - any other type (number/boolean/array/…) → `error`, returns `undefined`.
 */
export function validateSiteName(raw: unknown, bag: DiagnosticBag): SiteName | undefined {
  if (raw == null) return undefined;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    bag.error('siteName/invalid-type', 'siteName must be a string or a logo set.', {
      hint: 'use a string (header text) or an object `{ default, dark, light, alt }`.',
      path: 'siteName',
    });
    return undefined;
  }

  const obj = raw as Record<string, unknown>;
  const out: SiteLogo = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!(SITE_LOGO_KEYS as readonly string[]).includes(key)) {
      bag.warning('siteName/unknown-key', `unknown siteName key "${key}"; ignoring.`, {
        hint: suggestionHint(key),
        path: `siteName.${key}`,
      });
      continue;
    }
    if (value == null) continue;
    if (typeof value !== 'string') {
      bag.error('siteName/invalid-value', `siteName.${key} must be a string.`, {
        hint:
          key === 'alt'
            ? 'expected a text label.'
            : 'expected a string path/URL (a local path, `http(s)://`, or `data:` URI).',
        path: `siteName.${key}`,
      });
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) out[key as keyof SiteLogo] = trimmed;
  }

  const hasImage = IMAGE_KEYS.some((k) => out[k]);
  const hasAlt = typeof out.alt === 'string' && out.alt.length > 0;

  if (!hasImage && !hasAlt) {
    bag.warning('siteName/empty', 'siteName has no usable image or text; ignoring.', {
      hint: 'set at least one of `default`/`dark`/`light` (an image) or `alt` (text).',
      path: 'siteName',
    });
    return undefined;
  }

  return out;
}
