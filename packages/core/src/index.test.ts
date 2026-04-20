import { describe, it, expect } from 'vitest';
import { generateMdx } from './index';

describe('generateMdx', () => {
  it('returns an empty array for no doclets', () => {
    expect(generateMdx([])).toEqual([]);
  });
});
