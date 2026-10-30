import { describe, it, expect } from 'vitest';
import { tmpdir } from 'node:os';
import { createSpawnRunner } from '../extract-manifest';

describe('createSpawnRunner', () => {
  it("passes the child's stderr through as it arrives and still captures it", async () => {
    const passedThrough: string[] = [];
    const run = createSpawnRunner((chunk) => passedThrough.push(chunk));
    // `node` isn't in the temp dir's node_modules/.bin, so it resolves on PATH.
    const result = await run({
      command: 'node',
      args: ['-e', "console.error('strict failure details'); process.exit(3)"],
      cwd: tmpdir(),
      env: process.env,
    });
    expect(result.code).toBe(3);
    expect(result.streamed).toBe(true);
    expect(result.stderr).toContain('strict failure details');
    expect(passedThrough.join('')).toBe(result.stderr);
  });
});
