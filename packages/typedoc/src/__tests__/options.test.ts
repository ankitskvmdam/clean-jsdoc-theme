import { describe, it, expect } from 'vitest';
import { resolveSiteUrl } from '../options';

describe('resolveSiteUrl (hostedBaseUrl fallback)', () => {
  it('returns nothing when neither is set', () => {
    expect(resolveSiteUrl(undefined, '')).toEqual({});
  });

  it('uses hostedBaseUrl when the theme block has no siteUrl', () => {
    expect(resolveSiteUrl(undefined, 'https://x.com/docs/')).toEqual({
      siteUrl: 'https://x.com/docs/',
    });
  });

  it('prefers the theme-specific siteUrl over the global hostedBaseUrl', () => {
    const out = resolveSiteUrl('https://theme.example', 'https://global.example');
    expect(out.siteUrl).toBe('https://theme.example');
    expect(out.warning).toContain('hostedBaseUrl');
    expect(out.warning).toContain('cleanJsdocTheme.siteUrl');
  });

  it('does not warn when both are set to the same value', () => {
    expect(resolveSiteUrl('https://x.com', 'https://x.com')).toEqual({ siteUrl: 'https://x.com' });
  });

  it('trims whitespace and ignores blank values', () => {
    expect(resolveSiteUrl('  https://x.com  ', '')).toEqual({ siteUrl: 'https://x.com' });
    expect(resolveSiteUrl('   ', 'https://x.com')).toEqual({ siteUrl: 'https://x.com' });
  });

  it('ignores non-string values', () => {
    expect(resolveSiteUrl(42, null)).toEqual({});
  });
});
