import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// #401: a build where no page can be rendered (a systemic failure, e.g. a
// duplicate Preact under Yarn PnP) must exit non-zero and leave the output
// directory untouched. A real JSDoc 4 run; a JSDoc plugin simulates the systemic
// failure by making every Preact vnode creation throw, so dwar fails each page
// on its own and render() still resolves.

// The package root (this file is src/__tests__/*.test.ts). Turbo runs `test`
// after `build`, so `dist/` exists here as it would in the tarball.
const pkgRoot = fileURLToPath(new URL('../../', import.meta.url));
const JSDOC = createRequire(import.meta.url).resolve('jsdoc/jsdoc.js');
const posix = (p: string): string => p.split('\\').join('/');
const TEMPLATE_ROOT = posix(pkgRoot).replace(/\/$/, '');

/** The ESM build of the Preact the theme renders with (one instance per process). */
const PREACT_URL = pathToFileURL(
  realpathSync(
    createRequire(join(pkgRoot, 'package.json'))
      .resolve('preact')
      .replace(/preact\.js$/, 'preact.mjs')
  )
).href;

const SIMULATED = 'simulated systemic render failure';

const BREAK_PLUGIN = [
  '// plugins/break-render.js — simulate a systemic render failure (#401)',
  'exports.handlers = {};',
  `import(${JSON.stringify(PREACT_URL)}).then((p) => {`,
  `  p.options.vnode = () => { throw new Error(${JSON.stringify(SIMULATED)}); };`,
  '});',
  '',
].join('\n');

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cjt-jsdoc-401-'));
  await mkdir(join(dir, 'src'), { recursive: true });
  await mkdir(join(dir, 'plugins'), { recursive: true });
  await writeFile(
    join(dir, 'src', 'a.js'),
    '/** A block in the world. */\nclass Block {}\n\nmodule.exports = Block;\n',
    'utf8'
  );
  await writeFile(join(dir, 'README.md'), '# MineJS\n\nThe project readme.\n', 'utf8');
  await writeFile(join(dir, 'plugins', 'break-render.js'), BREAK_PLUGIN, 'utf8');
});

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

/** Run JSDoc in the fixture into `dest`, optionally with the break plugin. */
function runJsdoc(dest: string, breakRender: boolean): { status: number | null; output: string } {
  const conf = join(dir, `jsdoc-${dest}.json`);
  const plugins = ['plugins/markdown', ...(breakRender ? ['./plugins/break-render.js'] : [])];
  writeFileSync(
    conf,
    JSON.stringify({
      plugins,
      source: { include: ['src'] },
      opts: { destination: dest, readme: 'README.md', recurse: true, template: TEMPLATE_ROOT },
    }),
    'utf8'
  );
  const r = spawnSync(process.execPath, [JSDOC, '-c', conf], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', CLEAN_JSDOC_THEME_BUILD: '' },
    // spawnSync blocks the worker, so vitest's own timeout can't fire: bound it here.
    timeout: 90_000,
    killSignal: 'SIGKILL',
  });
  if (r.error) {
    throw new Error(`JSDoc did not finish: ${r.error.message}\n${r.stdout}\n${r.stderr}`);
  }
  return { status: r.status, output: `${r.stdout}\n${r.stderr}` };
}

describe('JSDoc CLI — every page fails to render (#401)', () => {
  it('exits 1 with one error and writes nothing', () => {
    const { status, output } = runJsdoc('out-broken', true);
    expect(output).toContain('no page could be rendered');
    expect(output).toContain(SIMULATED);
    expect(output).not.toContain('Unhandled rejection');
    expect(status).toBe(1);
    expect(existsSync(join(dir, 'out-broken'))).toBe(false);
  }, 120_000);

  it('leaves a previous build in the destination untouched', async () => {
    await mkdir(join(dir, 'out-previous'), { recursive: true });
    await writeFile(join(dir, 'out-previous', 'keep.txt'), 'previous build', 'utf8');
    const { status, output } = runJsdoc('out-previous', true);
    expect(output).toContain('no page could be rendered');
    expect(status).toBe(1);
    expect(readFileSync(join(dir, 'out-previous', 'keep.txt'), 'utf8')).toBe('previous build');
  }, 120_000);

  it('builds normally without the plugin (control)', () => {
    const { status, output } = runJsdoc('out-ok', false);
    expect(output).not.toContain('no page could be rendered');
    expect(status).toBe(0);
    expect(existsSync(join(dir, 'out-ok', 'index.html'))).toBe(true);
  }, 120_000);
});
