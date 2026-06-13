/**
 * Locale-config validation (`opts.locales` + `opts.defaultLocale`) — the single
 * config source for localization (the plan's decision 7: "Locales are declared
 * in jsdoc opts … validated through utils like every other opt").
 *
 * Posture mirrors the rest of opts validation (§5): a malformation is an error,
 * a soft issue is a warning. Pure + node-free.
 */

import type { DiagnosticBag } from './diagnostics';

/** One configured locale: its code and an optional display name for the switcher. */
export interface LocaleConfig {
  /** Locale code, e.g. `'en'`, `'fr'`, `'pt-BR'`. */
  code: string;
  /** Display label for the language switcher (defaults to the code if unset). */
  name?: string;
}

/** Normalized locale configuration — the default is always present in `locales`. */
export interface ValidatedLocales {
  /** All configured locales, in declaration order (includes the default). */
  locales: LocaleConfig[];
  /** The default locale's code — rendered unprefixed; every page must exist in it. */
  defaultLocale: string;
}

/** A locale code is non-empty and BCP-47-ish: letters/digits + `-` separators. */
const LOCALE_CODE_RE = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;

/**
 * Validate `opts.locales` + `opts.defaultLocale` into a {@link ValidatedLocales},
 * or `undefined` when localization is off (no `locales`). Collects diagnostics:
 *
 * - `locales` absent/empty → `undefined` (localization disabled; no diagnostic).
 * - a non-array `locales`, or an entry that is neither a non-empty string nor a
 *   `{ code }` object, or a malformed/duplicate code → `error` (dropped).
 * - `defaultLocale` set but not among `locales` → `error` (falls back to the
 *   first locale). `defaultLocale` unset → defaults to the first locale (`info`).
 */
export function validateLocales(
  localesRaw: unknown,
  defaultLocaleRaw: unknown,
  bag: DiagnosticBag
): ValidatedLocales | undefined {
  if (localesRaw == null) return undefined;

  if (!Array.isArray(localesRaw)) {
    bag.error('locales/invalid-type', 'locales must be an array of locale codes or objects.', {
      hint: "e.g. `['en', 'fr']` or `[{ code: 'en', name: 'English' }]`.",
      path: 'locales',
    });
    return undefined;
  }

  const locales: LocaleConfig[] = [];
  const seen = new Set<string>();

  localesRaw.forEach((entry, i) => {
    let code: string | undefined;
    let name: string | undefined;

    if (typeof entry === 'string') {
      code = entry.trim();
    } else if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const obj = entry as Record<string, unknown>;
      if (typeof obj.code === 'string') code = obj.code.trim();
      if (typeof obj.name === 'string' && obj.name.trim()) name = obj.name.trim();
    } else {
      bag.error('locales/invalid-entry', `locales[${i}] must be a string or a { code } object.`, {
        path: `locales.${i}`,
      });
      return;
    }

    if (!code) {
      bag.error('locales/empty-code', `locales[${i}] has no locale code.`, {
        hint: "e.g. 'fr' or { code: 'fr' }.",
        path: `locales.${i}`,
      });
      return;
    }
    if (!LOCALE_CODE_RE.test(code)) {
      bag.error('locales/invalid-code', `invalid locale code "${code}".`, {
        hint: 'use a BCP-47-style code: letters/digits, hyphen-separated (e.g. `pt-BR`).',
        path: `locales.${i}`,
      });
      return;
    }
    if (seen.has(code)) {
      bag.error('locales/duplicate', `duplicate locale "${code}".`, { path: `locales.${i}` });
      return;
    }

    seen.add(code);
    locales.push(name ? { code, name } : { code });
  });

  if (locales.length === 0) return undefined;

  // Resolve the default locale. Must be one of the configured locales.
  let defaultLocale = typeof defaultLocaleRaw === 'string' ? defaultLocaleRaw.trim() : '';
  if (defaultLocale && !seen.has(defaultLocale)) {
    bag.error('locales/default-not-listed', `defaultLocale "${defaultLocale}" is not in locales.`, {
      hint: `add it to locales, or pick one of: ${locales.map((l) => l.code).join(', ')}.`,
      path: 'defaultLocale',
    });
    defaultLocale = '';
  }
  if (!defaultLocale) {
    defaultLocale = locales[0].code;
    if (defaultLocaleRaw == null) {
      // Unset → implied default (advisory).
      bag.info('locales/default-implied', `defaultLocale defaults to "${defaultLocale}".`, {
        hint: 'set `defaultLocale` to choose the unprefixed locale explicitly.',
        path: 'defaultLocale',
      });
    } else if (typeof defaultLocaleRaw !== 'string' || defaultLocaleRaw.trim() === '') {
      // Set but unusable (non-string or blank) — distinct from a listed-but-unknown
      // code, which already errored above. Warn so the silent fallback is visible.
      bag.warning(
        'locales/default-ignored',
        `defaultLocale is not a usable code; using "${defaultLocale}".`,
        {
          hint: 'set `defaultLocale` to one of the configured locale codes.',
          path: 'defaultLocale',
        }
      );
    }
  }

  return { locales, defaultLocale };
}
