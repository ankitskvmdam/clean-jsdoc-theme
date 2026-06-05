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
