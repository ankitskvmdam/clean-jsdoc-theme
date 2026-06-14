/**
 * `LanguageProvider` + `useTranslation` — the Preact seam for the translation
 * core.
 *
 * The provider is a **static carrier**, not a store: it scopes an immutable
 * {@link I18n} value over a subtree, with no setter and no reactivity (locale is
 * a build dimension, fixed for the life of a render). On the server it wraps the
 * page render; in the browser each island hydrates as its own root, so each
 * island must wrap itself with `LanguageProvider`, seeded from its
 * `data-island-props` payload (wired in rang's Phase 1 refactor).
 *
 * The context default is {@link DEFAULT_I18N} (pure English chrome), so a
 * component used with **no** provider still renders exact English — the basis of
 * the byte-identical no-locale guarantee.
 *
 * Pure + browser-safe (Preact only, no `node:*`).
 */

import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext, useMemo } from 'preact/hooks';
import { DEFAULT_I18N, translate, type I18n, type TFunc } from './translate';

/** The per-render i18n context. Defaults to English chrome (no provider needed). */
const I18nContext = createContext<I18n>(DEFAULT_I18N);

/**
 * Scope an immutable {@link I18n} value over `children`. Immutable by design —
 * there is no setter; to "change language" you navigate to another locale's
 * statically-rendered site.
 */
export function LanguageProvider({
  value,
  children,
}: {
  value: I18n;
  children: ComponentChildren;
}) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Read the active i18n value (for cases that need `locale` directly, e.g. the
 * language switcher's current selection).
 */
export function useI18n(): I18n {
  return useContext(I18nContext);
}

/**
 * The translation hook. Returns a memoized `t` (stable across renders while the
 * carried value is unchanged — safe because the value is immutable) plus the
 * active `locale`.
 */
export function useTranslation(): { t: TFunc; locale: string } {
  const i18n = useContext(I18nContext);
  const t = useMemo<TFunc>(() => (key, vars) => translate(i18n, key, vars), [i18n]);
  return { t, locale: i18n.locale };
}
