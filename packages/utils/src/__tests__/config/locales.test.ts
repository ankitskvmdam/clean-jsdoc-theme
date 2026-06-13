import { describe, it, expect } from 'vitest';
import { DiagnosticBag } from '../../config/diagnostics';
import { validateLocales } from '../../config/locales';

function run(locales: unknown, defaultLocale?: unknown) {
  const bag = new DiagnosticBag();
  const value = validateLocales(locales, defaultLocale, bag);
  return { value, bag };
}

describe('validateLocales', () => {
  it('returns undefined (localization off) when locales is absent', () => {
    expect(run(undefined).value).toBeUndefined();
    expect(run(null).value).toBeUndefined();
  });

  it('accepts string codes and defaults the default locale to the first (info)', () => {
    const { value, bag } = run(['en', 'fr']);
    expect(value).toEqual({ locales: [{ code: 'en' }, { code: 'fr' }], defaultLocale: 'en' });
    expect(bag.list.some((d) => d.code === 'locales/default-implied')).toBe(true);
    expect(bag.hasErrors()).toBe(false);
  });

  it('accepts { code, name } objects and an explicit defaultLocale', () => {
    const { value, bag } = run(
      [
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Français' },
      ],
      'fr'
    );
    expect(value).toEqual({
      locales: [
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Français' },
      ],
      defaultLocale: 'fr',
    });
    expect(bag.hasErrors()).toBe(false);
  });

  it('errors when locales is not an array', () => {
    const { value, bag } = run('en');
    expect(value).toBeUndefined();
    expect(bag.list.some((d) => d.code === 'locales/invalid-type')).toBe(true);
  });

  it('errors on a malformed code and drops it', () => {
    const { value, bag } = run(['en', 'fr FR']);
    expect(bag.list.some((d) => d.code === 'locales/invalid-code')).toBe(true);
    expect(value!.locales).toEqual([{ code: 'en' }]);
  });

  it('errors on a duplicate code', () => {
    const { value, bag } = run(['en', 'en']);
    expect(bag.list.some((d) => d.code === 'locales/duplicate')).toBe(true);
    expect(value!.locales).toEqual([{ code: 'en' }]);
  });

  it('errors when defaultLocale is not among locales and falls back to the first', () => {
    const { value, bag } = run(['fr', 'de'], 'en');
    expect(bag.list.some((d) => d.code === 'locales/default-not-listed')).toBe(true);
    expect(value!.defaultLocale).toBe('fr');
  });

  it('errors on an entry with no usable code', () => {
    const { value, bag } = run([{ name: 'No code' }, 42]);
    expect(bag.list.filter((d) => d.level === 'error').length).toBeGreaterThanOrEqual(2);
    expect(value).toBeUndefined(); // nothing usable
  });

  it('warns (not silently) when defaultLocale is set but unusable', () => {
    const blank = run(['en', 'fr'], '   ');
    expect(blank.bag.list.some((d) => d.code === 'locales/default-ignored')).toBe(true);
    expect(blank.value!.defaultLocale).toBe('en');

    const nonString = run(['en', 'fr'], 42);
    expect(nonString.bag.list.some((d) => d.code === 'locales/default-ignored')).toBe(true);
  });

  it('accepts BCP-47 region subtags like pt-BR', () => {
    const { value } = run(['pt-BR'], 'pt-BR');
    expect(value).toEqual({ locales: [{ code: 'pt-BR' }], defaultLocale: 'pt-BR' });
  });
});
