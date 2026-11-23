import { describe, it, expect } from 'vitest';
import { unknownSectionOrderLabels } from '../site/section-order';

const KNOWN = ['Classes', 'Modules', 'Events', 'Globals', 'Tutorials', 'Docs'];

describe('unknownSectionOrderLabels', () => {
  it('returns nothing for an absent or empty sectionOrder', () => {
    expect(unknownSectionOrderLabels(undefined, KNOWN)).toEqual([]);
    expect(unknownSectionOrderLabels([], KNOWN)).toEqual([]);
  });

  it('accepts labels that are all known', () => {
    expect(unknownSectionOrderLabels(['Classes', 'Events', 'Docs'], KNOWN)).toEqual([]);
  });

  it('flags typos with a did-you-mean suggestion', () => {
    expect(unknownSectionOrderLabels(['Clases', 'Globalz'], KNOWN)).toEqual([
      { label: 'Clases', suggestion: 'Classes' },
      { label: 'Globalz', suggestion: 'Globals' },
    ]);
  });

  it('accepts an alias without ever suggesting it', () => {
    expect(unknownSectionOrderLabels(['Global'], KNOWN, ['Global'])).toEqual([]);
    expect(unknownSectionOrderLabels(['Globl'], ['Classes'], ['Global'])).toEqual([
      { label: 'Globl' },
    ]);
  });

  it('matches case-sensitively and suggests the correctly cased label', () => {
    expect(unknownSectionOrderLabels(['classes'], KNOWN)).toEqual([
      { label: 'classes', suggestion: 'Classes' },
    ]);
  });

  it('gives no suggestion for a far-off label', () => {
    expect(unknownSectionOrderLabels(['Widgets and gadgets'], KNOWN)).toEqual([
      { label: 'Widgets and gadgets' },
    ]);
  });

  it('reports a repeated unknown label once', () => {
    expect(unknownSectionOrderLabels(['Clases', 'Clases'], KNOWN)).toEqual([
      { label: 'Clases', suggestion: 'Classes' },
    ]);
  });

  it('accepts a custom group label that is in the known set', () => {
    expect(unknownSectionOrderLabels(['Utilities'], [...KNOWN, 'Utilities'])).toEqual([]);
  });
});
