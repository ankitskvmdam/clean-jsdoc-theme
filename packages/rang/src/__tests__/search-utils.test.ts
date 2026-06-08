import { describe, it, expect } from 'vitest';
import { fuzzyMatch, fuzzySearch, highlightSegments } from '../components/search-utils';

describe('fuzzyMatch', () => {
  it('matches a case-insensitive subsequence and reports positions', () => {
    const m = fuzzyMatch('dp', 'DataProcessor');
    expect(m).not.toBeNull();
    expect(m!.positions).toEqual([0, 4]); // D…P
  });

  it('returns null when the query is not a subsequence', () => {
    expect(fuzzyMatch('xyz', 'DataProcessor')).toBeNull();
    expect(fuzzyMatch('pd', 'DataProcessor')).toBeNull(); // order matters
  });

  it('treats an empty query as a neutral match', () => {
    expect(fuzzyMatch('', 'anything')).toEqual({ score: 0, positions: [] });
  });

  it('scores boundary matches above mid-word matches', () => {
    // "Q" at the start of a camel/boundary should beat "q" buried mid-word.
    const boundary = fuzzyMatch('q', 'queue/Queue')!;
    const midword = fuzzyMatch('u', 'queue/Queue')!;
    expect(boundary.score).toBeGreaterThan(midword.score);
  });

  it('rewards consecutive runs over scattered mid-word matches', () => {
    const consecutive = fuzzyMatch('abc', 'abcdef')!;
    const scattered = fuzzyMatch('abc', 'axbxcx')!;
    expect(consecutive.score).toBeGreaterThan(scattered.score);
  });
});

describe('fuzzySearch', () => {
  const items = [
    { title: 'Queue' },
    { title: 'queue/Queue' },
    { title: 'DataProcessor' },
    { title: 'BaseEntity' },
  ];
  const text = (i: { title: string }) => i.title;

  it('drops non-matches and ranks the rest by score', () => {
    const out = fuzzySearch('queue', items, text);
    expect(out.map((r) => r.item.title)).toEqual(['Queue', 'queue/Queue']);
    // Exact, shorter "Queue" outranks the longer "queue/Queue".
    expect(out[0].item.title).toBe('Queue');
  });

  it('ranks a camelCase initialism match high (dp → DataProcessor)', () => {
    const out = fuzzySearch('dp', items, text);
    expect(out).toHaveLength(1);
    expect(out[0].item.title).toBe('DataProcessor');
  });

  it('returns the first N items unranked for an empty query', () => {
    const out = fuzzySearch('   ', items, text, 2);
    expect(out.map((r) => r.item.title)).toEqual(['Queue', 'queue/Queue']);
  });

  it('honors the result limit', () => {
    expect(fuzzySearch('e', items, text, 1)).toHaveLength(1);
  });
});

describe('highlightSegments', () => {
  it('splits text into merged matched / unmatched runs', () => {
    expect(highlightSegments('DataProcessor', [0, 4])).toEqual([
      { text: 'D', match: true },
      { text: 'ata', match: false },
      { text: 'P', match: true },
      { text: 'rocessor', match: false },
    ]);
  });

  it('merges adjacent matched characters', () => {
    expect(highlightSegments('Processor', [0, 1, 2, 3])).toEqual([
      { text: 'Proc', match: true },
      { text: 'essor', match: false },
    ]);
  });

  it('returns a single unmatched run when there are no positions', () => {
    expect(highlightSegments('abc', [])).toEqual([{ text: 'abc', match: false }]);
  });
});
