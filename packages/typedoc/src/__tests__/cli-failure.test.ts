import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// #371: when esbuild cannot run, a real `typedoc` run must fail (non-zero
// exit), write no site, and say which step failed. It has to be a child
// process: esbuild reads ESBUILD_BINARY_PATH when it loads, and a dead esbuild
// service stays dead for the rest of the process.

// The built plugin entry, as `"plugin": ["@clean-jsdoc-theme/typedoc"]` loads it.
// Turbo runs `test` after `build`, so `dist/` exists.
const PLUGIN = pathToFileURL(fileURLToPath(new URL('../../dist/index.js', import.meta.url))).href;
const TYPEDOC_BIN = join(
  dirname(createRequire(import.meta.url).resolve('typedoc/package.json')),
  'bin',
  'typedoc'
);

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split('\\').join('/');

let tmp: string | undefined;

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true, maxRetries: 3 });
});

describe('TypeDoc CLI end to end: a renderer failure fails the run (#371)', () => {
  it('exits non-zero, names the island bundle step, and writes no site when esbuild cannot run', async () => {
    // A fresh cwd: the island cache lives under <cwd>/node_modules/.cache, and
    // a warm cache would skip esbuild entirely.
    tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-esbuild-fail-'));
    await mkdir(join(tmp, 'src'));
    await writeFile(
      join(tmp, 'src', 'index.ts'),
      '/** Adds. */\nexport const add = (): number => 1;\n'
    );
    await writeFile(
      join(tmp, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          skipLibCheck: true,
        },
        include: ['src/index.ts'],
      }),
      'utf8'
    );
    await writeFile(
      join(tmp, 'typedoc.json'),
      JSON.stringify({
        entryPoints: [posix(join(tmp, 'src', 'index.ts'))],
        tsconfig: posix(join(tmp, 'tsconfig.json')),
        plugin: [PLUGIN],
        outputs: [{ name: 'clean-jsdoc-theme', path: 'dist' }],
        skipErrorChecking: true,
      }),
      'utf8'
    );
    // esbuild ignores an ESBUILD_BINARY_PATH that doesn't exist (it warns and
    // uses its real binary), so point it at a file that exists but can't be run.
    const fakeBinary = join(tmp, 'not-esbuild.txt');
    await writeFile(fakeBinary, 'this is not an executable\n');

    const r = spawnSync(process.execPath, [TYPEDOC_BIN], {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', ESBUILD_BINARY_PATH: fakeBinary },
      // spawnSync blocks the worker, so vitest's own timeout can't fire: bound it here.
      timeout: 90_000,
      killSignal: 'SIGKILL',
    });
    if (r.error) {
      throw new Error(`typedoc did not finish: ${r.error.message}\n${r.stdout}\n${r.stderr}`);
    }
    const output = `${r.stdout}\n${r.stderr}`;

    expect(r.status, output).not.toBe(0);
    expect(r.status, output).not.toBeNull();
    expect(output).toContain('could not bundle the interactive components');
    expect(output).toContain('could not be generated');
    expect(existsSync(join(tmp, 'dist', 'index.html'))).toBe(false);
  }, 300_000);
});
