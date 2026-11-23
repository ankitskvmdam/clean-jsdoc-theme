import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// #371: when esbuild cannot run, a real JSDoc 4 run must fail (exit 1), write
// no site, and say which step failed. Kept out of jsdoc-cli.test.ts so the
// esbuild override can't leak into the other spawns.

// The package root (this file is src/__tests__/*.test.ts). Turbo runs `test`
// after `build`, so `dist/` exists here as it would in the tarball.
const pkgRoot = fileURLToPath(new URL('../../', import.meta.url));
const JSDOC = createRequire(import.meta.url).resolve('jsdoc/jsdoc.js');
const TEMPLATE_ROOT = pkgRoot.split('\\').join('/').replace(/\/$/, '');

/** Per-test budget for a JSDoc spawn: generous, as CI runs loaded tests many times slower. */
const SPAWN_TEST_TIMEOUT = 300_000;

const dirs: string[] = [];

afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true, maxRetries: 3 })));
});

describe('JSDoc CLI end to end: a renderer failure fails the run (#371)', () => {
  it(
    'exits 1, names the island bundle step, and writes no site when esbuild cannot run',
    async () => {
      // A fresh cwd: the island cache lives under <cwd>/node_modules/.cache, and
      // a warm cache would skip esbuild entirely.
      const dir = await mkdtemp(join(tmpdir(), 'cjt-esbuild-fail-'));
      dirs.push(dir);
      await mkdir(join(dir, 'src'));
      await writeFile(join(dir, 'src', 'main.js'), '/** Adds. */\nexport const add = () => 1;\n');
      // esbuild ignores an ESBUILD_BINARY_PATH that doesn't exist (it warns
      // and uses its real binary), so point it at a file that exists but
      // can't be run.
      const fakeBinary = join(dir, 'not-esbuild.txt');
      await writeFile(join(dir, 'not-esbuild.txt'), 'this is not an executable\n');
      await writeFile(
        join(dir, 'jsdoc.json'),
        JSON.stringify({
          source: { include: ['src'] },
          plugins: ['plugins/markdown'],
          opts: { destination: 'out', recurse: true, template: TEMPLATE_ROOT },
        }),
        'utf8'
      );

      const r = spawnSync(process.execPath, [JSDOC, '-c', 'jsdoc.json'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          NO_COLOR: '1',
          CLEAN_JSDOC_THEME_BUILD: '',
          ESBUILD_BINARY_PATH: fakeBinary,
        },
        // spawnSync blocks the worker, so vitest's own timeout can't fire: bound it here.
        timeout: 90_000,
        killSignal: 'SIGKILL',
      });
      if (r.error) {
        throw new Error(`JSDoc did not finish: ${r.error.message}\n${r.stdout}\n${r.stderr}`);
      }
      const output = `${r.stdout}\n${r.stderr}`;

      expect(r.status, output).toBe(1);
      expect(output).toContain('could not bundle the interactive components');
      expect(output).not.toContain('Unhandled rejection');
      expect(existsSync(join(dir, 'out', 'global', 'index.html'))).toBe(false);
      expect(existsSync(join(dir, 'out', 'index.html'))).toBe(false);
    },
    SPAWN_TEST_TIMEOUT
  );
});
