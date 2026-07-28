import { describe, it, expect } from 'vitest';
import { normalizeScrollbar } from '../config/scrollbar';

describe('normalizeScrollbar', () => {
  it('passes each valid mode through with no warnings', () => {
    for (const m of ['styled', 'visible', 'native'] as const) {
      expect(normalizeScrollbar(m)).toEqual({ value: m, warnings: [] });
    }
  });
  it('undefined → undefined, no warnings', () => {
    expect(normalizeScrollbar(undefined)).toEqual({ value: undefined, warnings: [] });
  });
  it('unknown string → undefined + one warning (typo case)', () => {
    const r = normalizeScrollbar('visable');
    expect(r.value).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });
  it('non-string → undefined + one warning', () => {
    const r = normalizeScrollbar(true);
    expect(r.value).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });
});
