import { describe, it, expect } from 'vitest';
import { getAllMembersOfClass } from '../doclet';
import { getJSDocTaffyData } from './factory';

describe('getAllMembersOfClass', () => {
  it('returns an empty array when the class does not exist', () => {
    const collection = getJSDocTaffyData();
    expect(getAllMembersOfClass(collection, 'NoSuchClass')).toEqual([]);
  });

  it('returns every JSDoc-declared member of the DataProcessor class', () => {
    const collection = getJSDocTaffyData();
    const members = getAllMembersOfClass(collection, 'DataProcessor');

    // All returned doclets belong to DataProcessor.
    for (const m of members) {
      expect(m.memberof).toBe('DataProcessor');
    }

    const names = members.map((m) => m.name);

    // Every JSDoc-commented member from DataProcessor.js.
    expect(names).toContain('processCount'); // @private field (#processCount)
    expect(names).toContain('States'); // @enum
    expect(names).toContain('process'); // async method
    expect(names).toContain('idGenerator'); // @generator
    expect(names).toContain('serialize'); // @override
    expect(names).toContain('isValidId'); // @static utility
    expect(names).toContain('dataProcessed'); // @event fired in process()
  });

  it('does not leak doclets that belong outside the class', () => {
    const collection = getJSDocTaffyData();
    const members = getAllMembersOfClass(collection, 'DataProcessor');

    // memberof must always point at DataProcessor — no other scope can sneak in.
    for (const m of members) {
      expect(m.memberof).toBe('DataProcessor');
    }

    // None of the top-level / sibling entities from DataProcessor.js should appear.
    const names = members.map((m) => m.name);
    expect(names).not.toContain('BaseEntity'); // parent class
    expect(names).not.toContain('LoggerMixin'); // sibling @mixin
    expect(names).not.toContain('log'); // method on LoggerMixin
    expect(names).not.toContain('Utils'); // sibling @namespace
    expect(names).not.toContain('API_VERSION'); // member of Utils, not DataProcessor

    // The DataProcessor class doclet itself is not a member of itself.
    const longnames = members.map((m) => m.longname);
    expect(longnames).not.toContain('DataProcessor');
  });
});
