/**
 * The translation core: the immutable per-render i18n value and the lookup
 * functions that resolve a key through the fallback chain.
 *
 * **Fallback chain (the locked decision):** active locale → default locale →
 * the key itself (chrome) or the source text (API slots). An *empty-string*
 * value counts as untranslated and falls through — so a half-filled catalog
 * shows the default, never a blank.
 *
 * Pure + browser-safe — no store, no reactivity, no I/O.
 */

import { EN_CHROME_FLAT, type ChromeKey, type Messages } from './catalog';
import { interpolate, type InterpolationVars } from './interpolate';

/**
 * The immutable i18n value carried per render. There is no setter: locale never
 * changes at runtime (it's a build dimension), so this is a static carrier, not
 * a store. `messages` is the active locale; `fallback` is the default locale
 * (typically English) consulted when a key is missing/empty.
 */
export interface I18n {
  /** Active locale code, e.g. `'fr'`. */
  locale: string;
  /** Default locale code, e.g. `'en'`. */
  defaultLocale: string;
  /** Active-locale messages (`chrome.*` + `api.*`, flat dotted keys). */
  messages: Messages;
  /** Default-locale messages, the second link in the fallback chain. */
  fallback: Messages;
}

/**
 * The `t` function shape. {@link ChromeKey} gives autocomplete + compile-checks
 * on chrome keys; `(string & {})` keeps the union open for dynamic `api.*` slot
 * keys without widening away the literal suggestions.
 */
export type TFunc = (key: ChromeKey | (string & {}), vars?: InterpolationVars) => string;

/** A non-empty string, else `undefined` (empty counts as untranslated). */
function nonEmpty(value: string | undefined): string | undefined {
  return value != null && value !== '' ? value : undefined;
}

/**
 * Build an {@link I18n} value, defaulting both `defaultLocale` and the
 * `fallback` map to the canonical English chrome catalog. Callers (islands, SSR)
 * pass the active `messages`; the EN chrome baseline guarantees chrome keys
 * always resolve to *something* even before any translation exists.
 */
export function createI18n(opts: {
  locale: string;
  messages: Messages;
  defaultLocale?: string;
  /** Default-locale messages. Defaults to the EN chrome baseline. */
  fallback?: Messages;
}): I18n {
  return {
    locale: opts.locale,
    defaultLocale: opts.defaultLocale ?? 'en',
    messages: opts.messages,
    fallback: opts.fallback ?? EN_CHROME_FLAT,
  };
}

/**
 * The default i18n value used when no provider is mounted — pure English chrome,
 * active === fallback. This is what guarantees the **byte-identical no-locale
 * path**: with no locales configured, `t` returns exactly the EN strings.
 */
export const DEFAULT_I18N: I18n = {
  locale: 'en',
  defaultLocale: 'en',
  messages: EN_CHROME_FLAT,
  fallback: EN_CHROME_FLAT,
};

/**
 * Resolve a key to its raw (un-interpolated) string via active → default, or
 * `undefined` if neither locale has it. Exposed for callers that need to detect
 * a miss (e.g. to substitute API source text as the final fallback).
 */
export function resolve(i18n: I18n, key: string): string | undefined {
  return nonEmpty(i18n.messages[key]) ?? nonEmpty(i18n.fallback[key]);
}

/**
 * Translate a chrome key. Fallback chain: active → default → **the key itself**
 * (a visible miss beats a blank), then interpolate.
 */
export function translate(i18n: I18n, key: string, vars?: InterpolationVars): string {
  return interpolate(resolve(i18n, key) ?? key, vars);
}

/**
 * Translate an API slot. Same chain, but the final fallback is the **source
 * text** (the original doclet description), per the locked decision that API
 * text falls back to source, never to a key.
 */
export function translateSlot(
  i18n: I18n,
  key: string,
  sourceText: string,
  vars?: InterpolationVars
): string {
  return interpolate(resolve(i18n, key) ?? sourceText, vars);
}
