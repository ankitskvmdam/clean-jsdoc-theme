import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { render, runPagefindAgainstDir } from '../index';
import { makeManifest, minimalTheme } from './fixtures';

async function pagefindAvailable(): Promise<boolean> {
  try {
    const specifier = 'pagefind';
    await import(specifier);
    return true;
  } catch {
    return false;
  }
}

const HAS_PAGEFIND = await pagefindAvailable();

describe.skipIf(!HAS_PAGEFIND)('runPagefindAgainstDir', () => {
  it('writes pagefind/pagefind.js into the destination', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dwar-pagefind-'));
    const result = await render(makeManifest(), { theme: minimalTheme });
    for (const file of result.files) {
      const out = resolve(dir, file.path);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(
        out,
        typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents),
      );
    }
    await runPagefindAgainstDir(dir);
    await expect(access(resolve(dir, 'pagefind', 'pagefind.js'))).resolves.toBeUndefined();
  });
});

describe('runPagefindAgainstDir — error path', () => {
  it('rejects when the destination does not exist', async () => {
    const fake = join(tmpdir(), `__nope_${Date.now()}__`);
    await expect(runPagefindAgainstDir(fake)).rejects.toThrow(/does not exist/);
  });
});
