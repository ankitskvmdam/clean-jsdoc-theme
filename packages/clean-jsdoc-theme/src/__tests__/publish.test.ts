import { describe, it, expect } from 'vitest';
import {
  computeRelPaths,
  normalizeMenu,
  normalizeSectionOrder,
  outputSourceFilesEnabled,
} from '../publish';

describe('outputSourceFilesEnabled', () => {
  it('defaults to true when nothing disables it', () => {
    expect(outputSourceFilesEnabled({} as never)).toBe(true);
  });

  it('honors opts.templates.default.outputSourceFiles === false', () => {
    expect(
      outputSourceFilesEnabled({
        templates: { default: { outputSourceFiles: false } },
      } as never),
    ).toBe(false);
  });

  it('stays true for any non-false value (true / undefined / truthy)', () => {
    expect(
      outputSourceFilesEnabled({ templates: { default: { outputSourceFiles: true } } } as never),
    ).toBe(true);
    expect(
      outputSourceFilesEnabled({ templates: { default: {} } } as never),
    ).toBe(true);
    // A non-boolean truthy value is not `=== false`, so it stays enabled.
    expect(
      outputSourceFilesEnabled({ templates: { default: { outputSourceFiles: 1 } } } as never),
    ).toBe(true);
  });
});

describe('computeRelPaths', () => {
  it('returns an empty map for no paths', () => {
    expect(computeRelPaths([]).size).toBe(0);
  });

  it('strips the longest common dir prefix (posix)', () => {
    const m = computeRelPaths([
      '/repo/src/Foo.js',
      '/repo/src/util/index.ts',
      '/repo/lib/main.js',
    ]);
    expect(m.get('/repo/src/Foo.js')).toBe('src/Foo.js');
    expect(m.get('/repo/src/util/index.ts')).toBe('src/util/index.ts');
    expect(m.get('/repo/lib/main.js')).toBe('lib/main.js');
  });

  it('handles win32 backslash paths and normalizes to forward slashes', () => {
    const m = computeRelPaths([
      'C:\\repo\\src\\Foo.js',
      'C:\\repo\\src\\util\\Bar.ts',
    ]);
    expect(m.get('C:\\repo\\src\\Foo.js')).toBe('Foo.js');
    expect(m.get('C:\\repo\\src\\util\\Bar.ts')).toBe('util/Bar.ts');
  });

  it('compares segments case-insensitively (win32 drive/dir casing)', () => {
    const m = computeRelPaths([
      'C:\\Repo\\Src\\Foo.js',
      'c:\\repo\\src\\Bar.js',
    ]);
    expect(m.get('C:\\Repo\\Src\\Foo.js')).toBe('Foo.js');
    expect(m.get('c:\\repo\\src\\Bar.js')).toBe('Bar.js');
  });

  it('single file resolves to its basename', () => {
    const m = computeRelPaths(['/a/b/c/only.ts']);
    expect(m.get('/a/b/c/only.ts')).toBe('only.ts');
  });

  it('falls back to basenames when paths share no common prefix (different drives)', () => {
    const m = computeRelPaths([
      'C:\\projA\\Foo.js',
      'D:\\projB\\Bar.js',
    ]);
    expect(m.get('C:\\projA\\Foo.js')).toBe('Foo.js');
    expect(m.get('D:\\projB\\Bar.js')).toBe('Bar.js');
  });
});

describe('normalizeSectionOrder', () => {
  it('returns undefined for non-arrays', () => {
    expect(normalizeSectionOrder(undefined)).toBeUndefined();
    expect(normalizeSectionOrder('Classes')).toBeUndefined();
    expect(normalizeSectionOrder({})).toBeUndefined();
  });

  it('trims strings and drops non-strings / empties', () => {
    expect(normalizeSectionOrder([' Classes ', 'Tutorials', 2, '', null])).toEqual([
      'Classes',
      'Tutorials',
    ]);
  });

  it('returns undefined when nothing usable remains', () => {
    expect(normalizeSectionOrder(['', '   ', 5])).toBeUndefined();
  });
});

describe('normalizeMenu', () => {
  it('returns undefined for non-arrays', () => {
    expect(normalizeMenu(undefined)).toBeUndefined();
    expect(normalizeMenu('x')).toBeUndefined();
  });

  it('keeps id/title/link/icon (trimmed) and reads the link from `link` or `href`', () => {
    expect(
      normalizeMenu([
        { id: ' home ', title: ' Start ' },
        { id: 'github', link: ' https://x.y ', icon: ' github ' },
        { id: 'npm', href: 'https://npmjs.com/p' }, // href accepted as alias
      ]),
    ).toEqual([
      { id: 'home', title: 'Start' },
      { id: 'github', link: 'https://x.y', icon: 'github' },
      { id: 'npm', link: 'https://npmjs.com/p' },
    ]);
  });

  it('drops entries with neither id nor link, and non-objects', () => {
    expect(normalizeMenu([{ title: 'orphan' }, 'nope', null, { icon: 'github' }])).toBeUndefined();
  });
});
