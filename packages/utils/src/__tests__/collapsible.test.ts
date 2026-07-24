import { describe, it, expect } from 'vitest';
import {
  topLevelSectionLabels,
  resolveCollapsibleSections,
  unmatchedCollapsibleSections,
  normalizeCollapsibleSidebarSections,
} from '../site/collapsible';
import type { NavNode } from '../site/manifest';

const NAV: NavNode[] = [
  { label: 'Home', slug: '', menu: true },
  { label: 'BaseEntity', slug: 'baseentity', group: 'Classes' },
  { label: 'DataProcessor', slug: 'dataprocessor', group: 'Classes' },
  { label: 'coreschema', slug: 'module/coreschema', group: 'Modules' },
  { label: 'Source Files', slug: 'source', group: 'Source Files' },
];

describe('topLevelSectionLabels', () => {
  it('returns distinct non-menu group labels in first-seen order', () => {
    expect(topLevelSectionLabels(NAV)).toEqual(['Classes', 'Modules', 'Source Files']);
  });
});

describe('resolveCollapsibleSections', () => {
  const present = ['Classes', 'Modules', 'Source Files'];
  it('undefined → all present (default)', () => {
    expect(resolveCollapsibleSections(undefined, present)).toEqual(present);
  });
  it('true → all present', () => {
    expect(resolveCollapsibleSections(true, present)).toEqual(present);
  });
  it('false → none', () => {
    expect(resolveCollapsibleSections(false, present)).toEqual([]);
  });
  it('array → only exact matches, in present order', () => {
    expect(resolveCollapsibleSections(['Modules', 'Classes'], present)).toEqual([
      'Classes',
      'Modules',
    ]);
  });
  it('array match is case-sensitive / exact (no lenient fallback)', () => {
    expect(resolveCollapsibleSections(['Class', 'namespaces'], present)).toEqual([]);
  });
});

describe('unmatchedCollapsibleSections', () => {
  const present = ['Classes', 'Modules'];
  it('reports array entries matching no section', () => {
    expect(unmatchedCollapsibleSections(['Classes', 'Class', 'Foo'], present)).toEqual([
      'Class',
      'Foo',
    ]);
  });
  it('boolean forms have no unmatched labels', () => {
    expect(unmatchedCollapsibleSections(true, present)).toEqual([]);
    expect(unmatchedCollapsibleSections(false, present)).toEqual([]);
    expect(unmatchedCollapsibleSections(undefined, present)).toEqual([]);
  });
});

describe('normalizeCollapsibleSidebarSections', () => {
  it('passes booleans through with no warnings', () => {
    expect(normalizeCollapsibleSidebarSections(true)).toEqual({ value: true, warnings: [] });
    expect(normalizeCollapsibleSidebarSections(false)).toEqual({ value: false, warnings: [] });
  });
  it('undefined → undefined, no warnings', () => {
    expect(normalizeCollapsibleSidebarSections(undefined)).toEqual({
      value: undefined,
      warnings: [],
    });
  });
  it('keeps string arrays, warns + drops non-string entries', () => {
    const r = normalizeCollapsibleSidebarSections(['Classes', 3, 'Modules']);
    expect(r.value).toEqual(['Classes', 'Modules']);
    expect(r.warnings.length).toBe(1);
  });
  it('rejects other types with a warning and falls back to undefined', () => {
    const r = normalizeCollapsibleSidebarSections({ nope: true });
    expect(r.value).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });
});
