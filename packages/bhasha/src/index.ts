/**
 * `@clean-jsdoc-theme/bhasha` — the pure, browser-safe i18n core.
 *
 * Phase 0 surface: the chrome catalog + derived key type, the `t` translator and
 * its fallback chain, the `LanguageProvider` static carrier + `useTranslation`
 * hook, the API-slot key scheme + source-hash, and the validation primitives.
 *
 * Everything here is isomorphic — zero `node:*` (rang bundles it into the
 * browser). The disk-bound work (extract/build/translate) lives in aadesh.
 */

export {
  EN_CHROME,
  EN_CHROME_FLAT,
  type ChromeCatalog,
  type ChromeKey,
  type Messages,
} from './catalog';

export { interpolate, interpolationTokens, type InterpolationVars } from './interpolate';

export {
  createI18n,
  DEFAULT_I18N,
  resolve,
  translate,
  translateSlot,
  type I18n,
  type TFunc,
} from './translate';

export { LanguageProvider, useI18n, useTranslation } from './provider';

export { API_NAMESPACE, apiSlotKey, isApiKey, isChromeKey, sourceHash } from './keys';

export {
  catalogCoverage,
  lintSlotMarkdown,
  validateCatalogShape,
  validateTokenParity,
} from './validate';
