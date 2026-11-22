import { tmpdir } from 'node:os';
import { realpathSync } from 'node:fs';
import { cp, mkdir, mkdtemp, rm, readdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
  bundleIslands,
  type BundleIslandsOptions,
  type BundleIslandsResult,
} from '../islands-bundle';
import type { IslandCacheEntry } from '../islands-cache';
import { getIslandChunkEntrySource } from '../islands-loader';

describe('bundleIslands() — resolveDir default', () => {
  it('bundles successfully even when cwd is unrelated to dwar', async () => {
    // Anchoring resolveDir at dwar's package dir means esbuild finds
    // preact / @clean-jsdoc-theme/rang regardless of where the caller
    // happened to be running from.
    const prevCwd = process.cwd();
    try {
      process.chdir(tmpdir());
      const result = await bundleIslands({ islands: ['sidebar'] });
      expect(result.entryPaths.sidebar).toMatch(/^_islands\/sidebar-[A-Za-z0-9]+\.js$/);
      expect(result.files.length).toBeGreaterThan(0);
      const totalBytes = result.files.reduce((sum, f) => sum + f.byteSize, 0);
      expect(totalBytes).toBeGreaterThan(0);
    } finally {
      process.chdir(prevCwd);
    }
  });
});

describe('getIslandChunkEntrySource() — copy-btn', () => {
  // copy-btn is embedded in MDX content with no data-island-id / payload entry;
  // its chunk must derive the text to copy from the sibling <pre> in the DOM.
  // (Regression: the button used to render but never hydrate, so clicks did
  // nothing.)
  it('derives the text from the sibling <pre>, not a per-island payload entry', () => {
    const src = getIslandChunkEntrySource('copy-btn');
    // The marker now lives in the code-block header, so the lookup resolves the
    // <pre> via the enclosing card (data-code-card), falling back to the parent
    // for the borderless CodeTabs layout.
    expect(src).toContain('data-code-card');
    expect(src).toContain("querySelector('pre')");
    expect(src).toContain('hydrate(');
    // No per-island props lookup (copy-btn has no data-island-id entry); it may
    // still read the payload for the shared `__i18n` locale seed.
    expect(src).not.toContain('data-island-id');
    expect(src).toContain('__i18n');
  });

  it('layout islands still read from the props payload', () => {
    const src = getIslandChunkEntrySource('sidebar');
    expect(src).toContain('data-island-props');
    expect(src).toContain('data-island-id');
  });
});

describe('getIslandChunkEntrySource() — embed', () => {
  // embed is an in-content island like copy-btn: no data-island-id / payload
  // entry. Its config lives in the marker's data-* attributes, which the chunk
  // reads back into EmbedProps and hydrates the body onto the marker itself.
  it('reads config from the marker data-* (not a per-island payload entry)', () => {
    const src = getIslandChunkEntrySource('embed');
    expect(src).toContain('querySelectorAll(\'[data-island="embed"]\')');
    expect(src).toContain('getAttribute');
    expect(src).toContain("'data-src'");
    expect(src).toContain('hydrate(');
    // Config comes from data-* (no per-island payload lookup); the payload is
    // only consulted for the shared `__i18n` locale seed.
    expect(src).not.toContain('data-island-id');
    expect(src).toContain('__i18n');
  });

  it('bundles into a non-empty embed chunk', async () => {
    // With one island requested there may be no separate shared chunk — that's
    // fine; just assert the (hashed) entry chunk exists and is non-empty.
    const result = await bundleIslands({ islands: ['embed'] });
    expect(result.entryPaths.embed).toMatch(/^_islands\/embed-[A-Za-z0-9]+\.js$/);
    const entry = result.files.find((f) => f.path === result.entryPaths.embed);
    expect(entry, 'missing embed entry chunk').toBeDefined();
    expect(entry!.byteSize).toBeGreaterThan(0);
  });
});

