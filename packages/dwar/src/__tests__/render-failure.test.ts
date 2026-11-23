import { describe, expect, it, vi } from 'vitest';
import { makeManifest, minimalTheme } from './fixtures';

// A failed island bundle must reject render() itself (#371): the bridges rely
// on that rejection to fail the build, so it must not turn into a per-page
// error or a resolved result.
const bundleError = new Error(
  'clean-jsdoc-theme: could not bundle the interactive components (islands) with esbuild: spawn UNKNOWN'
);
vi.mock('../islands-bundle', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../islands-bundle')>()),
  bundleIslands: vi.fn(() => Promise.reject(bundleError)),
}));

const { render } = await import('../index');

describe('render(): island bundle failure (#371)', () => {
  it('rejects with the bundle error', async () => {
    await expect(render(makeManifest(), { theme: minimalTheme })).rejects.toBe(bundleError);
  });
});
