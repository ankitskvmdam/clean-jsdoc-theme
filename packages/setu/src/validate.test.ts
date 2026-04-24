import { describe, it, expect } from 'vitest';
import { validateJSDocSaltyDBOrThrow } from './validate';
import { jsdocTaffyData } from './data';

describe('validateJSDocSaltyDBOrThrow', () => {
  describe('non-function inputs', () => {
    it('throws when given undefined', () => {
      expect(() => validateJSDocSaltyDBOrThrow(undefined)).toThrow(
        'Invalid jsdocSaltyDB: expected a function, got undefined'
      );
    });

    it('throws when given null', () => {
      expect(() => validateJSDocSaltyDBOrThrow(null)).toThrow(
        'Invalid jsdocSaltyDB: expected a function, got object'
      );
    });

    it('throws when given a string', () => {
      expect(() => validateJSDocSaltyDBOrThrow('hello')).toThrow(
        'Invalid jsdocSaltyDB: expected a function, got string'
      );
    });

    it('throws when given a number', () => {
      expect(() => validateJSDocSaltyDBOrThrow(42)).toThrow(
        'Invalid jsdocSaltyDB: expected a function, got number'
      );
    });

    it('throws when given a plain object', () => {
      expect(() => validateJSDocSaltyDBOrThrow({})).toThrow(
        'Invalid jsdocSaltyDB: expected a function, got object'
      );
    });

    it('throws when given an array', () => {
      expect(() => validateJSDocSaltyDBOrThrow([])).toThrow(
        'Invalid jsdocSaltyDB: expected a function, got object'
      );
    });
  });

  describe('function that does not behave like a @jsdoc/salty DB', () => {
    it('throws when the function throws on call', () => {
      const notSalty = () => {
        throw new Error('not salty');
      };
      expect(() => validateJSDocSaltyDBOrThrow(notSalty)).toThrow(
        'jsdocSaltyDB is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when the function returns null', () => {
      // null.get throws, caught by the try-catch
      const notSalty = () => null;
      expect(() => validateJSDocSaltyDBOrThrow(notSalty)).toThrow(
        'jsdocSaltyDB is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when the function returns an object without .get()', () => {
      const notSalty = () => ({});
      expect(() => validateJSDocSaltyDBOrThrow(notSalty)).toThrow(
        'jsdocSaltyDB is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when .get is not a function', () => {
      const notSalty = () => ({ get: 'not a function' });
      expect(() => validateJSDocSaltyDBOrThrow(notSalty)).toThrow(
        'jsdocSaltyDB is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when .get() itself throws', () => {
      const notSalty = () => ({
        get: () => {
          throw new Error();
        },
      });
      expect(() => validateJSDocSaltyDBOrThrow(notSalty)).toThrow(
        'jsdocSaltyDB is not a valid @jsdoc/salty DB'
      );
    });
  });

  describe('valid salty-shaped function but invalid doclets', () => {
    it('throws when .get() returns a non-array', () => {
      const fakeDB = () => ({ get: () => 'not an array' });
      expect(() => validateJSDocSaltyDBOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('throws when .get() returns an array containing non-object items', () => {
      const fakeDB = () => ({ get: () => [42, 'string'] });
      expect(() => validateJSDocSaltyDBOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('throws when a doclet has an invalid access value', () => {
      // DocletAccessSchema is z.enum(['package','private','protected','public'])
      const fakeDB = () => ({ get: () => [{ access: 'invalid_access' }] });
      expect(() => validateJSDocSaltyDBOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('throws when a doclet has an invalid field type', () => {
      // async must be boolean, not a string
      const fakeDB = () => ({ get: () => [{ async: 'yes' }] });
      expect(() => validateJSDocSaltyDBOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('includes a JSDoc 4 upgrade hint in the error', () => {
      const fakeDB = () => ({ get: () => [{ access: 'invalid_access' }] });
      expect(() => validateJSDocSaltyDBOrThrow(fakeDB)).toThrow(
        '@clean-jsdoc-theme/setu supports JSDoc 4'
      );
    });
  });

  describe('valid @jsdoc/salty DB', () => {
    it('returns true for a salty DB returning an empty array', () => {
      const fakeDB = () => ({ get: () => [] });
      expect(validateJSDocSaltyDBOrThrow(fakeDB)).toBe(true);
    });

    it('returns true for a salty DB with a minimal doclet (all DocletSchema fields are optional)', () => {
      const fakeDB = () => ({ get: () => [{}] });
      expect(validateJSDocSaltyDBOrThrow(fakeDB)).toBe(true);
    });

    it('returns true for a salty DB with a valid package doclet', () => {
      const fakeDB = () => ({ get: () => [{ kind: 'package', name: 'my-package' }] });
      expect(validateJSDocSaltyDBOrThrow(fakeDB)).toBe(true);
    });

    it('returns true for the real jsdocTaffyData', () => {
      expect(validateJSDocSaltyDBOrThrow(jsdocTaffyData)).toBe(true);
    });
  });
});