describe('getIslandChunkEntrySource() — playground', () => {
  // playground is an in-content island like embed: provider list on the marker's
  // data-providers, code from the card's <pre>, site-wide options from a
  // data-playground-config page payload — no per-island data-island-id entry.
  it('reads providers/code/options from the DOM (not a per-island payload entry)', () => {
    const src = getIslandChunkEntrySource('playground');
    expect(src).toContain('querySelectorAll(\'[data-island="playground"]\')');
    expect(src).toContain('data-providers');
    expect(src).toContain('data-code-card');
    expect(src).toContain('data-playground-config');
    expect(src).toContain('hydrate(');
    expect(src).not.toContain('data-island-id');
    expect(src).toContain('__i18n');
  });

  it('bundles into a non-empty playground chunk', async () => {
    const result = await bundleIslands({ islands: ['playground'] });
    expect(result.entryPaths.playground).toMatch(/^_islands\/playground-[A-Za-z0-9]+\.js$/);
    const entry = result.files.find((f) => f.path === result.entryPaths.playground);
    expect(entry, 'missing playground entry chunk').toBeDefined();
    expect(entry!.byteSize).toBeGreaterThan(0);
  });
});

describe('bundleIslands() — cache', () => {
  let cacheDir: string | undefined;

  afterEach(async () => {
    if (cacheDir) {
      await rm(cacheDir, { recursive: true, force: true });
      cacheDir = undefined;
    }
  });

  it('writes a keyed cache file on first build and reuses it on the second', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'island-cache-'));

    // Cold: builds and populates the cache.
    const first = await bundleIslands({ islands: ['sidebar'], cacheDir });
    const entries = await readdir(cacheDir);
    const cacheFile = entries.find((f) => /^islands-v3-.+\.json$/.test(f));
    expect(cacheFile, 'expected an islands-*.json cache file').toBeDefined();

    // Warm: same inputs → cache HIT, returns an equivalent result.
    const second = await bundleIslands({ islands: ['sidebar'], cacheDir });
    expect(second.entryPaths.sidebar).toBe(first.entryPaths.sidebar);
    expect(second.files.map((f) => f.path).sort()).toEqual(first.files.map((f) => f.path).sort());
  });

  it('writes nothing when no cacheDir is supplied (stays pure)', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'island-nocache-'));
    const result = await bundleIslands({ islands: ['sidebar'] });
    expect(result.entryPaths.sidebar).toMatch(/^_islands\/sidebar-[A-Za-z0-9]+\.js$/);
    // The unrelated tmpdir must remain empty — no cache was requested.
    expect(await readdir(cacheDir)).toEqual([]);
  });
});

