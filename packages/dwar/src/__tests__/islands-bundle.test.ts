import { tmpdir } from 'node:os';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { bundleIslands } from '../islands-bundle';
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
  it('derives the text from the sibling <pre>, not the props payload', () => {
    const src = getIslandChunkEntrySource('copy-btn');
    expect(src).toContain("querySelector('pre')");
    expect(src).toContain('hydrate(');
    expect(src).not.toContain('data-island-props');
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
  it('reads config from the marker data-* (not the props payload)', () => {
    const src = getIslandChunkEntrySource('embed');
    expect(src).toContain('querySelectorAll(\'[data-island="embed"]\')');
    expect(src).toContain('getAttribute');
    expect(src).toContain("'data-src'");
    expect(src).toContain('hydrate(');
    expect(src).not.toContain('data-island-props');
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
    const cacheFile = entries.find((f) => /^islands-.+\.json$/.test(f));
    expect(cacheFile, 'expected an islands-*.json cache file').toBeDefined();

    // Warm: same inputs → cache HIT, returns an equivalent result.
    const second = await bundleIslands({ islands: ['sidebar'], cacheDir });
    expect(second.entryPaths.sidebar).toBe(first.entryPaths.sidebar);
    expect(second.files.map((f) => f.path).sort()).toEqual(
      first.files.map((f) => f.path).sort()
    );
  });

  it('writes nothing when no cacheDir is supplied (stays pure)', async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'island-nocache-'));
    const result = await bundleIslands({ islands: ['sidebar'] });
    expect(result.entryPaths.sidebar).toMatch(/^_islands\/sidebar-[A-Za-z0-9]+\.js$/);
    // The unrelated tmpdir must remain empty — no cache was requested.
    expect(await readdir(cacheDir)).toEqual([]);
  });
});
