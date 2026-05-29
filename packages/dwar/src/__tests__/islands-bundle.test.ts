import { tmpdir } from 'node:os';
import { describe, it, expect } from 'vitest';
import { bundleIslands } from '../islands-bundle';

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
