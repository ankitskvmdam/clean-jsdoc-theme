import { describe, it, expect } from 'vitest';
import {
  fuzzyMatch,
  fuzzySearch,
  fuzzySearchMulti,
  highlightSegments,
} from '../components/search-utils';

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

describe('fuzzySearchMulti', () => {
  interface Entry {
    title: string;
    description?: string;
    content?: string;
    context?: string;
  }
  const fields = [
    { get: (e: Entry) => e.title, weight: 1, highlight: true },
    { get: (e: Entry) => e.context, weight: 0.6 },
    { get: (e: Entry) => e.description, weight: 0.5 },
    { get: (e: Entry) => e.content, weight: 0.35 },
  ];

  it('matches body content and descriptions, not just the title', () => {
    const items: Entry[] = [
      { title: 'Queue', content: 'a class for jobs' },
      { title: 'Other', description: 'unrelated', content: 'nothing here' },
      { title: 'Readme', content: 'install the package with npm install' },
    ];
    const out = fuzzySearchMulti('install', items, fields);
    // "install" appears only in Readme's content — still found.
    expect(out.map((r) => r.item.title)).toContain('Readme');
    expect(out.some((r) => r.item.title === 'Queue')).toBe(false);
  });

  it('ranks a title hit above a content-only hit', () => {
    const items: Entry[] = [
      { title: 'Logger', content: 'misc' },
      { title: 'Misc', content: 'the logger lives here' },
    ];
    const out = fuzzySearchMulti('logger', items, fields);
    expect(out[0].item.title).toBe('Logger');
  });

  it('finds a member by name and surfaces its parent context', () => {
    const items: Entry[] = [
      { title: 'process', context: 'DataProcessor' },
      { title: 'Home', content: 'welcome' },
    ];
    const out = fuzzySearchMulti('process', items, fields);
    expect(out[0].item.title).toBe('process');
    expect(out[0].item.context).toBe('DataProcessor');
  });

  it('highlights only the title field positions', () => {
    const items: Entry[] = [{ title: 'Queue', content: 'queue queue queue' }];
    const out = fuzzySearchMulti('queue', items, fields);
    // Positions index into the title (length 5), never the longer content.
    expect(out[0].match.positions.every((p) => p < 5)).toBe(true);
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
