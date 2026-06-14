import { describe, it, expect } from 'vitest';
import { validateThemeOpts } from '../../config/validate-opts';
import type { FontResolver } from '../../config/fonts';
import type { FontExistence } from '../../config/google-fonts';
import type { SiteLogo } from '../../site/site-name';
import type { Diagnostic } from '../../config/diagnostics';

/** A fake resolver that always returns the same verdict — never hits the network. */
const resolverReturning =
  (verdict: FontExistence): FontResolver =>
  async () =>
    verdict;

/** Find a collected diagnostic by code. */
function byCode(list: readonly Diagnostic[], code: string): Diagnostic | undefined {
  return list.find((d) => d.code === code);
}

describe('validateThemeOpts — siteName', () => {
  it('trims a string siteName and reports no diagnostics', async () => {
    const { value, diagnostics } = await validateThemeOpts({ opts: { siteName: '  My Docs  ' } });
    expect(value.siteName).toBe('My Docs');
    expect(diagnostics.list).toHaveLength(0);
  });

  it('accepts a valid logo set', async () => {
    const { value, diagnostics } = await validateThemeOpts({
      opts: { siteName: { default: 'logo.svg', dark: 'logo-dark.svg', alt: 'Acme' } },
    });
    expect(value.siteName).toEqual<SiteLogo>({
      default: 'logo.svg',
      dark: 'logo-dark.svg',
      alt: 'Acme',
    });
    expect(diagnostics.hasErrors()).toBe(false);
  });

  it('warns on unknown sub-keys with a suggestion', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { siteName: { defualt: 'logo.svg' } },
    });
    const warn = byCode(diagnostics.list, 'siteName/unknown-key');
    expect(warn?.level).toBe('warning');
    expect(warn?.hint).toContain('default');
  });

  it('warns and drops an empty logo set (no image, no alt)', async () => {
    const { value, diagnostics } = await validateThemeOpts({
      opts: { siteName: { default: '   ' } },
    });
    expect(value.siteName).toBeUndefined();
    expect(byCode(diagnostics.list, 'siteName/empty')?.level).toBe('warning');
  });

  it('errors on a non-string sub-value', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { siteName: { default: 123 } },
    });
    expect(byCode(diagnostics.list, 'siteName/invalid-value')?.level).toBe('error');
    expect(diagnostics.hasErrors()).toBe(true);
  });
});

describe('validateThemeOpts — fonts', () => {
  it('keeps valid keys and existence-checks heading/body', async () => {
    const { value, diagnostics } = await validateThemeOpts({
      opts: { fonts: { heading: 'Roboto', body: 'Inter', mono: 'ui-monospace' } },
      fontResolver: resolverReturning('exists'),
    });
    expect(value.fonts).toEqual({ heading: 'Roboto', body: 'Inter', mono: 'ui-monospace' });
    expect(diagnostics.hasErrors()).toBe(false);
  });

  it('warns on an extra fonts key with a suggestion', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { fonts: { heding: 'Roboto' } },
    });
    const warn = byCode(diagnostics.list, 'fonts/unknown-key');
    expect(warn?.level).toBe('warning');
    expect(warn?.hint).toContain('heading');
  });

  it('errors when a heading/body family is missing (fake resolver)', async () => {
    const { value, diagnostics } = await validateThemeOpts({
      opts: { fonts: { heading: 'NotARealFont' } },
      fontResolver: resolverReturning('missing'),
    });
    // Value is still returned — the bridge decides to fall back.
    expect(value.fonts.heading).toBe('NotARealFont');
    const err = byCode(diagnostics.list, 'fonts/not-google');
    expect(err?.level).toBe('error');
    expect(err?.path).toBe('fonts.heading');
    expect(diagnostics.hasErrors()).toBe(true);
  });

  it('emits info (not error) when a family is unverifiable', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { fonts: { body: 'Roboto' } },
      fontResolver: resolverReturning('unknown'),
    });
    expect(byCode(diagnostics.list, 'fonts/unverified')?.level).toBe('info');
    expect(diagnostics.hasErrors()).toBe(false);
  });

  it('never checks mono even with a missing-returning resolver', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { fonts: { mono: 'Menlo' } },
      fontResolver: resolverReturning('missing'),
    });
    expect(byCode(diagnostics.list, 'fonts/not-google')).toBeUndefined();
    expect(diagnostics.hasErrors()).toBe(false);
  });

  it('skips font checks gracefully when no resolver is supplied', async () => {
    const { value, diagnostics } = await validateThemeOpts({
      opts: { fonts: { heading: 'Anything' } },
    });
    expect(value.fonts.heading).toBe('Anything');
    expect(diagnostics.hasErrors()).toBe(false);
  });
});