// #376: the cache must be invalidated by ANY bundled input, not just rang's
// output and the preact version. These run against a tiny stub module graph
// (preact + rang + utils under a temp node_modules) so each edit is cheap.
describe('bundleIslands() — cache validation (#376)', () => {
  let tmp: string;
  let fx: string;
  let cacheDir: string;

  const UTILS_DIST = () =>
    join(fx, 'node_modules', '@clean-jsdoc-theme', 'utils', 'dist', 'index.js');
  const PREACT_PKG = () => join(fx, 'node_modules', 'preact', 'package.json');
  const SENTINEL = 'FROM_CACHE_SENTINEL';

  async function put(rel: string, contents: string): Promise<void> {
    const file = join(fx, rel);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, contents);
  }

  async function makeFixture(): Promise<void> {
    tmp = await mkdtemp(join(tmpdir(), 'island-376-'));
    fx = join(tmp, 'fx');
    cacheDir = join(tmp, 'cache');
    await put(
      'node_modules/preact/package.json',
      '{"name":"preact","version":"1.0.0","type":"module","main":"index.js"}'
    );
    await put('node_modules/preact/index.js', 'export const hydrate=()=>{};export const h=()=>{};');
    await put(
      'node_modules/@clean-jsdoc-theme/rang/package.json',
      '{"name":"@clean-jsdoc-theme/rang","version":"0.0.0","type":"module","exports":{".":{"import":"./dist/index.js"}}}'
    );
    await put(
      'node_modules/@clean-jsdoc-theme/rang/dist/index.js',
      'import {MARK} from "@clean-jsdoc-theme/utils";export const ISLAND_REGISTRY={sidebar:()=>MARK};export const LanguageProvider=()=>{};export const createI18n=()=>{};'
    );
    await put(
      'node_modules/@clean-jsdoc-theme/utils/package.json',
      '{"name":"@clean-jsdoc-theme/utils","version":"0.0.0","type":"module","exports":{".":{"import":"./dist/index.js"}}}'
    );
    await put(
      'node_modules/@clean-jsdoc-theme/utils/dist/index.js',
      'export const MARK="UTILS_ONE";'
    );
  }

  const has = (r: BundleIslandsResult, s: string) => r.files.some((f) => f.contents.includes(s));
  const run = (extra: Partial<BundleIslandsOptions> = {}) =>
    bundleIslands({ islands: ['sidebar'], resolveDir: fx, cacheDir, ...extra });

  async function cacheFiles(): Promise<string[]> {
    return (await readdir(cacheDir)).filter((f) => /^islands-v3-.+\.json$/.test(f));
  }

  async function onlyCacheFile(): Promise<string> {
    const files = await cacheFiles();
    expect(files).toHaveLength(1);
    return join(cacheDir, files[0]!);
  }

  async function readEntry(file: string): Promise<IslandCacheEntry> {
    return JSON.parse(await readFile(file, 'utf8')) as IslandCacheEntry;
  }

  /** Mark the cached payload so a hit is distinguishable from a rebuild. */
  async function plantSentinel(file: string, mutate?: (e: IslandCacheEntry) => unknown) {
    const entry = await readEntry(file);
    entry.result.files[0]!.contents += SENTINEL;
    const next = mutate ? mutate(entry) : entry;
    await writeFile(file, JSON.stringify(next));
  }

  beforeEach(async () => {
    await makeFixture();
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('rebuilds when a bundled @clean-jsdoc-theme/utils file changes', async () => {
    const cold = await run();
    expect(has(cold, 'UTILS_ONE')).toBe(true);

    await writeFile(UTILS_DIST(), 'export const MARK="UTILS_TWO";');
    const next = await run();
    expect(has(next, 'UTILS_TWO')).toBe(true);
    expect(has(next, 'UTILS_ONE')).toBe(false);
    expect(await cacheFiles()).toHaveLength(1);
  });

  it('reuses the cache while every input is unchanged', async () => {
    await run();
    await plantSentinel(await onlyCacheFile());
    expect(has(await run(), SENTINEL)).toBe(true);
  });

  it('rebuilds when a third-party package.json changes (version bump)', async () => {
    await run();
    await plantSentinel(await onlyCacheFile());
    await writeFile(
      PREACT_PKG(),
      '{"name":"preact","version":"1.0.1","type":"module","main":"index.js"}'
    );
    expect(has(await run(), SENTINEL)).toBe(false);
  });

  it('fingerprints a third-party package by its package.json, not its files', async () => {
    await run();
    const paths = (await readEntry(await onlyCacheFile())).inputs.map((i) => i.path);
    expect(paths).toContain(PREACT_PKG());
    expect(paths).not.toContain(join(fx, 'node_modules', 'preact', 'index.js'));
    expect(paths).toContain(UTILS_DIST());
  });

  it('misses when a recorded input no longer exists, and rewrites the entry', async () => {
    await run();
    const file = await onlyCacheFile();
    const gone = join(tmp, 'gone.js');
    await plantSentinel(file, (e) => {
      e.inputs.push({ path: gone, hash: 'x' });
      return e;
    });
    expect(has(await run(), SENTINEL)).toBe(false);
    const rewritten = await readEntry(file);
    expect(rewritten.inputs.map((i) => i.path)).not.toContain(gone);
  });

  it('ignores entries in an older format and leaves legacy files alone', async () => {
    await run();
    const file = await onlyCacheFile();
    const legacyName = join(cacheDir, 'islands-0123456789abcdef.json');
    const fresh = await readEntry(file);
    const legacy = JSON.stringify({
      ...fresh.result,
      files: [{ ...fresh.result.files[0], contents: SENTINEL }],
    });
    await writeFile(legacyName, legacy);

    // Legacy bare `{ files, entryPaths }` shape inside the current file.
    await writeFile(file, legacy);
    expect(has(await run(), SENTINEL)).toBe(false);

    // Same manifest shape, but an older format number.
    for (const format of [1, 2]) {
      await plantSentinel(file, (e) => ({ ...e, format }));
      expect(has(await run(), SENTINEL)).toBe(false);
    }

    expect(await readFile(legacyName, 'utf8')).toBe(legacy);
  });

  it('rebuilds without throwing when the cache file is corrupt', async () => {
    await run();
    const file = await onlyCacheFile();
    await writeFile(file, '{ not json');
    const result = await run();
    expect(has(result, 'UTILS_ONE')).toBe(true);
    expect((await readEntry(file)).format).toBe(3);
  });

  it('keys on outDir and resolveDir', async () => {
    await run();
    const other = await run({ outDir: 'other' });
    expect(other.entryPaths.sidebar).toMatch(/^other\/sidebar-[A-Za-z0-9]+\.js$/);
    expect(other.files.every((f) => f.path.startsWith('other/'))).toBe(true);
    expect(await cacheFiles()).toHaveLength(2);

    // A second module graph at another resolveDir must not reuse the first's.
    const fx2 = join(tmp, 'fx2');
    await cp(fx, fx2, { recursive: true });
    await writeFile(
      join(fx2, 'node_modules', '@clean-jsdoc-theme', 'utils', 'dist', 'index.js'),
      'export const MARK="UTILS_FX2";'
    );
    expect(has(await run({ resolveDir: fx2 }), 'UTILS_FX2')).toBe(true);
    expect(await cacheFiles()).toHaveLength(3);
  });

  it('leaves no temp files behind after a build', async () => {
    await run();
    expect((await readdir(cacheDir)).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('misses when a cached result has the wrong shape', async () => {
    await run();
    const file = await onlyCacheFile();
    const bad: Array<(e: IslandCacheEntry) => void> = [
      (e) => ((e.result.files[0] as unknown as { contents: number }).contents = 1),
      (e) => ((e.result.files[0] as unknown as { path: null }).path = null),
      (e) => ((e.result.entryPaths as unknown as Record<string, number>).sidebar = 7),
      (e) => ((e as unknown as { edges: unknown }).edges = 'nope'),
    ];
    for (const mutate of bad) {
      await plantSentinel(file, (e) => {
        mutate(e);
        return e;
      });
      const result = await run();
      expect(has(result, SENTINEL)).toBe(false);
      expect(has(result, 'UTILS_ONE')).toBe(true);
    }
  });

  it('records where each package import resolved', async () => {
    await run();
    const { edges } = await readEntry(await onlyCacheFile());
    const byName = new Map(edges.map((e) => [e.name, e]));
    expect(byName.get('preact')?.from).toBe(fx);
    expect(byName.get('@clean-jsdoc-theme/rang')?.dir).toBe(
      realpathSync.native(join(fx, 'node_modules', '@clean-jsdoc-theme', 'rang'))
    );
    expect(byName.get('@clean-jsdoc-theme/utils')?.from).toBe(
      join(fx, 'node_modules', '@clean-jsdoc-theme', 'rang')
    );
  });
});

// Re-resolution: the files the cached bundle was built from are untouched, but
// a package import now lands somewhere else. The manifest hashes alone would
// still match, so the recorded resolution edges are what must miss.
describe('bundleIslands() — cache re-resolution (#376)', () => {
  let tmp: string;
  let fx: string;
  let cacheDir: string;
  const SENTINEL = 'FROM_CACHE_SENTINEL';

  async function put(rel: string, contents: string): Promise<void> {
    const file = join(fx, rel);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, contents);
  }

  /** A pnpm-style store copy of preact whose hydrate() returns a marker. */
  async function preactStore(version: string): Promise<string> {
    const rel = `node_modules/.pnpm/preact@${version}/node_modules/preact`;
    await put(
      `${rel}/package.json`,
      `{"name":"preact","version":"${version}","type":"module","main":"index.js"}`
    );
    await put(
      `${rel}/index.js`,
      `export const hydrate=()=>"PREACT_${version}";export const h=()=>{};`
    );
    return join(fx, rel);
  }

  /** Point `node_modules/<name>` at `target` (a junction on Windows). */
  async function link(name: string, target: string): Promise<void> {
    const path = join(fx, 'node_modules', name);
    await rm(path, { recursive: true, force: true });
    await mkdir(dirname(path), { recursive: true });
    await symlink(target, path, 'junction');
  }

  const has = (r: BundleIslandsResult, s: string) => r.files.some((f) => f.contents.includes(s));
  const run = () => bundleIslands({ islands: ['sidebar'], resolveDir: fx, cacheDir });

  async function plantSentinel(): Promise<void> {
    const [name] = (await readdir(cacheDir)).filter((f) => /^islands-v3-.+\.json$/.test(f));
    const file = join(cacheDir, name!);
    const entry = JSON.parse(await readFile(file, 'utf8')) as IslandCacheEntry;
    entry.result.files[0]!.contents += SENTINEL;
    await writeFile(file, JSON.stringify(entry));
  }

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'island-376-res-'));
    fx = join(tmp, 'fx');
    cacheDir = join(tmp, 'cache');
    await put(
      'node_modules/@clean-jsdoc-theme/rang/package.json',
      '{"name":"@clean-jsdoc-theme/rang","version":"0.0.0","type":"module","exports":{".":{"import":"./dist/index.js"}}}'
    );
    await put(
      'node_modules/@clean-jsdoc-theme/rang/dist/index.js',
      'import {MARK} from "@clean-jsdoc-theme/utils";export const ISLAND_REGISTRY={sidebar:()=>MARK};export const LanguageProvider=()=>{};export const createI18n=()=>{};'
    );
    await put(
      'node_modules/@clean-jsdoc-theme/utils/package.json',
      '{"name":"@clean-jsdoc-theme/utils","version":"0.0.0","type":"module","exports":{".":{"import":"./dist/index.js"}}}'
    );
    await put(
      'node_modules/@clean-jsdoc-theme/utils/dist/index.js',
      'export const MARK="UTILS_ONE";'
    );
    await link('preact', await preactStore('1.0.0'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('still hits while nothing re-resolves', async () => {
    expect(has(await run(), 'PREACT_1.0.0')).toBe(true);
    await plantSentinel();
    expect(has(await run(), SENTINEL)).toBe(true);
  });

  it('misses when a package link is repointed to a new copy (pnpm bump)', async () => {
    expect(has(await run(), 'PREACT_1.0.0')).toBe(true);
    await plantSentinel();

    // pnpm adds the new store dir and repoints the link; the old dir stays.
    await link('preact', await preactStore('1.0.1'));
    const oldPkg = join(fx, 'node_modules/.pnpm/preact@1.0.0/node_modules/preact/package.json');
    expect(await readFile(oldPkg, 'utf8')).toContain('1.0.0');

    const next = await run();
    expect(has(next, SENTINEL)).toBe(false);
    expect(has(next, 'PREACT_1.0.1')).toBe(true);
    expect(has(next, 'PREACT_1.0.0')).toBe(false);
  });

  it('misses when a nested copy starts shadowing the hoisted package', async () => {
    expect(has(await run(), 'UTILS_ONE')).toBe(true);
    await plantSentinel();

    const nested = 'node_modules/@clean-jsdoc-theme/rang/node_modules/@clean-jsdoc-theme/utils';
    await put(
      `${nested}/package.json`,
      '{"name":"@clean-jsdoc-theme/utils","version":"0.0.1","type":"module","exports":{".":{"import":"./dist/index.js"}}}'
    );
    await put(`${nested}/dist/index.js`, 'export const MARK="UTILS_NESTED";');

    const next = await run();
    expect(has(next, SENTINEL)).toBe(false);
    expect(has(next, 'UTILS_NESTED')).toBe(true);
  });
});

describe('bundleIslands() — cache manifest of the real module graph', () => {
  let cacheDir: string | undefined;

  afterEach(async () => {
    if (cacheDir) await rm(cacheDir, { recursive: true, force: true });
  });

  it('records the first-party dists and third-party package.json files', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'island-graph-'));
    await bundleIslands({ islands: ['copy-btn'], cacheDir });
    const [name] = (await readdir(cacheDir)).filter((f) => /^islands-v3-.+\.json$/.test(f));
    const entry = JSON.parse(await readFile(join(cacheDir, name!), 'utf8')) as IslandCacheEntry;
    const paths = entry.inputs.map((i) => i.path);
    for (const re of [
      /utils[\\/]dist[\\/]index\.js$/,
      /rang[\\/]dist[\\/]/,
      /bhasha[\\/]dist[\\/]/,
      /lucide-preact[\\/]package\.json$/,
    ]) {
      expect(
        paths.some((p) => re.test(p)),
        `no manifest input matches ${re}`
      ).toBe(true);
    }
    expect(paths.length).toBeLessThan(50);
  });
});
