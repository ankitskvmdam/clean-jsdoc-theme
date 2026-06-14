import { describe, expect, it } from 'vitest';
import {
  catalogCoverage,
  lintSlotMarkdown,
  validateCatalogShape,
  validateTokenParity,
} from '../validate';

const reference = {
  'chrome.a': 'A',
  'chrome.b': 'B',
  'chrome.c': 'C',
};

describe('validateCatalogShape', () => {
  it('warns (not errors) on missing/empty keys', () => {
    const bag = validateCatalogShape({ 'chrome.a': 'A', 'chrome.b': '' }, reference);
    const codes = bag.list.map((d) => d.code);
    expect(codes).toContain('bhasha/missing-key');
    expect(bag.list.filter((d) => d.code === 'bhasha/missing-key')).toHaveLength(2); // b empty, c absent
    expect(bag.hasErrors()).toBe(false);
  });

  it('errors on an unknown key with a near-miss suggestion', () => {
    const bag = validateCatalogShape(
      { 'chrome.a': 'A', 'chrome.b': 'B', 'chrome.c': 'C', 'chrome.bb': 'X' },
      reference
    );
    const unknown = bag.list.find((d) => d.code === 'bhasha/unknown-key');
    expect(unknown?.path).toBe('chrome.bb');
    expect(unknown?.hint).toContain('chrome.b');
    expect(bag.hasErrors()).toBe(true);
  });
});

describe('catalogCoverage', () => {
  it('counts non-empty reference keys present', () => {
    expect(catalogCoverage({ 'chrome.a': 'A', 'chrome.b': '' }, reference)).toEqual({
      translated: 1,
      total: 3,
      ratio: 1 / 3,
    });
  });
});

describe('lintSlotMarkdown', () => {
  it('passes a clean slot', () => {
    const bag = lintSlotMarkdown('A {@link Foo} reference with `code`.', 'api.X#d');
    expect(bag.hasErrors()).toBe(false);
  });

  it('flags an unbalanced code fence', () => {
    const bag = lintSlotMarkdown('```js\nconst x = 1;', 'api.X#d');
    expect(bag.list.some((d) => d.code === 'bhasha/unbalanced-fence')).toBe(true);
  });

  it('flags an unterminated {@link}', () => {
    const bag = lintSlotMarkdown('See {@link Foo for details', 'api.X#d');
    expect(bag.list.some((d) => d.code === 'bhasha/broken-link-tag')).toBe(true);
  });

  it('flags unbalanced braces', () => {
    const bag = lintSlotMarkdown('A stray { brace', 'api.X#d');
    expect(bag.list.some((d) => d.code === 'bhasha/unbalanced-braces')).toBe(true);
  });

  it('ignores escaped braces', () => {
    const bag = lintSlotMarkdown('An escaped \\{ brace', 'api.X#d');
    expect(bag.list.some((d) => d.code === 'bhasha/unbalanced-braces')).toBe(false);
  });

  it('treats a brace after an escaped backslash as structural', () => {
    // Runtime string is `a \\{ b`: an escaped backslash then a real, unbalanced
    // opener. The naive "prev char is \" check would wrongly skip the `{`.
    const bag = lintSlotMarkdown('a \\\\{ b', 'api.X#d');
    expect(bag.list.some((d) => d.code === 'bhasha/unbalanced-braces')).toBe(true);
  });
});

describe('validateTokenParity', () => {
  it('passes when tokens match', () => {
    const bag = validateTokenParity('Switch to {mode}', 'Passer à {mode}', 'chrome.theme.switchTo');
    expect(bag.hasErrors()).toBe(false);
  });

  it('errors when the translation drops a token', () => {
    const bag = validateTokenParity('{count} results', 'résultats', 'chrome.x');
    const d = bag.list.find((x) => x.code === 'bhasha/dropped-token');
    expect(d?.message).toContain('{count}');
    expect(d?.path).toBe('chrome.x');
  });

  it('errors when the translation adds/renames a token', () => {
    const bag = validateTokenParity('{count} results', '{nombre} résultats', 'chrome.x');
    expect(bag.list.some((d) => d.code === 'bhasha/dropped-token')).toBe(true); // count dropped
    expect(bag.list.some((d) => d.code === 'bhasha/unknown-token')).toBe(true); // nombre added
  });
});
