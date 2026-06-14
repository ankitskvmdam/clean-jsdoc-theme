import { describe, expect, it } from 'vitest';
import { interpolate, interpolationTokens } from '../interpolate';

describe('interpolate', () => {
  it('substitutes named tokens', () => {
    expect(interpolate('Switch to {mode} theme', { mode: 'dark' })).toBe('Switch to dark theme');
  });

  it('stringifies number vars', () => {
    expect(interpolate('{count} results', { count: 3 })).toBe('3 results');
  });

  it('substitutes a token used more than once', () => {
    expect(interpolate('{x} and {x}', { x: 'a' })).toBe('a and a');
  });

  it('returns the template unchanged when no vars are given', () => {
    expect(interpolate('Save {title} to favorites')).toBe('Save {title} to favorites');
  });

  it('leaves a token with no matching var verbatim', () => {
    expect(interpolate('Save {title} to favorites', { other: 'x' })).toBe(
      'Save {title} to favorites'
    );
  });

  it('does not touch {@link} tags or spaced/dotted braces', () => {
    const src = 'See {@link Foo} and { a.b } here';
    expect(interpolate(src, { Foo: 'X', a: 'Y' })).toBe(src);
  });
});

describe('interpolationTokens', () => {
  it('returns unique token names in first-seen order', () => {
    expect(interpolationTokens('{b} {a} {b} {c}')).toEqual(['b', 'a', 'c']);
  });

  it('ignores non-identifier braces', () => {
    expect(interpolationTokens('{@link Foo} { a.b } {count}')).toEqual(['count']);
  });

  it('returns [] when there are no tokens', () => {
    expect(interpolationTokens('plain text')).toEqual([]);
  });
});
