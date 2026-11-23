import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// Real JSDoc 4 runs guarding the `sectionOrder` label check (#352): a label
// that names no sidebar section is reported, with a did-you-mean hint.

const pkgRoot = fileURLToPath(new URL('../../', import.meta.url));
const JSDOC = createRequire(import.meta.url).resolve('jsdoc/jsdoc.js');
const TEMPLATE_ROOT = pkgRoot.split('\\').join('/').replace(/\/$/, '');

/** Per-test budget for a JSDoc spawn: generous, as CI runs loaded tests many times slower. */
const SPAWN_TEST_TIMEOUT = 300_000;

const MIN = { 'src/a.js': '/** A thing. */\nexport const a = 1;\n' };
const WARNING = 'sectionOrder — no sidebar section matches';

const dirs: string[] = [];

afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true, maxRetries: 3 })));
});

interface Run {
  status: number | null;
  output: string;
  has: (rel: string) => boolean;
  read: (rel: string) => string;
}

/** Write `files` into a fresh project, run `jsdoc -c jsdoc.json` in it. */
async function runJsdoc(
  files: Record<string, string>,
  opts: Record<string, unknown>
): Promise<Run> {
  const dir = await mkdtemp(join(tmpdir(), 'cjt-section-order-'));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, ...rel.split('/'));
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content);
  }
  await writeFile(
    join(dir, 'jsdoc.json'),
    JSON.stringify({
      plugins: ['plugins/markdown'],
      source: { include: ['src'] },
      opts: { destination: 'out', recurse: true, template: TEMPLATE_ROOT, ...opts },
    }),
    'utf8'
  );
  const r = spawnSync(process.execPath, [JSDOC, '-c', 'jsdoc.json'], {
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
  const outPath = (rel: string): string => join(dir, 'out', ...rel.split('/'));
  return {
    status: r.status,
    output: `${r.stdout}\n${r.stderr}`,
    has: (rel) => existsSync(outPath(rel)),
    read: (rel) => readFileSync(outPath(rel), 'utf8'),
  };
}

describe('JSDoc CLI end to end: sectionOrder labels (#352)', () => {
  it(
    'warns on labels that match no section, with a hint, and still builds',
    async () => {
      const run = await runJsdoc(MIN, { sectionOrder: ['Clases', 'Globalz', 'Events'] });
      expect(run.status, run.output).toBe(0);
      const line = run.output.split('\n').find((l) => l.includes(WARNING));
      expect(line, run.output).toBeDefined();
      expect(line).toContain("'Clases' (did you mean 'Classes'?)");
      expect(line).toContain("'Globalz' (did you mean 'Globals'?)");
      // `Events` is a built-in label with no pages here: valid, not reported.
      const unmatched = line!.slice(0, line!.indexOf('Known sections:'));
      expect(unmatched).not.toContain("'Events'");
      // The fallout the warning explains: Globals isn't listed, so the page is
      // built but its sidebar section is dropped.
      expect(run.has('global/index.html')).toBe(true);
      expect(run.read('global/index.html')).not.toContain('"group":"Globals"');
    },
    SPAWN_TEST_TIMEOUT
  );

  it(
    'fails the build under strict and writes nothing',
    async () => {
      const run = await runJsdoc(MIN, { strict: true, sectionOrder: ['Clases'] });
      expect(run.status, run.output).toBe(1);
      expect(run.output).toContain(WARNING);
      expect(run.output).toContain("'Clases' (did you mean 'Classes'?)");
      expect(run.has('index.html')).toBe(false);
    },
    SPAWN_TEST_TIMEOUT
  );

  it(
    "accepts v4's Global and built-in labels without a warning",
    async () => {
      const run = await runJsdoc(MIN, { sectionOrder: ['Global', 'Classes', 'Tutorials'] });
      expect(run.status, run.output).toBe(0);
      expect(run.output).not.toContain(WARNING);
    },
    SPAWN_TEST_TIMEOUT
  );
});
