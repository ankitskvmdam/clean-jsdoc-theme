/**
 * `fonts` validation — keys must be a subset of `{ heading, body, mono }`, and
 * `heading`/`body` are existence-checked against Google Fonts via an injected
 * resolver (`mono` is a local CSS stack, never checked). Pure + node-free: the
 * one networked dependency arrives as the `fontResolver` argument.
 */

import type { DiagnosticBag } from './diagnostics';
import type { FontExistence } from './google-fonts';
import { FONT_KEYS } from './opts-schema';
import { suggestKey } from './suggest';

/** The validated font overrides — a clean subset of the recognized keys. */
export interface ValidatedFonts {
  heading?: string;
  body?: string;
  mono?: string;
}

/** Resolver signature — supplied by the bridge (defaults to fail-open offline). */
export type FontResolver = (family: string) => Promise<FontExistence>;

/** Keys that name a Google Fonts family (existence-checked); `mono` is excluded. */
const GOOGLE_FONT_KEYS = ['heading', 'body'] as const;

/** Build the "did you mean X?" tail for an unknown fonts key, when one is close. */
function suggestionHint(key: string): string {
  const guess = suggestKey(key, FONT_KEYS);
  return guess ? `did you mean \`${guess}\`?` : `expected one of: ${FONT_KEYS.join(', ')}.`;
}

/**
 * Validate `raw` (the user's `fonts` opt) into a clean {@link ValidatedFonts}.
 * Collects diagnostics into `bag`:
 *
 * - non-object (or array) → `error`, returns `{}`.
 * - keys outside `{ heading, body, mono }` → `warning` + suggestion, ignored.
 * - non-string values → `error` + hint, dropped.
 * - for `heading`/`body` only (not `mono`), `await fontResolver(name)`:
 *   - `'missing'` → `error` (not a Google Font); the value is still returned so
 *     the bridge can decide to fall back to its default.
 *   - `'unknown'` → `info` (couldn't verify — offline?); used as-is.
 *   - `'exists'` → ok.
 *
 * When no `fontResolver` is supplied the existence check is skipped silently
 * (shape validation still runs).
 */
export async function validateFonts(
  raw: unknown,
  bag: DiagnosticBag,
  fontResolver?: FontResolver
): Promise<ValidatedFonts> {
  if (raw == null) return {};

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    bag.error('fonts/invalid-type', 'fonts must be an object.', {
      hint: 'use `{ heading, body, mono }` (any subset).',
      path: 'fonts',
    });
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const out: ValidatedFonts = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!(FONT_KEYS as readonly string[]).includes(key)) {
      bag.warning('fonts/unknown-key', `unknown fonts key "${key}"; ignoring.`, {
        hint: suggestionHint(key),
        path: `fonts.${key}`,
      });
      continue;
    }
    if (value == null) continue;
    if (typeof value !== 'string') {
      bag.error('fonts/invalid-value', `fonts.${key} must be a string.`, {
        hint:
          key === 'mono'
            ? 'expected a CSS font-family stack.'
            : 'expected a Google Fonts family name (e.g. "Roboto").',
        path: `fonts.${key}`,
      });
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) out[key as keyof ValidatedFonts] = trimmed;
  }

  // Existence-check the Google-Fonts-backed keys (heading/body) when a resolver
  // is available. Done after shape validation so only clean string values flow
  // in; checks run concurrently since each family is independent.
  if (fontResolver) {
    await Promise.all(
      GOOGLE_FONT_KEYS.map(async (key) => {
        const family = out[key];
        if (!family) return;
        const verdict = await fontResolver(family);
        if (verdict === 'missing') {
          bag.error(
            'fonts/not-google',
            `Font "${family}" is not a Google Font; falling back to the default.`,
            {
              hint: 'pick a family from https://fonts.google.com.',
              path: `fonts.${key}`,
            }
          );
        } else if (verdict === 'unknown') {
          bag.info('fonts/unverified', `couldn't verify "${family}" (offline?); using it as-is.`, {
            path: `fonts.${key}`,
          });
        }
      })
    );
  }

  return out;
}
