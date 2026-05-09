import { describe, it, expect } from 'vitest';
import { makeStringSafeForOSFilename } from '../helper';

describe('makeStringSafeForOSFilename', () => {
  it('replaces forward slashes with underscores', () => {
    expect(makeStringSafeForOSFilename('src/utils/foo.ts')).toBe('src_utils_foo.ts');
  });

  it('preserves alphanumerics, underscore, hyphen, and period', () => {
    expect(makeStringSafeForOSFilename('My-File_1.test.ts')).toBe('My-File_1.test.ts');
  });

  it('replaces JSDoc-style separators (:, ~, #)', () => {
    expect(makeStringSafeForOSFilename('module:foo~Bar#method')).toBe('module_foo_Bar_method');
  });

  it('replaces whitespace', () => {
    expect(makeStringSafeForOSFilename('a b\tc')).toBe('a_b_c');
  });

  it('replaces every disallowed character (global flag)', () => {
    expect(makeStringSafeForOSFilename('!@#$%^&*()')).toBe('__________');
  });

  it('returns an empty string for empty input', () => {
    expect(makeStringSafeForOSFilename('')).toBe('');
  });

  it('returns the input unchanged when already safe', () => {
    expect(makeStringSafeForOSFilename('already-safe.name_1')).toBe('already-safe.name_1');
  });
});
