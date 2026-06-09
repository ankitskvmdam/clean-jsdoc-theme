import { tmpdir } from 'node:os';
import { describe, it, expect } from 'vitest';
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
      const chunks = await bundleIslands({ islands: ['sidebar'] });
      expect(chunks).toHaveLength(1);
      expect(chunks[0].name).toBe('sidebar');
      expect(chunks[0].byteSize).toBeGreaterThan(0);
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
    expect(src).toContain("querySelectorAll('[data-island=\"embed\"]')");
    expect(src).toContain("getAttribute");
    expect(src).toContain("'data-src'");
    expect(src).toContain('hydrate(');
    expect(src).not.toContain('data-island-props');
  });

  it('bundles into a non-empty embed chunk', async () => {
    const chunks = await bundleIslands({ islands: ['embed'] });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].name).toBe('embed');
    expect(chunks[0].path).toBe('_islands/embed.js');
    expect(chunks[0].byteSize).toBeGreaterThan(0);
  });
});
