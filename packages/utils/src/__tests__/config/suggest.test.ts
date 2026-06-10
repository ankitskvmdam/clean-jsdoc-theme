import { describe, it, expect } from 'vitest';
import { levenshtein, suggestKey } from '../../config/suggest';
import { THEME_OPT_KEYS } from '../../config/opts-schema';

describe('levenshtein', () => {
  it('is zero for identical strings and the length for an empty side', () => {
    expect(levenshtein('siteName', 'siteName')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('counts single-edit distances', () => {
    expect(levenshtein('siteNme', 'siteName')).toBe(1); // insertion
    expect(levenshtein('fontss', 'fonts')).toBe(1); // deletion
    expect(levenshtein('menv', 'menu')).toBe(1); // substitution
  });

  it('is symmetric regardless of argument order', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('sitting', 'kitten')).toBe(3);
  });
});

describe('suggestKey', () => {
  it('suggests the nearest theme key for a close typo', () => {
    expect(suggestKey('siteNme', THEME_OPT_KEYS)).toBe('siteName');
    expect(suggestKey('font', THEME_OPT_KEYS)).toBe('fonts');
    expect(suggestKey('copypage', THEME_OPT_KEYS)).toBe('copyPage'); // case-insensitive
  });

  it('returns undefined for a far-off key (no candidate within threshold)', () => {
    expect(suggestKey('destination', THEME_OPT_KEYS)).toBeUndefined();
    expect(suggestKey('totallyUnrelated', THEME_OPT_KEYS)).toBeUndefined();
  });

  it('respects an explicit maxDistance', () => {
    // 'menus' is distance 1 from 'menu' — allowed at 1, allowed at default 2.
    expect(suggestKey('menus', THEME_OPT_KEYS, 1)).toBe('menu');
    // distance 2 typo only passes when the threshold permits it.
    expect(suggestKey('siteNam', THEME_OPT_KEYS, 0)).toBeUndefined();
    expect(suggestKey('siteNam', THEME_OPT_KEYS, 2)).toBe('siteName');
  });
});
