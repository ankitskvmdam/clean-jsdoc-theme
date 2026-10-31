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

describe('slugifyHeading — fallback for text with no slug', () => {
  it('gives punctuation/emoji-only text a code-point fallback id', () => {
    expect(slugifyHeading('$')).toBe('section--24');
    expect(slugifyHeading('🚀')).toBe('section--1f680');
    expect(slugifyHeading('🚀🚀')).toBe('section--1f680_1f680');
    expect(slugifyHeading('  $ ')).toBe('section--24');
  });

  it('keeps blank text blank (callers skip blank headings)', () => {
    expect(slugifyHeading('')).toBe('');
    expect(slugifyHeading('   ')).toBe('');
  });

  it('dedupes fallback ids through the registry like any slug', () => {
    const reg = new Map<string, number>();
    expect(slugifyHeading('🚀', reg)).toBe('section--1f680');
    expect(slugifyHeading('🚀', reg)).toBe('section--1f680-1');
    expect(slugifyHeading('$', reg)).toBe('section--24');
    expect(slugifyHeading('Intro', reg)).toBe('intro');
    expect(slugifyHeading('Intro', reg)).toBe('intro-1');
  });

  it('treats emoji variation selectors/keycaps as invisible, not as a slug', () => {
    const warn = '\u26a0\ufe0f'; // warning sign + VS16
    const heart = '\u2764\ufe0f'; // heavy heart + VS16
    expect(slugifyHeading(warn)).toBe('section--26a0_fe0f');
    const reg = new Map<string, number>();
    expect(slugifyHeading(heart, reg)).toBe('section--2764_fe0f');
    expect(slugifyHeading(heart, reg)).toBe('section--2764_fe0f-1');
  });

  it('drops a leading/stray emoji mark next to real words', () => {
    expect(slugifyHeading('\u26a0\ufe0f Warning')).toBe('warning');
    expect(slugifyHeading('Warning \u26a0\ufe0f now')).toBe('warning-now');
    expect(slugifyHeading('1\ufe0f\u20e3 Step')).toBe('1-step'); // keycap 1
    expect(slugifyHeading('\u0301 orphan')).toBe('orphan');
  });

  it('every non-fallback id contains a letter or digit', () => {
    for (const t of ['\u26a0\ufe0f', '\u2764\ufe0f \u2764\ufe0f', '\u20e3', '-\u0301-']) {
      expect(slugifyHeading(t)).toMatch(/^section--/);
    }
  });

  it('keeps marks attached to letters (Devanagari, kana) byte-identical', () => {
    const hindi = '\u092a\u094d\u0930\u094b\u091c\u093c';
    expect(slugifyHeading(hindi)).toBe(hindi);
    expect(slugifyHeading('\u304b\u3099')).toBe('\u304c'); // ka + voiced mark -> ga
  });

  it('keeps stray non-emoji marks exactly as before', () => {
    // Arabic presentation form: NFKD gives a space + fatha, and the fatha stays.
    expect(slugifyHeading('a \ufe76 b')).toBe('a-\u064e-b');
    // Spacing voiced-sound mark: NFKD gives a space + U+3099, which stays.
    expect(slugifyHeading('\u304b\u309b')).toBe('\u304b-\u3099');
    // `\u2260` decomposes to `=` + U+0338, which is in the Latin combining block and
    // so is always stripped.
    expect(slugifyHeading('a \u2260 b')).toBe('a-b');
  });

  it('honors a custom fallback prefix', () => {
    expect(slugifyHeading('$', undefined, 'x')).toBe('x--24');
  });

  it('leaves every text with a non-empty slug exactly as before', () => {
    expect(slugifyHeading('Hello 🚀')).toBe('hello');
    expect(slugifyHeading('$f')).toBe('f');
    expect(slugifyHeading('section 24')).toBe('section-24');
  });

  it('cannot collide with a real slug: no real slug contains `--` or `_`', () => {
    for (const t of ['section--24', 'section 24', 'section_24', 'a -- b', 'x__y']) {
      expect(slugifyHeading(t)).not.toMatch(/--|_/);
    }
    expect(slugifyHeading('section--24')).not.toBe(slugifyHeading('$'));
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

  it('falls back to the code points, with the member prefix, for an empty slug', () => {
    expect(memberAnchor('$')).toBe('member--24');
    expect(memberAnchor('_')).toBe('member--5f');
    expect(memberAnchor('$$')).toBe('member--24_24');
  });

  it('never shares an id with a prose heading of the same text', () => {
    expect(memberAnchor('$')).not.toBe(slugifyHeading('$'));
  });

  it('gives distinct punctuation-only names distinct anchors', () => {
    const names = ['$', '_', '$$', '_$', '$_', '__'];
    expect(new Set(names.map(memberAnchor)).size).toBe(names.length);
  });

  it('cannot collide with a real name that looks like a fallback', () => {
    // A quoted member named 'member-24' keeps its plain slug; `$` gets the
    // double-hyphen fallback, which no real slug can contain.
    expect(memberAnchor('member-24')).toBe('member-24');
    expect(memberAnchor('member--24')).toBe('member-24');
    expect(memberAnchor('$')).not.toBe(memberAnchor('member-24'));
  });

  it('gives a whitespace-only name (TypeDoc keeps a single space) its untrimmed hex', () => {
    expect(memberAnchor(' ')).toBe('member--20');
    expect(memberAnchor('  ')).toBe('member--20_20');
  });

  it('never throws; the empty string maps to a fixed id', () => {
    expect(memberAnchor('')).toBe('member--');
  });

  it('falls back for an emoji name instead of an invisible id', () => {
    expect(memberAnchor('\u2764\ufe0f')).toBe('member--2764_fe0f');
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
