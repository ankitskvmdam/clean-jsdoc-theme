import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import {
  collectDocs,
  resolveDocImages,
  overlayDocs,
  computeRelPaths,
  hasMarkdownPlugin,
  normalizeColors,
  normalizeDocGroups,
  normalizeMenu,
  normalizeMeta,
  normalizePlayground,
  normalizeSectionOrder,
  outputSourceFilesEnabled,
  resolveFooter,
} from '../publish';

describe('overlayDocs (per-locale docs overlay)', () => {
  const doc = (path: string, content: string) => ({ path, content, type: 'markdown' as const });
  const file = (p: string, c: string) => ({ path: p, contents: c });

  it('locale page wins, default-only page falls back, output sorted by path', () => {
    const base = {
      docs: [doc('getting-started', '# GS en'), doc('configuration', '# Config en')],
      files: [],
      inlineSvgs: {},
    };
    const locale = { docs: [doc('getting-started', '# GS ja')], files: [], inlineSvgs: {} };
    const merged = overlayDocs(base, locale);
    expect(merged.docs.map((d) => d.path)).toEqual(['configuration', 'getting-started']); // sorted
    expect(merged.docs.find((d) => d.path === 'getting-started')!.content).toBe('# GS ja'); // locale wins
    expect(merged.docs.find((d) => d.path === 'configuration')!.content).toBe('# Config en'); // fallback
  });

  it('dedupes identical image assets by served path; keeps distinct ones', () => {
    const base = { docs: [], files: [file('_assets/a.111.png', 'X')], inlineSvgs: { '/a': '<svg/>' } };
    const locale = {
      docs: [],
      files: [file('_assets/a.111.png', 'X'), file('_assets/b.222.png', 'Y')],
      inlineSvgs: { '/b': '<svg/>' },
    };
    const merged = overlayDocs(base, locale);
    expect(merged.files.map((f) => f.path).sort()).toEqual(['_assets/a.111.png', '_assets/b.222.png']);
    expect(merged.inlineSvgs).toEqual({ '/a': '<svg/>', '/b': '<svg/>' });
  });
});