describe('validateThemeOpts — per-locale fonts', () => {
  it('groups `<locale>:slot` keys under `locales`, keeping the base separate', async () => {
    const { value, diagnostics } = await validateThemeOpts({
      opts: {
        fonts: {
          heading: 'Roboto',
          body: 'Inter',
          'ja:heading': 'Noto Sans JP',
          'hi:body': 'Noto Sans Devanagari',
        },
      },
      fontResolver: resolverReturning('exists'),
    });
    expect(value.fonts).toEqual({
      heading: 'Roboto',
      body: 'Inter',
      locales: {
        ja: { heading: 'Noto Sans JP' },
        hi: { body: 'Noto Sans Devanagari' },
      },
    });
    expect(diagnostics.hasErrors()).toBe(false);
  });

  it('existence-checks a per-locale heading and reports it against its key path', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { fonts: { 'ja:heading': 'NotARealFont' } },
      fontResolver: resolverReturning('missing'),
    });
    const err = byCode(diagnostics.list, 'fonts/not-google');
    expect(err?.level).toBe('error');
    expect(err?.path).toBe('fonts.ja:heading');
  });

  it('warns on an unknown slot after a locale prefix, suggesting a real slot', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { fonts: { 'ja:heding': 'Noto Sans JP' } },
    });
    const warn = byCode(diagnostics.list, 'fonts/unknown-key');
    expect(warn?.level).toBe('warning');
    expect(warn?.path).toBe('fonts.ja:heding');
    expect(warn?.hint).toContain('heading');
  });

  it('never existence-checks a per-locale mono', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { fonts: { 'ja:mono': 'Menlo' } },
      fontResolver: resolverReturning('missing'),
    });
    expect(byCode(diagnostics.list, 'fonts/not-google')).toBeUndefined();
    expect(diagnostics.hasErrors()).toBe(false);
  });
});

describe('validateThemeOpts — unknown-key policy', () => {
  it('suggest-typos flags a near-miss of a known key', async () => {
    const { diagnostics } = await validateThemeOpts({ opts: { siteNme: 'X' } });
    const warn = byCode(diagnostics.list, 'opts/unknown-key');
    expect(warn?.level).toBe('warning');
    expect(warn?.hint).toContain('siteName');
  });

  it('suggest-typos ignores a far-off key (likely a JSDoc-own opt)', async () => {
    const { diagnostics } = await validateThemeOpts({ opts: { destination: 'out/' } });
    expect(byCode(diagnostics.list, 'opts/unknown-key')).toBeUndefined();
  });

  it('respects knownNonThemeKeys (never flags a declared own-opt)', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { template: 'foo' },
      knownNonThemeKeys: new Set(['template']),
    });
    expect(byCode(diagnostics.list, 'opts/unknown-key')).toBeUndefined();
  });

  it('warn-all flags every unrecognized key', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { totallyUnrelated: 1 },
      unknownKeyPolicy: 'warn-all',
    });
    expect(byCode(diagnostics.list, 'opts/unknown-key')?.level).toBe('warning');
  });

  it('ignore flags nothing', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { siteNme: 'X' },
      unknownKeyPolicy: 'ignore',
    });
    expect(byCode(diagnostics.list, 'opts/unknown-key')).toBeUndefined();
  });
});
