import { describe, it, expect } from 'vitest';
import { validateCollectionOrThrow } from '../validate';
import { getJSDocTaffyData } from './factory';

describe('validateCollectionOrThrow', () => {
  describe('non-function inputs', () => {
    it('throws when given undefined', () => {
      expect(() => validateCollectionOrThrow(undefined)).toThrow(
        'Invalid collection: expected a function, got undefined'
      );
    });

    it('throws when given null', () => {
      expect(() => validateCollectionOrThrow(null)).toThrow(
        'Invalid collection: expected a function, got object'
      );
    });

    it('throws when given a string', () => {
      expect(() => validateCollectionOrThrow('hello')).toThrow(
        'Invalid collection: expected a function, got string'
      );
    });

    it('throws when given a number', () => {
      expect(() => validateCollectionOrThrow(42)).toThrow(
        'Invalid collection: expected a function, got number'
      );
    });

    it('throws when given a plain object', () => {
      expect(() => validateCollectionOrThrow({})).toThrow(
        'Invalid collection: expected a function, got object'
      );
    });

    it('throws when given an array', () => {
      expect(() => validateCollectionOrThrow([])).toThrow(
        'Invalid collection: expected a function, got object'
      );
    });
  });

  describe('function that does not behave like a @jsdoc/salty DB', () => {
    it('throws when the function throws on call', () => {
      const notSalty = () => {
        throw new Error('not salty');
      };
      expect(() => validateCollectionOrThrow(notSalty)).toThrow(
        'collection is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when the function returns null', () => {
      // null.get throws, caught by the try-catch
      const notSalty = () => null;
      expect(() => validateCollectionOrThrow(notSalty)).toThrow(
        'collection is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when the function returns an object without .get()', () => {
      const notSalty = () => ({});
      expect(() => validateCollectionOrThrow(notSalty)).toThrow(
        'collection is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when .get is not a function', () => {
      const notSalty = () => ({ get: 'not a function' });
      expect(() => validateCollectionOrThrow(notSalty)).toThrow(
        'collection is not a valid @jsdoc/salty DB'
      );
    });

    it('throws when .get() itself throws', () => {
      const notSalty = () => ({
        get: () => {
          throw new Error();
        },
      });
      expect(() => validateCollectionOrThrow(notSalty)).toThrow(
        'collection is not a valid @jsdoc/salty DB'
      );
    });
  });

  describe('valid salty-shaped function but invalid doclets', () => {
    it('throws when .get() returns a non-array', () => {
      const fakeDB = () => ({ get: () => 'not an array' });
      expect(() => validateCollectionOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('throws when .get() returns an array containing non-object items', () => {
      const fakeDB = () => ({ get: () => [42, 'string'] });
      expect(() => validateCollectionOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('throws when a doclet has an invalid access value', () => {
      // DocletAccessSchema is z.enum(['package','private','protected','public'])
      const fakeDB = () => ({ get: () => [{ access: 'invalid_access' }] });
      expect(() => validateCollectionOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('throws when a doclet has an invalid field type', () => {
      // async must be boolean, not a string
      const fakeDB = () => ({ get: () => [{ async: 'yes' }] });
      expect(() => validateCollectionOrThrow(fakeDB)).toThrow('Invalid doclet list.');
    });

    it('includes a JSDoc 4 upgrade hint in the error', () => {
      const fakeDB = () => ({ get: () => [{ access: 'invalid_access' }] });
      expect(() => validateCollectionOrThrow(fakeDB)).toThrow(
        '@clean-jsdoc-theme/setu supports JSDoc 4'
      );
    });
  });

  describe('valid @jsdoc/salty DB', () => {
    it('does not throw for a salty DB returning an empty array', () => {
      const fakeDB = () => ({ get: () => [] });
      expect(() => validateCollectionOrThrow(fakeDB)).not.toThrow();
    });

    it('does not throw for a salty DB with a minimal doclet (all DocletSchema fields are optional)', () => {
      const fakeDB = () => ({ get: () => [{}] });
      expect(() => validateCollectionOrThrow(fakeDB)).not.toThrow();
    });

    it('does not throw for a salty DB with a valid package doclet', () => {
      const fakeDB = () => ({ get: () => [{ kind: 'package', name: 'my-package' }] });
      expect(() => validateCollectionOrThrow(fakeDB)).not.toThrow();
    });

    it('does not throw for the real jsdocTaffyData', () => {
      expect(() => validateCollectionOrThrow(getJSDocTaffyData())).not.toThrow();
    });
  });
});
