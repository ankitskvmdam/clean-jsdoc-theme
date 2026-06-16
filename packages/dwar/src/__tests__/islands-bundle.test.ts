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
    const cacheFile = entries.find((f) => /^islands-.+\.json$/.test(f));
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
