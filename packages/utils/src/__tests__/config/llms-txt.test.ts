import { describe, it, expect } from 'vitest';
import {
  DiagnosticBag,
  formatDiagnostics,
  validateLlmsTxt,
  validateThemeOpts,
  warningsOnly,
} from '../../config';

const URL_OK = 'https://x.com';

describe('validateLlmsTxt', () => {
  it('returns undefined with no diagnostics when unset or false', () => {
    const bag = new DiagnosticBag();
    expect(validateLlmsTxt(undefined, URL_OK, bag)).toBeUndefined();
    expect(validateLlmsTxt(false, URL_OK, bag)).toBeUndefined();
    expect(bag.list).toHaveLength(0);
  });

  it('defaults `true` to full + api', () => {
    const bag = new DiagnosticBag();
    expect(validateLlmsTxt(true, URL_OK, bag)).toEqual({ full: true, api: true });
    expect(bag.list).toHaveLength(0);
  });

  it('keeps explicit object values and defaults the omitted ones', () => {
    const bag = new DiagnosticBag();
    expect(validateLlmsTxt({ full: false }, URL_OK, bag)).toEqual({ full: false, api: true });
    expect(validateLlmsTxt({ api: 'index' }, URL_OK, bag)).toEqual({ full: true, api: 'index' });
    expect(validateLlmsTxt({ api: false }, URL_OK, bag)).toEqual({ full: true, api: false });
    expect(bag.list).toHaveLength(0);
  });

  it('warns + disables when enabled without a usable site URL', () => {
    const bag = new DiagnosticBag();
    expect(validateLlmsTxt(true, undefined, bag)).toBeUndefined();
    expect(bag.list.map((d) => d.code)).toEqual(['llms-txt/no-site-url']);
    expect(bag.list[0].level).toBe('warning');
    expect(bag.list[0].message).toContain('will NOT be generated');
    expect(bag.list[0].hint).toContain('siteUrl');
    expect(bag.hasErrors()).toBe(false);
  });

  it('warns + disables on a malformed value', () => {
    const bag = new DiagnosticBag();
    expect(validateLlmsTxt({ api: 'summary' }, URL_OK, bag)).toBeUndefined();
    expect(validateLlmsTxt('yes', URL_OK, bag)).toBeUndefined();
    expect(bag.list.map((d) => d.code)).toEqual(['llms-txt/invalid', 'llms-txt/invalid']);
  });
});

describe('warningsOnly', () => {
  it('keeps only warning-level diagnostics, in order', () => {
    const bag = new DiagnosticBag();
    bag.error('a/err', 'err');
    bag.warning('b/warn', 'warn one');
    bag.info('c/info', 'info');
    bag.warning('d/warn', 'warn two');
    expect(warningsOnly(bag).list.map((d) => d.code)).toEqual(['b/warn', 'd/warn']);
  });

  it('renders the kept warnings in yellow', () => {
    const bag = new DiagnosticBag();
    bag.warning('llms-txt/no-site-url', 'llms.txt will NOT be generated.');
    const colored = formatDiagnostics(warningsOnly(bag), { color: true });
    expect(colored).toContain('[33m');
    expect(colored).toContain('llms.txt will NOT be generated.');
  });
});

describe('validateThemeOpts — siteUrl + llmsTxt', () => {
  it('exposes the validated siteUrl and resolved llmsTxt', async () => {
    const { value, diagnostics } = await validateThemeOpts({
      opts: { siteUrl: 'https://x.com', llmsTxt: { api: 'index' } },
    });
    expect(value.siteUrl).toBe('https://x.com');
    expect(value.llmsTxt).toEqual({ full: true, api: 'index' });
    expect(diagnostics.list).toHaveLength(0);
  });

  it('warns once when llmsTxt is on but siteUrl is missing', async () => {
    const { value, diagnostics } = await validateThemeOpts({ opts: { llmsTxt: true } });
    expect(value.llmsTxt).toBeUndefined();
    expect(diagnostics.list.map((d) => d.code)).toEqual(['llms-txt/no-site-url']);
  });

  it('does not flag llmsTxt as an unknown key', async () => {
    const { diagnostics } = await validateThemeOpts({
      opts: { llmsTxt: true, siteUrl: 'https://x.com' },
      unknownKeyPolicy: 'warn-all',
    });
    expect(diagnostics.list.map((d) => d.code)).not.toContain('opts/unknown-key');
  });
});