describe('resolveFooter', () => {
  it('passes an inline HTML string through, trimmed', async () => {
    expect(await resolveFooter('  <footer>hi</footer>  ')).toBe('<footer>hi</footer>');
  });

  it('returns undefined for an empty/whitespace string (→ default footer)', async () => {
    expect(await resolveFooter('   ')).toBeUndefined();
    expect(await resolveFooter(undefined)).toBeUndefined();
  });

  it('reads the `{ file }` form from disk and returns its contents', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cjt-footer-'));
    try {
      const fp = join(dir, 'footer.html');
      await writeFile(fp, '<div class="ft">© 2026</div>\n', 'utf8');
      expect(await resolveFooter({ file: fp })).toBe('<div class="ft">© 2026</div>\n');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('warns and returns undefined when the `{ file }` is unreadable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(await resolveFooter({ file: '/no/such/footer.html' })).toBeUndefined();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('normalizeMeta', () => {
  it('keeps string→string attribute maps, trimming values', () => {
    expect(
      normalizeMeta([
        { name: 'description', content: '  Fast docs  ' },
        { property: 'og:title', content: 'My Library' },
      ])
    ).toEqual([
      { name: 'description', content: 'Fast docs' },
      { property: 'og:title', content: 'My Library' },
    ]);
  });

  it('coerces finite numbers to strings and drops blank/non-finite values', () => {
    expect(normalizeMeta([{ name: 'rating', content: 5, bad: '   ' }])).toEqual([
      { name: 'rating', content: '5' },
    ]);
  });

  it('drops (and warns on) an entry with no identifying attribute', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(normalizeMeta([{ content: 'orphan' }, { name: 'ok', content: 'y' }])).toEqual([
        { name: 'ok', content: 'y' },
      ]);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('returns undefined for a non-array or an all-empty result', () => {
    expect(normalizeMeta(undefined)).toBeUndefined();
    expect(normalizeMeta('nope')).toBeUndefined();
    expect(normalizeMeta([])).toBeUndefined();
  });
});

describe('hasMarkdownPlugin', () => {
  it('returns true for the canonical "plugins/markdown" entry', () => {
    expect(hasMarkdownPlugin(['plugins/markdown'])).toBe(true);
    expect(hasMarkdownPlugin(['plugins/escapeHtml', 'plugins/markdown'])).toBe(true);
  });

  it('tolerates a .js suffix, backslashes, and surrounding whitespace', () => {
    expect(hasMarkdownPlugin(['plugins/markdown.js'])).toBe(true);
    expect(hasMarkdownPlugin(['plugins\\markdown'])).toBe(true);
    expect(hasMarkdownPlugin([' plugins/markdown '])).toBe(true);
  });

  it('returns false when the markdown plugin is absent', () => {
    expect(hasMarkdownPlugin(['plugins/escapeHtml'])).toBe(false);
    expect(hasMarkdownPlugin([])).toBe(false);
  });

  it('returns false for non-arrays / undefined', () => {
    expect(hasMarkdownPlugin(undefined)).toBe(false);
    expect(hasMarkdownPlugin('plugins/markdown')).toBe(false);
    expect(hasMarkdownPlugin(null)).toBe(false);
  });

  it('does not match unrelated names that merely contain "markdown"', () => {
    expect(hasMarkdownPlugin(['plugins/markdown-extra'])).toBe(false);
    expect(hasMarkdownPlugin(['my-markdownish'])).toBe(false);
  });
});

describe('outputSourceFilesEnabled', () => {
  it('defaults to true when nothing disables it', () => {
    expect(outputSourceFilesEnabled({} as never)).toBe(true);
  });

  it('honors opts.templates.default.outputSourceFiles === false', () => {
    expect(
      outputSourceFilesEnabled({
        templates: { default: { outputSourceFiles: false } },
      } as never)
    ).toBe(false);
  });

  it('stays true for any non-false value (true / undefined / truthy)', () => {
    expect(
      outputSourceFilesEnabled({ templates: { default: { outputSourceFiles: true } } } as never)
    ).toBe(true);
    expect(outputSourceFilesEnabled({ templates: { default: {} } } as never)).toBe(true);
    // A non-boolean truthy value is not `=== false`, so it stays enabled.
    expect(
      outputSourceFilesEnabled({ templates: { default: { outputSourceFiles: 1 } } } as never)
    ).toBe(true);
  });
});

describe('computeRelPaths', () => {
  it('returns an empty map for no paths', () => {
    expect(computeRelPaths([]).size).toBe(0);
  });

  it('strips the longest common dir prefix (posix)', () => {
    const m = computeRelPaths(['/repo/src/Foo.js', '/repo/src/util/index.ts', '/repo/lib/main.js']);
    expect(m.get('/repo/src/Foo.js')).toBe('src/Foo.js');
    expect(m.get('/repo/src/util/index.ts')).toBe('src/util/index.ts');
    expect(m.get('/repo/lib/main.js')).toBe('lib/main.js');
  });

  it('handles win32 backslash paths and normalizes to forward slashes', () => {
    const m = computeRelPaths(['C:\\repo\\src\\Foo.js', 'C:\\repo\\src\\util\\Bar.ts']);
    expect(m.get('C:\\repo\\src\\Foo.js')).toBe('Foo.js');
    expect(m.get('C:\\repo\\src\\util\\Bar.ts')).toBe('util/Bar.ts');
  });

  it('compares segments case-insensitively (win32 drive/dir casing)', () => {
    const m = computeRelPaths(['C:\\Repo\\Src\\Foo.js', 'c:\\repo\\src\\Bar.js']);
    expect(m.get('C:\\Repo\\Src\\Foo.js')).toBe('Foo.js');
    expect(m.get('c:\\repo\\src\\Bar.js')).toBe('Bar.js');
  });

  it('single file resolves to its basename', () => {
    const m = computeRelPaths(['/a/b/c/only.ts']);
    expect(m.get('/a/b/c/only.ts')).toBe('only.ts');
  });

  it('falls back to basenames when paths share no common prefix (different drives)', () => {
    const m = computeRelPaths(['C:\\projA\\Foo.js', 'D:\\projB\\Bar.js']);
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
      ])
    ).toEqual([
      { id: 'home', title: 'Start' },
      { id: 'github', link: 'https://x.y', icon: 'github' },
      { id: 'npm', link: 'https://npmjs.com/p' },
    ]);
  });

  it('drops entries with neither id nor link, and non-objects', () => {
    expect(normalizeMenu([{ title: 'orphan' }, 'nope', null, { icon: 'github' }])).toBeUndefined();
  });

  it('keeps `target` and `class` (trimmed) when present', () => {
    expect(
      normalizeMenu([
        { id: 'github', link: 'https://x.y', target: ' _self ', class: ' menu-gh ' },
        { id: 'home' }, // no target/class → neither key emitted
      ])
    ).toEqual([
      { id: 'github', link: 'https://x.y', target: '_self', class: 'menu-gh' },
      { id: 'home' },
    ]);
  });
});

describe('normalizeDocGroups', () => {
  it('returns undefined for non-arrays', () => {
    expect(normalizeDocGroups(undefined)).toBeUndefined();
    expect(normalizeDocGroups('Guides')).toBeUndefined();
  });

  it('trims strings and drops non-strings / empties', () => {
    expect(normalizeDocGroups([' Guides ', 'Reference', 3, ''])).toEqual(['Guides', 'Reference']);
  });
});

describe('normalizeColors', () => {
  it('keeps known palette keys with non-empty string values, trimming them', () => {
    expect(normalizeColors({ bg: ' oklch(0.6 0.25 0) ', accent: '#fff' })).toEqual({
      bg: 'oklch(0.6 0.25 0)',
      accent: '#fff',
    });
  });

  it('drops unknown keys and non-string / empty values', () => {
    expect(normalizeColors({ bg: 'red', nope: 'x', fg: 42, border: '  ' })).toEqual({ bg: 'red' });
  });

  it('keeps the code-chrome palette keys', () => {
    expect(
      normalizeColors({
        codeHeaderBg: '#f7f7f7',
        codeHeaderFg: 'oklch(0.45 0 0)',
        codeHighlightBg: '#f7f7f7',
      })
    ).toEqual({
      codeHeaderBg: '#f7f7f7',
      codeHeaderFg: 'oklch(0.45 0 0)',
      codeHighlightBg: '#f7f7f7',
    });
  });

  it('returns undefined for non-objects, arrays, and inputs with no usable keys', () => {
    expect(normalizeColors(undefined)).toBeUndefined();
    expect(normalizeColors('red')).toBeUndefined();
    expect(normalizeColors(['red'])).toBeUndefined();
    expect(normalizeColors({ nope: 'x' })).toBeUndefined();
    expect(normalizeColors({})).toBeUndefined();
  });
});

describe('normalizePlayground', () => {
  it('is off (undefined) when absent or false', () => {
    expect(normalizePlayground(undefined)).toBeUndefined();
    expect(normalizePlayground(null)).toBeUndefined();
    expect(normalizePlayground(false)).toBeUndefined();
  });

  it('turns on with defaults for `true` / `{}` (feature on, opt-in per @example)', () => {
    expect(normalizePlayground(true)).toEqual({ site: {}, theme: { enabled: true } });
    expect(normalizePlayground({})).toEqual({ site: {}, theme: { enabled: true } });
  });

  it('reads enableForAllExamples + provider selection (order preserved, deduped, unknowns dropped)', () => {
    expect(
      normalizePlayground({
        enableForAllExamples: true,
        providers: ['jsfiddle', 'codepen', 'jsfiddle', 'bogus', 42],
      })
    ).toEqual({
      site: { enableForAllExamples: true, providers: ['jsfiddle', 'codepen'] },
      theme: { enabled: true },
    });
  });

  it('threads per-provider option records into the theme slice only', () => {
    expect(
      normalizePlayground({
        providers: ['codepen'],
        codepen: { js_external: 'https://x/y.js', js_pre_processor: 'babel' },
        jsfiddle: 'nope',
        codesandbox: { dependencies: { lodash: '4' } },
      })
    ).toEqual({
      site: { providers: ['codepen'] },
      theme: {
        enabled: true,
        codepen: { js_external: 'https://x/y.js', js_pre_processor: 'babel' },
        codesandbox: { dependencies: { lodash: '4' } },
      },
    });
  });

  it('ignores junk providers / non-array providers and a non-object/array input', () => {
    expect(normalizePlayground({ providers: 'codepen' })).toEqual({
      site: {},
      theme: { enabled: true },
    });
    expect(normalizePlayground({ providers: ['bogus'] })).toEqual({
      site: {},
      theme: { enabled: true },
    });
    expect(normalizePlayground('on')).toBeUndefined();
    expect(normalizePlayground(['codepen'])).toBeUndefined();
  });
});

describe('collectDocs', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cjt-docs-'));
    await writeFile(join(dir, 'index.md'), '# Home\n', 'utf8');
    await writeFile(join(dir, 'getting-started.markdown'), '# Start\n', 'utf8');
    await writeFile(join(dir, 'page.html'), '<h1>HTML</h1>', 'utf8');
    await mkdir(join(dir, 'guides'), { recursive: true });
    await writeFile(join(dir, 'guides', 'advanced.md'), '# Advanced\n', 'utf8');
    // Noise that must be skipped.
    await writeFile(join(dir, 'notes.txt'), 'ignored', 'utf8');
    await writeFile(join(dir, '.hidden.md'), 'hidden', 'utf8');
    await mkdir(join(dir, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(join(dir, 'node_modules', 'pkg', 'readme.md'), 'nope', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('walks recursively producing POSIX, extension-stripped relative paths', async () => {
    const docs = await collectDocs(dir);
    expect(docs.map((d) => d.path)).toEqual([
      'getting-started',
      'guides/advanced',
      'index',
      'page',
    ]);
  });

  it('maps md/markdown → markdown and html → html, with raw content', async () => {
    const docs = await collectDocs(dir);
    const byPath = Object.fromEntries(docs.map((d) => [d.path, d]));
    expect(byPath['index'].type).toBe('markdown');
    expect(byPath['getting-started'].type).toBe('markdown');
    expect(byPath['guides/advanced'].type).toBe('markdown');
    expect(byPath['page'].type).toBe('html');
    expect(byPath['index'].content).toBe('# Home\n');
  });

  it('skips dotfiles, node_modules, and non-doc extensions', async () => {
    const docs = await collectDocs(dir);
    const paths = docs.map((d) => d.path);
    expect(paths).not.toContain('notes');
    expect(paths).not.toContain('.hidden');
    expect(paths.some((p) => p.includes('node_modules'))).toBe(false);
  });

  it('returns [] for a missing directory (never throws)', async () => {
    expect(await collectDocs(join(dir, 'does-not-exist'))).toEqual([]);
    expect(await collectDocs('')).toEqual([]);
  });
});

describe('resolveDocImages', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cjt-doc-images-'));
    await mkdir(join(dir, 'assets'), { recursive: true });
    await writeFile(join(dir, 'assets', 'diagram.svg'), '<svg/>', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('copies a referenced image to a hashed _assets path and rewrites the src', async () => {
    const docs = [
      { path: 'overview', type: 'markdown' as const, content: '# Overview\n\n![Diagram](./assets/diagram.svg)\n' },
    ];
    const { docs: out, files, inlineSvgs } = await resolveDocImages(docs, dir);
    expect(files).toHaveLength(1);
    expect(files[0].path).toMatch(/^_assets\/diagram\.[0-9a-f]{8}\.svg$/);
    expect(files[0].contents.toString()).toBe('<svg/>');
    // The src is rewritten to the root-relative hashed path; the original is gone.
    expect(out[0].content).toMatch(/!\[Diagram\]\(\/_assets\/diagram\.[0-9a-f]{8}\.svg\)/);
    expect(out[0].content).not.toContain('./assets/diagram.svg');
    // The SVG is also collected for inlining, keyed by its rewritten src, with a
    // responsive sizing style injected onto the root element.
    const served = '/' + files[0].path;
    expect(inlineSvgs[served]).toBe('<svg style="max-width:100%;height:auto;display:block"/>');
  });

  it('leaves external, data, and unreadable srcs untouched (no copy)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const docs = [
      {
        path: 'x',
        type: 'markdown' as const,
        content: '![a](https://x.com/i.png)\n![b](data:image/svg+xml,abc)\n![c](./missing.png)\n',
      },
    ];
    const { docs: out, files } = await resolveDocImages(docs, dir);
    expect(files).toHaveLength(0);
    expect(out[0].content).toContain('https://x.com/i.png');
    expect(out[0].content).toContain('data:image/svg+xml,abc');
    expect(out[0].content).toContain('./missing.png');
    vi.restoreAllMocks();
  });

  it('returns docs unchanged when there are none', async () => {
    expect(await resolveDocImages([], dir)).toEqual({ docs: [], files: [], inlineSvgs: {} });
  });
});
