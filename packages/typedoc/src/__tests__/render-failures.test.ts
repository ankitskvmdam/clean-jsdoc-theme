import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { options } from 'preact';
import { Application, LogLevel } from 'typedoc';

// #401: when no page can be rendered (a systemic failure, e.g. a duplicate
// Preact under Yarn PnP), the build must fail and leave the output untouched.
// We simulate that by making every Preact vnode creation throw: dwar then fails
// each page on its own, and render() still resolves. If this file's preact were
// a different instance from dwar's, the build would succeed and the assertions
// below would fail loudly.

// The built plugin entry, as `"plugin": ["@clean-jsdoc-theme/typedoc"]` loads it.
const PLUGIN = pathToFileURL(fileURLToPath(new URL('../../dist/index.js', import.meta.url))).href;

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split('\\').join('/');

const SIMULATED = 'simulated systemic render failure';

let tmp: string;
const originalVnode = options.vnode;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-401-'));
  await mkdir(join(tmp, 'src'), { recursive: true });
  await writeFile(
    join(tmp, 'src', 'index.ts'),
    '/** A block in the world. */\nexport class Block {}\n',
    'utf8'
  );
  await writeFile(
    join(tmp, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { target: 'ES2020', module: 'ESNext', strict: true, skipLibCheck: true },
      include: ['src/index.ts'],
    }),
    'utf8'
  );
  await writeFile(join(tmp, 'README.md'), '# MineJS\n\nThe project readme.\n', 'utf8');
  options.vnode = () => {
    throw new Error(SIMULATED);
  };
});

afterAll(async () => {
  options.vnode = originalVnode;
  if (tmp) await rm(tmp, { recursive: true, force: true, maxRetries: 3 });
});

/**
 * Run the plugin into `out`; returns everything TypeDoc logged and the messages
 * logged at error level. (The spy replaces `Logger.log`, which is where TypeDoc
 * counts errors, so `app.logger.hasErrors()` can't be used here; the error-level
 * log is what makes the `typedoc` CLI exit non-zero.)
 */
async function build(out: string): Promise<{ said: string; errors: string[] }> {
  const logged: string[] = [];
  const errors: string[] = [];
  const app = await Application.bootstrapWithPlugins({
    entryPoints: [posix(join(tmp, 'src', 'index.ts'))],
    tsconfig: posix(join(tmp, 'tsconfig.json')),
    readme: posix(join(tmp, 'README.md')),
    plugin: [PLUGIN],
    outputs: [{ name: 'clean-jsdoc-theme', path: posix(out) }],
    skipErrorChecking: true,
  } as Parameters<typeof Application.bootstrapWithPlugins>[0]);
  vi.spyOn(app.logger, 'log').mockImplementation((message, level) => {
    logged.push(String(message));
    if (level === LogLevel.Error) errors.push(String(message));
  });
  const project = await app.convert();
  if (!project) throw new Error('typedoc convert() returned undefined');
  await app.generateOutputs(project);
  return { said: logged.join('\n'), errors };
}

describe('TypeDoc plugin — every page fails to render (#401)', () => {
  it('fails the build with one error and writes nothing', async () => {
    const out = join(tmp, 'out-fresh');
    const { said, errors } = await build(out);
    expect(said).toContain(SIMULATED);
    // One error, not one per page: the count plus the first failure.
    expect(errors).toHaveLength(1);
    // Home, the class page and the source listing; the file viewer is not content.
    expect(errors[0]).toContain('no page could be rendered: all 3 content page(s) failed');
    expect(existsSync(out)).toBe(false);
  }, 120_000);

  it('leaves a previous build in the output directory untouched', async () => {
    const out = join(tmp, 'out-previous');
    await mkdir(out, { recursive: true });
    await writeFile(join(out, 'keep.txt'), 'previous build', 'utf8');
    const { errors } = await build(out);
    expect(errors.join('\n')).toContain('no page could be rendered');
    expect(readFileSync(join(out, 'keep.txt'), 'utf8')).toBe('previous build');
  }, 120_000);
});
