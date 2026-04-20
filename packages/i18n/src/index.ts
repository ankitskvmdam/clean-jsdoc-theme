/**
 * @clean-jsdoc-theme/i18n
 *
 * Extract/translate/build i18n pipeline. Phase 1: type stubs.
 */

export interface LocaleFile {
  '@meta': {
    version: number;
    locale: string;
    lastExtracted?: string;
    fallback: string;
  };
  strings: Record<string, string>;
  orphaned: Record<string, string>;
}

export function createEmptyLocale(locale: string, fallback = 'en'): LocaleFile {
  return {
    '@meta': { version: 1, locale, fallback },
    strings: {},
    orphaned: {},
  };
}
