import { describe, it, expect } from 'vitest';
import { byteLength, humanFileSize, padColumn, ansi } from '../../config/format';

describe('byteLength', () => {
  it('measures UTF-8 byte length of strings (multibyte aware)', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('é')).toBe(2); // 2 UTF-8 bytes
    expect(byteLength('😀')).toBe(4); // 4 UTF-8 bytes
  });

  it('uses byteLength for a Uint8Array', () => {
    expect(byteLength(new Uint8Array([1, 2, 3, 4, 5]))).toBe(5);
  });
});

describe('humanFileSize', () => {
  it('uses raw bytes under 1 kB and clamps non-positive input', () => {
    expect(humanFileSize(0)).toBe('0 B');
    expect(humanFileSize(-10)).toBe('0 B');
    expect(humanFileSize(512)).toBe('512 B');
    expect(humanFileSize(999)).toBe('999 B');
  });

  it('rounds kB / MB to one decimal place', () => {
    expect(humanFileSize(1000)).toBe('1.0 kB');
    expect(humanFileSize(1536)).toBe('1.5 kB');
    expect(humanFileSize(12300)).toBe('12.3 kB');
    expect(humanFileSize(1_000_000)).toBe('1.0 MB');
    expect(humanFileSize(2_660_000)).toBe('2.7 MB'); // 2.66 → 2.7
  });

  it('steps up to GB for large sizes', () => {
    expect(humanFileSize(3_000_000_000)).toBe('3.0 GB');
  });
});

describe('padColumn', () => {
  it('left-pads (right-align) and right-pads (left-align) to width', () => {
    expect(padColumn('ab', 5)).toBe('ab   ');
    expect(padColumn('ab', 5, 'right')).toBe('   ab');
  });

  it('returns the text unchanged when already at or over width', () => {
    expect(padColumn('abcde', 5)).toBe('abcde');
    expect(padColumn('abcdef', 3)).toBe('abcdef');
  });

  it('pads to a stable, alignable column width', () => {
    const rows = ['/', '/user', '/module/x'].map((r) => padColumn(r, 12));
    expect(rows.every((r) => r.length === 12)).toBe(true);
  });
});

describe('ansi', () => {
  it('is a no-op when color is disabled', () => {
    expect(ansi.red('x', false)).toBe('x');
    expect(ansi.dim('x', false)).toBe('x');
  });

  it('wraps in SGR escapes when color is enabled', () => {
    expect(ansi.red('x', true)).toBe('\x1b[31mx\x1b[0m');
    expect(ansi.green('x', true)).toBe('\x1b[32mx\x1b[0m');
    expect(ansi.dim('x', true)).toBe('\x1b[90mx\x1b[0m');
  });
});
