import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import {
  createImageCollector,
  resolveTutorialImages,
  normalizeStaticFilesConfig,
  staticFileOutputName,
  staticFileIncluded,
  collectStaticFiles,
} from '../publish';

describe('normalizeStaticFilesConfig', () => {
  it('accepts a string or array include; trims and drops empties', () => {
    expect(normalizeStaticFilesConfig({ include: 'resources/img' })).toEqual({
      include: ['resources/img'],
      exclude: [],
    });
    expect(
      normalizeStaticFilesConfig({ include: ['  a ', '', 'b', 7], exclude: 'b/skip' })
    ).toEqual({ include: ['a', 'b'], exclude: ['b/skip'] });
  });

  it('keeps include/exclude patterns when non-empty strings', () => {
    expect(
      normalizeStaticFilesConfig({
        include: ['img'],
        includePattern: '\\.png$',
        excludePattern: '\\.puml$',
      })
    ).toEqual({
      include: ['img'],
      exclude: [],
      includePattern: '\\.png$',
      excludePattern: '\\.puml$',
    });
  });

  it('returns undefined when there is nothing usable to include', () => {
    expect(normalizeStaticFilesConfig(undefined)).toBeUndefined();
    expect(normalizeStaticFilesConfig({})).toBeUndefined();
    expect(normalizeStaticFilesConfig({ include: [] })).toBeUndefined();
    expect(normalizeStaticFilesConfig({ include: [123] })).toBeUndefined();
    expect(normalizeStaticFilesConfig('img')).toBeUndefined();
    expect(normalizeStaticFilesConfig(['img'])).toBeUndefined();
  });
});

describe('staticFileOutputName', () => {
  it('strips the include-dir prefix (contents land at the output root)', () => {
    expect(staticFileOutputName('/proj/resources/img/x.png', '/proj/resources/img')).toBe('x.png');
    expect(staticFileOutputName('/proj/resources/img/sub/y.png', '/proj/resources/img')).toBe(
      'sub/y.png'
    );
  });

  it('uses the basename for a single-file include', () => {
    expect(staticFileOutputName('/proj/resources/img/x.png', '/proj/resources/img/x.png')).toBe(
      'x.png'
    );
  });

  it('is Windows-separator and case tolerant', () => {
    expect(staticFileOutputName('C:\\proj\\IMG\\a\\b.png', 'C:\\proj\\img')).toBe('a/b.png');
    expect(staticFileOutputName('C:/proj/img/', 'C:/proj/img')).toBe('img'); // trailing slash → basename
  });
});

describe('staticFileIncluded', () => {
  const cfg = (extra: Record<string, unknown> = {}) => ({ include: ['x'], exclude: [], ...extra });

  it('honors includePattern / excludePattern against the POSIX abs path', () => {
    expect(staticFileIncluded('/proj/img/a.png', cfg({ includePattern: '\\.png$' }))).toBe(true);
    expect(staticFileIncluded('/proj/img/a.puml', cfg({ includePattern: '\\.png$' }))).toBe(false);
    expect(staticFileIncluded('/proj/img/a.puml', cfg({ excludePattern: '\\.puml$' }))).toBe(false);
    expect(staticFileIncluded('/proj/img/a.png', cfg({ excludePattern: '\\.puml$' }))).toBe(true);
  });

  it('excludes a file equal to, or nested under, an excluded path', () => {
    const c = cfg({ exclude: ['/proj/img/private'] });
    expect(staticFileIncluded('/proj/img/private', c)).toBe(false);
    expect(staticFileIncluded('/proj/img/private/secret.png', c)).toBe(false);
    expect(staticFileIncluded('/proj/img/public.png', c)).toBe(true);
  });

  it('fails open on a malformed pattern (treats it as no filter)', () => {
    expect(staticFileIncluded('/proj/img/a.png', cfg({ includePattern: '(' }))).toBe(true);
  });
});

