import { describe, it, expect } from 'vitest';
import { memberAnchor, slugifyHeading, slugifyPath } from '../site/slug-rules';

describe('slugifyHeading', () => {
  it('returns empty string for empty input', () => {
    expect(slugifyHeading('')).toBe('');
  });

  it('lowercases and joins multiple words with a single hyphen', () => {
    expect(slugifyHeading('Hello World')).toBe('hello-world');
    expect(slugifyHeading('Multiple   spaces here')).toBe('multiple-spaces-here');
  });

  it('strips special characters but keeps alphanumerics + hyphen', () => {
    expect(slugifyHeading('Foo! @Bar? #baz()')).toBe('foo-bar-baz');
    expect(slugifyHeading('100% pure')).toBe('100-pure');
  });

  it('preserves existing hyphens and collapses runs', () => {
    expect(slugifyHeading('foo - bar')).toBe('foo-bar');
    expect(slugifyHeading('foo---bar')).toBe('foo-bar');
  });

  it('trims leading and trailing whitespace and hyphens', () => {
    expect(slugifyHeading('   Hello World   ')).toBe('hello-world');
    expect(slugifyHeading('---Hello---')).toBe('hello');
  });

  it('strips combining diacritics via NFKD normalization', () => {
    // 'café' should become 'cafe' (the acute accent is removed).
    expect(slugifyHeading('café')).toBe('cafe');
    expect(slugifyHeading('naïve approach')).toBe('naive-approach');
  });

  it('keeps non-Latin scripts (Unicode-aware), not just ASCII', () => {
    // Regression: an ASCII-only class dropped every non-Latin letter, leaving
    // empty or Latin-only slugs. Devanagari vowel signs (matras) must survive —
    // 'पैकेज' must not degrade to 'पकज'.
    expect(slugifyHeading('पैकेज')).toBe('पैकेज');
    expect(slugifyHeading('आपको क्या मिलता है')).toBe('आपको-क्या-मिलता-है');
    expect(slugifyHeading('प्रोज़ और API एक ही साइट में')).toBe(
      'प्रोज़-और-api-एक-ही-साइट-में'
    );
    expect(slugifyHeading('パッケージ')).toBe('パッケージ');
    // Mixed scripts + punctuation still drops the punctuation only.
    expect(slugifyHeading('変更点 (changelog)')).toBe('変更点-changelog');
  });

  it('dedupes via the registry when supplied', () => {
    const reg = new Map<string, number>();
    expect(slugifyHeading('Hello', reg)).toBe('hello');
    expect(slugifyHeading('Hello', reg)).toBe('hello-1');
    expect(slugifyHeading('Hello', reg)).toBe('hello-2');
    // Different base slugs do not collide.
    expect(slugifyHeading('World', reg)).toBe('world');
    expect(slugifyHeading('Hello', reg)).toBe('hello-3');
  });

  it('without a registry, repeated calls return the same slug', () => {
    expect(slugifyHeading('Hello')).toBe('hello');
    expect(slugifyHeading('Hello')).toBe('hello');
  });
});

describe('memberAnchor', () => {
  it('is exactly slugifyHeading for any name with a non-empty slug', () => {
    const names = ['process', 'with space', 'café', 'Symbol.iterator', '$f', '_private', 'a$b'];
    for (const name of names) {
      expect(memberAnchor(name)).toBe(slugifyHeading(name));
    }
    expect(memberAnchor('$f')).toBe('f');
    expect(memberAnchor('_private')).toBe('private');
  });

  it('falls back to the code points for a name whose slug is empty', () => {
    expect(slugifyHeading('$')).toBe('');
    expect(memberAnchor('$')).toBe('member--24');
    expect(memberAnchor('_')).toBe('member--5f');
    expect(memberAnchor('$$')).toBe('member--24-24');
  });

  it('gives distinct punctuation-only names distinct anchors', () => {
    const names = ['$', '_', '$$', '_$', '$_', '__'];
    expect(new Set(names.map(memberAnchor)).size).toBe(names.length);
  });

  it('cannot collide with a real name that looks like a fallback', () => {
    // A quoted member named 'member-24' keeps its plain slug; `$` gets the
    // double-hyphen fallback, which slugifyHeading can never produce.
    expect(memberAnchor('member-24')).toBe('member-24');
    expect(memberAnchor('member--24')).toBe('member-24');
    expect(memberAnchor('$')).not.toBe(memberAnchor('member-24'));
  });

  it('never returns an empty anchor', () => {
    expect(memberAnchor('')).toBe('member--');
  });
});

describe('slugifyPath', () => {
  it('joins parts with forward slashes and lowercases', () => {
    expect(slugifyPath(['Foo', 'Bar'])).toBe('foo/bar');
  });

  it('replaces non-alphanumerics within a part with hyphens', () => {
    expect(slugifyPath(['Foo Bar', 'Baz!'])).toBe('foo-bar/baz');
  });

  it('collapses runs of non-alphanumerics into a single hyphen and trims', () => {
    expect(slugifyPath(['  Hello   World  ', '--baz--'])).toBe('hello-world/baz');
  });

  it('drops empty parts entirely', () => {
    expect(slugifyPath(['foo', '', 'bar'])).toBe('foo/bar');
    expect(slugifyPath(['', '!!!', 'real'])).toBe('real');
  });

  it('returns empty string when every part is empty/punctuation', () => {
    expect(slugifyPath([])).toBe('');
    expect(slugifyPath(['', '   ', '!!!'])).toBe('');
  });

  it('strips diacritics in path parts', () => {
    expect(slugifyPath(['Café', 'Naïve'])).toBe('cafe/naive');
  });

  it('keeps non-Latin path parts (Unicode-aware)', () => {
    expect(slugifyPath(['पैकेज', 'API!'])).toBe('पैकेज/api');
    expect(slugifyPath(['パッケージ'])).toBe('パッケージ');
  });
});
