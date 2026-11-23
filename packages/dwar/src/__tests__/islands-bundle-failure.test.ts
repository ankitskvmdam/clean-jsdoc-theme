import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A failed esbuild run must reject bundleIslands with an error that names the
// step (#371). esbuild is mocked here, in its own file, so the real-bundle
// tests in islands-bundle.test.ts keep the real build.
const buildMock = vi.hoisted(() => vi.fn());
vi.mock('esbuild', async (importOriginal) => ({
  ...(await importOriginal<typeof import('esbuild')>()),
  build: buildMock,
}));

const { bundleIslands } = await import('../islands-bundle');

const STEP = 'could not bundle the interactive components';
const HINT = 'reinstall';

beforeEach(() => {
  buildMock.mockReset();
});

describe('bundleIslands: esbuild failures (#371)', () => {
  it('names the step, keeps the original message and cause, and hints at a reinstall when esbuild cannot run', async () => {
    const original = new Error('The service was stopped: spawn X ENOENT');
    buildMock.mockRejectedValue(original);
    const err = await bundleIslands({ islands: ['sidebar'] }).then(
      () => undefined,
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(Error);
    const message = (err as Error).message;
    expect(message).toContain(STEP);
    expect(message).toContain('The service was stopped: spawn X ENOENT');
    expect(message).toContain(HINT);
    expect((err as Error).cause).toBe(original);
  });

  it('turns a synchronous throw from esbuild into a rejection', async () => {
    buildMock.mockImplementation(() => {
      throw new Error('The package "@esbuild/win32-x64" could not be found');
    });
    const pending = bundleIslands({ islands: ['sidebar'] });
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).rejects.toThrow(STEP);
  });

  it('wraps a build failure (esbuild ran) without the reinstall hint', async () => {
    const failure = Object.assign(new Error('Build failed with 1 error'), {
      errors: [{ text: 'Could not resolve "preact"' }],
      warnings: [],
    });
    buildMock.mockRejectedValue(failure);
    const err = (await bundleIslands({ islands: ['sidebar'] }).catch((e: unknown) => e)) as Error;
    expect(err.message).toContain(STEP);
    expect(err.message).toContain('Build failed with 1 error');
    expect(err.message).not.toContain(HINT);
    expect(err.cause).toBe(failure);
  });

  describe('with a cache dir', () => {
    let cacheDir: string;
    beforeEach(async () => {
      cacheDir = await mkdtemp(join(tmpdir(), 'cjt-islands-fail-'));
    });
    afterEach(async () => {
      await rm(cacheDir, { recursive: true, force: true });
    });

    it('rejects and writes nothing to the cache', async () => {
      buildMock.mockRejectedValue(new Error('spawn UNKNOWN'));
      await expect(bundleIslands({ islands: ['sidebar'], cacheDir })).rejects.toThrow(STEP);
      expect(await readdir(cacheDir)).toEqual([]);
    });
  });
});
