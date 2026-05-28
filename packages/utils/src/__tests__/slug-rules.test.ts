import { describe, it, expect } from 'vitest';
import { slugifyHeading, slugifyPath } from '../site/slug-rules';

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
});
