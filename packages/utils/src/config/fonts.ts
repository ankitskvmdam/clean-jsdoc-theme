/**
 * `fonts` validation — keys must be a subset of `{ heading, body, mono }`,
 * optionally prefixed with a locale code (`ja:heading`, `hi:body`) to override
 * the font for that locale only. `heading`/`body` families (base AND per-locale)
 * are existence-checked against Google Fonts via an injected resolver (`mono` is
 * a local CSS stack, never checked). Pure + node-free: the one networked
 * dependency arrives as the `fontResolver` argument.
 */

import type { DiagnosticBag } from './diagnostics';
import type { FontExistence } from './google-fonts';
import { FONT_KEYS } from './opts-schema';
import { suggestKey } from './suggest';

/** One font triple — any subset of `{ heading, body, mono }`. */
export interface FontSet {
  heading?: string;
  body?: string;
  mono?: string;
}

/**
 * The validated font overrides. The top-level `heading`/`body`/`mono` are the
 * default (and default-locale) fonts; `locales` carries per-locale overrides
 * (from `<code>:heading`-style keys). A locale that omits a slot falls back to
 * the top-level font, then to the theme default — resolved by the bridge per
 * build (each locale is its own static render).
 */
export interface ValidatedFonts extends FontSet {
  /** Per-locale font overrides, keyed by locale code (e.g. `{ ja: { heading } }`). */
  locales?: Record<string, FontSet>;
}

/**
 * Split a fonts key into its optional locale prefix + slot. `heading` →
 * `{ slot: 'heading' }`; `ja:heading` → `{ locale: 'ja', slot: 'heading' }`. A
 * leading `:` (empty locale) is treated as no locale, so the slot check rejects it.
 */
function parseFontKey(key: string): { locale?: string; slot: string } {
  const colon = key.indexOf(':');
  if (colon > 0) return { locale: key.slice(0, colon), slot: key.slice(colon + 1) };
  return { slot: key };
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
 * - keys whose slot is outside `{ heading, body, mono }` → `warning` +
 *   suggestion, ignored. Keys may carry a `<locale>:` prefix (`ja:heading`) to
 *   target one locale; the slot after the prefix is what's checked.
 * - non-string values → `error` + hint, dropped.
 * - for `heading`/`body` slots only (not `mono`), base AND per-locale, `await
 *   fontResolver(name)`:
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
      hint: 'use `{ heading, body, mono }` (optionally `<locale>:heading`), any subset.',
      path: 'fonts',
    });
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const out: ValidatedFonts = {};

  for (const [key, value] of Object.entries(obj)) {
    const { locale, slot } = parseFontKey(key);
    if (!(FONT_KEYS as readonly string[]).includes(slot)) {
      bag.warning('fonts/unknown-key', `unknown fonts key "${key}"; ignoring.`, {
        hint: suggestionHint(slot),
        path: `fonts.${key}`,
      });
      continue;
    }
    if (value == null) continue;
    if (typeof value !== 'string') {
      bag.error('fonts/invalid-value', `fonts.${key} must be a string.`, {
        hint:
          slot === 'mono'
            ? 'expected a CSS font-family stack.'
            : 'expected a Google Fonts family name (e.g. "Roboto").',
        path: `fonts.${key}`,
      });
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    if (locale) {
      out.locales ??= {};
      (out.locales[locale] ??= {})[slot as keyof FontSet] = trimmed;
    } else {
      out[slot as keyof FontSet] = trimmed;
    }
  }

  // Existence-check the Google-Fonts-backed slots (heading/body), base AND
  // per-locale, when a resolver is available. Done after shape validation so
  // only clean string values flow in; checks run concurrently (each is
  // independent) and report against the originating key path (`fonts.ja:heading`).
  if (fontResolver) {
    const checks: Array<{ path: string; family: string }> = [];
    for (const slot of GOOGLE_FONT_KEYS) {
      if (out[slot]) checks.push({ path: `fonts.${slot}`, family: out[slot] as string });
    }
    for (const [locale, set] of Object.entries(out.locales ?? {})) {
      for (const slot of GOOGLE_FONT_KEYS) {
        if (set[slot]) checks.push({ path: `fonts.${locale}:${slot}`, family: set[slot] as string });
      }
    }
    await Promise.all(
      checks.map(async ({ path, family }) => {
        const verdict = await fontResolver(family);
        if (verdict === 'missing') {
          bag.error(
            'fonts/not-google',
            `Font "${family}" is not a Google Font; falling back to the default.`,
            {
              hint: 'pick a family from https://fonts.google.com.',
              path,
            }
          );
        } else if (verdict === 'unknown') {
          bag.info('fonts/unverified', `couldn't verify "${family}" (offline?); using it as-is.`, {
            path,
          });
        }
      })
    );
  }

  return out;
}