describe('collectStaticFiles', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cjt-staticfiles-'));
    await mkdir(join(dir, 'img', 'sub'), { recursive: true });
    await writeFile(join(dir, 'img', 'a.png'), 'A', 'utf8');
    await writeFile(join(dir, 'img', 'diagram.svg'), '<svg/>', 'utf8');
    await writeFile(join(dir, 'img', 'a.puml'), 'PUML', 'utf8');
    await writeFile(join(dir, 'img', 'sub', 'b.png'), 'B', 'utf8');
    await mkdir(join(dir, 'img', '.hidden'), { recursive: true });
    await writeFile(join(dir, 'img', '.hidden', 'h.png'), 'H', 'utf8');
    await writeFile(join(dir, 'single.png'), 'S', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('walks a dir → entries mapped to the output root (prefix stripped), plus the search dir', async () => {
    const { files, searchDirs } = await collectStaticFiles({
      include: [join(dir, 'img')],
      exclude: [],
    });
    // Contents land at the output ROOT; subdirs preserved; dot-dirs skipped; sorted.
    expect(files.map((f) => f.outputPath)).toEqual(['a.png', 'a.puml', 'diagram.svg', 'sub/b.png']);
    expect(files.find((f) => f.outputPath === 'a.png')!.contents.toString()).toBe('A');
    expect(searchDirs).toEqual([join(dir, 'img')]);
    expect(files.every((f) => f.absSource.length > 0)).toBe(true);
  });

  it('a single-file include lands at root; the search dir is its parent', async () => {
    const { files, searchDirs } = await collectStaticFiles({
      include: [join(dir, 'single.png')],
      exclude: [],
    });
    expect(files.map((f) => f.outputPath)).toEqual(['single.png']);
    expect(searchDirs).toEqual([dir]);
  });

  it('honors excludePattern (drop .puml)', async () => {
    const { files } = await collectStaticFiles({
      include: [join(dir, 'img')],
      exclude: [],
      excludePattern: '\\.puml$',
    });
    expect(files.map((f) => f.outputPath)).toEqual(['a.png', 'diagram.svg', 'sub/b.png']);
  });

  it('warns and skips a missing include (never throws)', async () => {
    const warn = vi.fn();
    const { files, searchDirs } = await collectStaticFiles(
      { include: [join(dir, 'does-not-exist')], exclude: [] },
      warn
    );
    expect(files).toEqual([]);
    expect(searchDirs).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('image collector — staticFiles fallback resolution (B2)', () => {
  let dir: string;

  beforeAll(async () => {
    // Mirror dwv: images in `<dir>/img`, referenced from a doc in `<dir>/tutorials`
    // by a BARE name that resolves only via the staticFiles search root.
    dir = await mkdtemp(join(tmpdir(), 'cjt-b2-'));
    await mkdir(join(dir, 'img'), { recursive: true });
    await mkdir(join(dir, 'tutorials'), { recursive: true });
    await writeFile(join(dir, 'img', 'classes-io.png'), 'IO', 'utf8');
    await writeFile(join(dir, 'img', 'flow.svg'), '<svg/>', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('resolves a bare name via a staticFiles dir, hashes it, records consumed', async () => {
    const collector = createImageCollector([join(dir, 'img')]);
    // baseDir = tutorials dir; `classes-io.png` is NOT there, so the fallback
    // search dir (img) is what makes it resolve.
    const href = await collector.resolve('classes-io.png', join(dir, 'tutorials'));
    expect(href).toMatch(/^\/_assets\/classes-io\.[0-9a-f]{8}\.png$/);
    expect(collector.files).toHaveLength(1);
    expect(collector.consumed.has(join(dir, 'img', 'classes-io.png'))).toBe(true);
  });

  it('resolves a /-rooted name via a staticFiles dir too, and queues the SVG for inlining', async () => {
    const collector = createImageCollector([join(dir, 'img')]);
    const href = await collector.resolve('/flow.svg', join(dir, 'tutorials'));
    expect(href).toMatch(/^\/_assets\/flow\.[0-9a-f]{8}\.svg$/);
    expect(collector.inlineSvgs[href!]).toContain('<svg style=');
  });

  it('prefers a co-located file over a same-named staticFile', async () => {
    await writeFile(join(dir, 'tutorials', 'classes-io.png'), 'LOCAL', 'utf8');
    const collector = createImageCollector([join(dir, 'img')]);
    await collector.resolve('classes-io.png', join(dir, 'tutorials'));
    expect(collector.consumed.has(join(dir, 'tutorials', 'classes-io.png'))).toBe(true);
    expect(collector.consumed.has(join(dir, 'img', 'classes-io.png'))).toBe(false);
    await rm(join(dir, 'tutorials', 'classes-io.png'), { force: true });
  });

  it('warns once and returns null when nothing resolves anywhere', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const collector = createImageCollector([join(dir, 'img')]);
    expect(await collector.resolve('missing.png', join(dir, 'tutorials'))).toBeNull();
    expect(await collector.resolve('missing.png', join(dir, 'tutorials'))).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1); // warned-once, keyed by src
    expect(collector.files).toHaveLength(0);
    warn.mockRestore();
  });

  it('with no staticDirs configured, there is no fallback (unchanged behavior)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const collector = createImageCollector(); // no static dirs
    expect(await collector.resolve('classes-io.png', join(dir, 'tutorials'))).toBeNull();
    warn.mockRestore();
  });
});

describe('resolveTutorialImages — staticFiles dwv scenario (bare ref)', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cjt-tut-static-'));
    await mkdir(join(dir, 'img'), { recursive: true });
    await mkdir(join(dir, 'tutorials'), { recursive: true });
    await writeFile(join(dir, 'img', 'classes-io.png'), 'IO', 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('rewrites a bare `![](classes-io.png)` tutorial ref via the staticFiles dir', async () => {
    const tree = [
      {
        name: 'data-load',
        title: 'Data Load',
        type: 'markdown' as const,
        content: '# Load\n\n![classes-io](classes-io.png)\n',
        children: [],
      },
    ];
    const collector = createImageCollector([join(dir, 'img')]);
    const out = await resolveTutorialImages(tree, join(dir, 'tutorials'), collector);
    expect(out[0].content).toMatch(/!\[classes-io\]\(\/_assets\/classes-io\.[0-9a-f]{8}\.png\)/);
    expect(collector.consumed.has(join(dir, 'img', 'classes-io.png'))).toBe(true);
  });
});
