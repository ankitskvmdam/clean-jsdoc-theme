import { describe, expect, it } from 'vitest';
import { apiSlotKey, isApiKey, isChromeKey, sourceHash } from '../keys';

describe('apiSlotKey', () => {
  it('builds api.<longname>#<field>', () => {
    expect(apiSlotKey('Foo', 'description')).toBe('api.Foo#description');
  });

  it('joins an array field path with dots', () => {
    expect(apiSlotKey('Foo#bar', ['params', '0', 'description'])).toBe(
      'api.Foo#bar#params.0.description'
    );
  });

  it('tolerates namepath punctuation in the longname', () => {
    expect(apiSlotKey('module:x~Y', 'description')).toBe('api.module:x~Y#description');
  });

  it('is injective over distinct symbols and fields', () => {
    // Different symbol, same field.
    expect(apiSlotKey('Foo#bar', 'description')).not.toBe(apiSlotKey('Foo', 'description'));
    // Same symbol, different field.
    expect(apiSlotKey('Foo', 'description')).not.toBe(apiSlotKey('Foo', 'summary'));
    // A '#' in the longname stays on the longname side of the last '#' boundary,
    // because field paths are '#'-free — so the field is always recoverable.
    expect(apiSlotKey('Foo#bar', 'x')).toBe('api.Foo#bar#x');
  });

  it('classifies namespaces', () => {
    expect(isApiKey('api.Foo#description')).toBe(true);
    expect(isApiKey('chrome.nav.menu')).toBe(false);
    expect(isChromeKey('chrome.nav.menu')).toBe(true);
    expect(isChromeKey('api.Foo#description')).toBe(false);
  });
});

describe('sourceHash', () => {
  it('is deterministic for the same input', () => {
    expect(sourceHash('The Foo class.')).toBe(sourceHash('The Foo class.'));
  });

  it('changes when the source text changes (staleness signal)', () => {
    expect(sourceHash('The Foo class.')).not.toBe(sourceHash('The Foo class!'));
  });

  it('is an 8-char lowercase hex string', () => {
    expect(sourceHash('anything')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles the empty string', () => {
    expect(sourceHash('')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is stable across known fixtures (no platform drift)', () => {
    // Pinned FNV-1a outputs — a refactor that changes the algorithm is caught.
    expect(sourceHash('')).toBe('811c9dc5');
    expect(sourceHash('hello')).toBe('4f9f2cab');
    expect(sourceHash('The Foo class.')).toBe('9d6177d6');
  });
});
