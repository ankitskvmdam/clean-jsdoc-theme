import { describe, it, expect } from 'vitest';
import { collapseWhitespace, isWhitespaceCode } from '../site/whitespace';
import { expectLinearScaling, PERF_TEST_TIMEOUT } from './linear-scaling';

/** The behaviour {@link collapseWhitespace} must reproduce exactly. */
const viaRegex = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** The 25 code units `/\s/` matches. */
const WHITESPACE = [
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
  0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
].map((c) => String.fromCharCode(c));

const cases: string[] = [
  '',
  ' ',
  ' \t\n\r\f\v',
  '  a  ',
  'a',
  'ab  cd',
  'a\r\nb\r\n',
  ' \t\r\n  ﻿ mixed \t\r\n  ﻿',
  // Near misses: not `\s`.
  'a​b ​',
  'a\u0085b \u0085',
  'a᠎b ᠎',
  'a⁠b ⁠',
  '\u001c a\u001d\u001eb\u001f',
  // Surrogates pass through as code units.
  '\ud83d a \ud83d',
  '\ude00 a \ude00',
  ' \u{1F600}  \u{1F600} ',
  ...WHITESPACE.flatMap((w) => [`${w}a`, `a${w}`, `a${w}b`, `a${w}${w}b`, `${w}${w}`]),
  ...[8191, 8192, 8193, 16384, 16385].flatMap((n) => [
    'x'.repeat(n),
    'x '.repeat(n),
    ' x'.repeat(n),
    'x'.repeat(n) + '  y',
  ]),
];

const limits = [0, 1, 2, 5, 8192, 8193, Infinity];

describe('isWhitespaceCode', () => {
  it('matches /\\s/ on every UTF-16 code unit', () => {
    let count = 0;
    for (let c = 0; c <= 0xffff; c++) {
      const expected = /\s/.test(String.fromCharCode(c));
      if (isWhitespaceCode(c) !== expected) {
        expect(isWhitespaceCode(c), `U+${c.toString(16)}`).toBe(expected);
      }
      if (expected) count++;
    }
    expect(count).toBe(25);
    expect(WHITESPACE.every((w) => isWhitespaceCode(w.charCodeAt(0)))).toBe(true);
  });
});

describe('collapseWhitespace', () => {
  it.each(
    cases.map((s) => [
      s.length > 40 ? `${JSON.stringify(s.slice(0, 20))}… (${s.length})` : JSON.stringify(s),
      s,
    ])
  )('equals the regex on %s', (_name, s) => {
    expect(collapseWhitespace(s)).toBe(viaRegex(s));
  });

  it.each(limits)('caps the output exactly at %s', (limit) => {
    for (const s of cases) {
      const expected = viaRegex(s).slice(0, limit);
      if (collapseWhitespace(s, limit) !== expected) {
        expect(collapseWhitespace(s, limit), JSON.stringify(s.slice(0, 40))).toBe(expected);
      }
    }
  });

  it('cuts at a collapsed space', () => {
    expect(collapseWhitespace('ab  cd', 3)).toBe('ab ');
    expect(collapseWhitespace('  ab \n\t cd  ', 4)).toBe('ab c');
  });

  it('equals the regex on random strings', () => {
    // Deterministic LCG, so a failure reproduces.
    let seed = 383;
    const next = (m: number): number => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return (seed >>> 8) % m;
    };
    const alphabet = ['a', 'b', 'Z', '\ud83d', '\ude00', '​', '\u0085', ...WHITESPACE];
    for (let i = 0; i < 20_000; i++) {
      let s = '';
      const len = next(24);
      for (let j = 0; j < len; j++) s += alphabet[next(alphabet.length)];
      const limit = next(4) === 0 ? Infinity : next(26);
      const expected = viaRegex(s).slice(0, limit);
      if (collapseWhitespace(s, limit) !== expected) {
        expect(collapseWhitespace(s, limit), `${JSON.stringify(s)} @ ${limit}`).toBe(expected);
      }
    }
  });

  it.each<[string, (n: number) => string]>([
    ['stray < characters', (n) => 'a < b '.repeat(n / 6)],
    ['long whitespace runs', (n) => ('word' + ' \t\n'.repeat(4)).repeat(n / 16)],
    ['short words', (n) => 'ab cd ef '.repeat(n / 9)],
    ['blank lines', (n) => 'line of text\n\n'.repeat(n / 14)],
  ])(
    'scales linearly on %s',
    (_name, makeInput) => {
      expectLinearScaling(collapseWhitespace, makeInput);
    },
    PERF_TEST_TIMEOUT
  );
});
