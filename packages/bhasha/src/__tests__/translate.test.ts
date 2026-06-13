import { describe, expect, it } from 'vitest';
import { createI18n, DEFAULT_I18N, resolve, translate, translateSlot } from '../translate';
import { EN_CHROME_FLAT } from '../catalog';

const i18n = createI18n({
  locale: 'fr',
  messages: {
    'chrome.search.placeholder': 'Rechercher…',
    'chrome.theme.switchTo': 'Passer au thème {mode}',
    'chrome.nav.menu': '', // present but empty → untranslated
  },
  fallback: EN_CHROME_FLAT,
});

describe('resolve — fallback chain', () => {
  it('prefers the active locale', () => {
    expect(resolve(i18n, 'chrome.search.placeholder')).toBe('Rechercher…');
  });

  it('falls through to the default locale when a key is absent', () => {
    expect(resolve(i18n, 'chrome.search.recent')).toBe('Recent');
  });

  it('treats an empty active value as untranslated and falls through', () => {
    expect(resolve(i18n, 'chrome.nav.menu')).toBe('Menu');
  });

  it('returns undefined when neither locale has the key', () => {
    expect(resolve(i18n, 'chrome.does.not.exist')).toBeUndefined();
  });
});

describe('translate', () => {
  it('returns the active translation', () => {
    expect(translate(i18n, 'chrome.search.placeholder')).toBe('Rechercher…');
  });

  it('interpolates the resolved string', () => {
    expect(translate(i18n, 'chrome.theme.switchTo', { mode: 'sombre' })).toBe(
      'Passer au thème sombre'
    );
  });

  it('falls back to the key itself when missing in both locales', () => {
    expect(translate(i18n, 'chrome.unknown.key')).toBe('chrome.unknown.key');
  });

  it('default i18n returns exact English chrome (byte-identical baseline)', () => {
    expect(translate(DEFAULT_I18N, 'chrome.pager.next')).toBe('Next');
    expect(translate(DEFAULT_I18N, 'chrome.settings.title')).toBe('Settings');
  });
});

describe('translateSlot — API slots fall back to source text', () => {
  it('uses the translation when present', () => {
    const slots = createI18n({
      locale: 'fr',
      messages: { 'api.Foo#description': 'La classe Foo.' },
    });
    expect(translateSlot(slots, 'api.Foo#description', 'The Foo class.')).toBe('La classe Foo.');
  });

  it('falls back to the source text, never the key', () => {
    const slots = createI18n({ locale: 'fr', messages: {} });
    expect(translateSlot(slots, 'api.Foo#description', 'The Foo class.')).toBe('The Foo class.');
  });

  it('interpolates the source-text fallback too', () => {
    const slots = createI18n({ locale: 'fr', messages: {} });
    expect(translateSlot(slots, 'api.X#d', 'Has {count} items', { count: 2 })).toBe('Has 2 items');
  });
});

describe('createI18n defaults', () => {
  it('defaults defaultLocale to en and fallback to the EN chrome baseline', () => {
    const v = createI18n({ locale: 'hi', messages: {} });
    expect(v.defaultLocale).toBe('en');
    expect(v.fallback).toBe(EN_CHROME_FLAT);
  });
});
