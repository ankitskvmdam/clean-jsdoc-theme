import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import {
  collectDocs,
  resolveDocImages,
  resolveTutorialImages,
  resolveDocletImages,
  createImageCollector,
  overlayDocs,
  computeRelPaths,
  hasMarkdownPlugin,
  normalizeColors,
  normalizeDocGroups,
  normalizeMenu,
  cleanOutputDirEnabled,
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

describe('cleanOutputDirEnabled', () => {
  it('defaults to true when nothing disables it', () => {
    expect(cleanOutputDirEnabled({} as never)).toBe(true);
    expect(cleanOutputDirEnabled({ templates: { default: {} } } as never)).toBe(true);
  });

  it('honors opts.templates.default.cleanOutputDir === false', () => {
    expect(
      cleanOutputDirEnabled({ templates: { default: { cleanOutputDir: false } } } as never)
    ).toBe(false);
  });

  it('stays true for any non-false value (true / truthy)', () => {
    expect(
      cleanOutputDirEnabled({ templates: { default: { cleanOutputDir: true } } } as never)
    ).toBe(true);
    // A non-boolean truthy value is not `=== false`, so it stays enabled.
    expect(cleanOutputDirEnabled({ templates: { default: { cleanOutputDir: 1 } } } as never)).toBe(
      true
    );
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

  it('rewrites raw HTML <img> srcs too (both quote styles)', async () => {
    const docs = [
      {
        path: 'overview',
        type: 'html' as const,
        content: '<p><img src="./assets/diagram.svg" alt="d"></p>\n<img src=\'./assets/diagram.svg\' />',
      },
    ];
    const { docs: out, files } = await resolveDocImages(docs, dir);
    // Same image referenced twice → copied once, both srcs rewritten.
    expect(files).toHaveLength(1);
    const m = out[0].content.match(/\/_assets\/diagram\.[0-9a-f]{8}\.svg/g);
    expect(m).toHaveLength(2);
    expect(out[0].content).not.toContain('./assets/diagram.svg');
  });

  it('leaves image syntax inside code spans and fenced blocks untouched', async () => {
    const docs = [
      {
        path: 'overview',
        type: 'markdown' as const,
        // The real image (top) resolves; the two shown AS EXAMPLES (inline code +
        // fenced block) must be left verbatim, even though the file exists.
        content:
          '![real](./assets/diagram.svg)\n\n' +
          'Write `![alt](./assets/diagram.svg)` to embed it.\n\n' +
          '```md\n![alt](./assets/diagram.svg)\n```\n',
      },
    ];
    const { docs: out, files } = await resolveDocImages(docs, dir);
    // Only the real one was copied (deduped to a single asset).
    expect(files).toHaveLength(1);
    const rewritten = out[0].content.match(/\/_assets\/diagram\.[0-9a-f]{8}\.svg/g) ?? [];
    expect(rewritten).toHaveLength(1); // just the top reference
    // The code-span and fenced occurrences keep the literal source path.
    expect(out[0].content).toContain('`![alt](./assets/diagram.svg)`');
    expect(out[0].content).toContain('```md\n![alt](./assets/diagram.svg)\n```');
  });

  it('does not warn for an unreadable image shown only as code-example syntax', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const docs = [
      { path: 'x', type: 'markdown' as const, content: 'Example: `![d](./nope.png)`\n' },
    ];
    const { files } = await resolveDocImages(docs, dir);
    expect(files).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled(); // never attempted to read it
    warn.mockRestore();
  });

  it('returns docs unchanged when there are none', async () => {
    expect(await resolveDocImages([], dir)).toEqual({ docs: [], files: [], inlineSvgs: {} });
  });
});

describe('resolveTutorialImages', () => {
  let dir: string;

  beforeAll(async () => {
    // Tutorials live in `<dir>/tutorials`; the image is a sibling `<dir>/img`,
    // referenced from a tutorial as `../img/x.svg` (the bug-report pattern).
    dir = await mkdtemp(join(tmpdir(), 'cjt-tut-images-'));
    await mkdir(join(dir, 'img'), { recursive: true });
    await writeFile(join(dir, 'img', 'flow.svg'), '<svg/>', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('copies + rewrites a relative tutorial image and recurses into children', async () => {
    const tree = [
      {
        name: 'guide',
        title: 'Guide',
        type: 'markdown' as const,
        content: '# Guide\n\n![Flow](../img/flow.svg)\n',
        children: [
          {
            name: 'sub',
            title: 'Sub',
            type: 'html' as const,
            content: '<img src="../img/flow.svg" alt="f">',
            children: [],
          },
        ],
      },
    ];
    const collector = createImageCollector();
    const tutorialsDir = join(dir, 'tutorials');
    const out = await resolveTutorialImages(tree, tutorialsDir, collector);
    // Copied once (shared by parent + child via the collector cache).
    expect(collector.files).toHaveLength(1);
    expect(collector.files[0].path).toMatch(/^_assets\/flow\.[0-9a-f]{8}\.svg$/);
    expect(out[0].content).toMatch(/!\[Flow\]\(\/_assets\/flow\.[0-9a-f]{8}\.svg\)/);
    expect(out[0].children![0].content).toMatch(/src="\/_assets\/flow\.[0-9a-f]{8}\.svg"/);
    // The SVG is also queued for inlining, keyed by the rewritten src.
    expect(collector.inlineSvgs['/' + collector.files[0].path]).toContain('<svg style=');
    // Input tree is left untouched (a new tree is returned).
    expect(tree[0].content).toContain('../img/flow.svg');
  });

  it('leaves external srcs untouched', async () => {
    const tree = [
      { name: 'g', title: 'G', type: 'markdown' as const, content: '![x](https://e.com/i.png)', children: [] },
    ];
    const collector = createImageCollector();
    const out = await resolveTutorialImages(tree, join(dir, 'tutorials'), collector);
    expect(collector.files).toHaveLength(0);
    expect(out[0].content).toContain('https://e.com/i.png');
  });
});

describe('resolveDocletImages', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cjt-doclet-images-'));
    await mkdir(join(dir, 'src'), { recursive: true });
    await mkdir(join(dir, 'img'), { recursive: true });
    await writeFile(join(dir, 'img', 'diagram.png'), 'PNGBYTES', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** A minimal salty-like collection: `data().get()` returns live references. */
  const salty = (items: unknown[]) => {
    const fn = () => ({ get: () => items });
    return fn as unknown;
  };

  it('rewrites <img> in a doclet description relative to its source file, in place', async () => {
    // JSDoc's markdown plugin has already rendered `![d](../img/diagram.png)` to
    // HTML by publish time; the src is relative to the comment's source file.
    const doclet = {
      longname: 'Foo',
      description: '<p>Hello</p><img src="../img/diagram.png" alt="d">',
      params: [{ name: 'x', description: '<img src="../img/diagram.png" alt="p">' }],
      meta: { path: join(dir, 'src'), filename: 'foo.js' },
    };
    const collector = createImageCollector();
    await resolveDocletImages(salty([doclet]), collector);
    // Copied once (description + param share the image via the cache).
    expect(collector.files).toHaveLength(1);
    expect(collector.files[0].path).toMatch(/^_assets\/diagram\.[0-9a-f]{8}\.png$/);
    // Mutated in place: setu will read these rewritten fields.
    expect(doclet.description).toMatch(/src="\/_assets\/diagram\.[0-9a-f]{8}\.png"/);
    expect(doclet.params[0].description).toMatch(/src="\/_assets\/diagram\.[0-9a-f]{8}\.png"/);
  });

  it('skips meta/comment/examples and doclets without meta.path', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const noMeta = { longname: 'Bar', description: '<img src="../img/diagram.png">' };
    const codeOnly = {
      longname: 'Baz',
      examples: ['<img src="../img/diagram.png">'],
      comment: '/** ![d](../img/diagram.png) */',
      meta: { path: join(dir, 'src'), filename: 'baz.js' },
    };
    const collector = createImageCollector();
    await resolveDocletImages(salty([noMeta, codeOnly]), collector);
    expect(collector.files).toHaveLength(0); // nothing resolvable was scanned
    expect(noMeta.description).toContain('../img/diagram.png'); // untouched (no meta.path)
    expect(codeOnly.examples[0]).toContain('../img/diagram.png'); // examples skipped
    vi.restoreAllMocks();
  });
});

describe('llmsTxt opts (JSDoc bridge surface)', () => {
  it('resolves llmsTxt when siteUrl is present', async () => {
    const { validateThemeOpts } = await import('@clean-jsdoc-theme/utils');
    const { value, diagnostics } = await validateThemeOpts({
      opts: { siteUrl: 'https://x.com/docs', basePath: '/docs', llmsTxt: true },
      knownNonThemeKeys: new Set(['destination']),
    });
    expect(value.siteUrl).toBe('https://x.com/docs');
    expect(value.llmsTxt).toEqual({ full: true, api: true });
    expect(diagnostics.list).toHaveLength(0);
  });

  it('warns visibly (yellow) when llmsTxt is on without siteUrl', async () => {
    const { validateThemeOpts, warningsOnly, formatDiagnostics } = await import(
      '@clean-jsdoc-theme/utils'
    );
    const { value, diagnostics } = await validateThemeOpts({ opts: { llmsTxt: true } });
    expect(value.llmsTxt).toBeUndefined();
    const warnings = warningsOnly(diagnostics);
    expect(warnings.list).toHaveLength(1);
    const colored = formatDiagnostics(warnings, { color: true });
    expect(colored).toContain('[33m');
    expect(colored).toContain('llms.txt will NOT be generated');
  });
});
