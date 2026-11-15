import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Application } from 'typedoc';

// The built plugin entry, as `"plugin": ["@clean-jsdoc-theme/typedoc"]` loads it.
// Turbo runs `test` after `build`, so `dist/` exists.
const PLUGIN = pathToFileURL(fileURLToPath(new URL('../../dist/index.js', import.meta.url))).href;

/** TypeDoc requires posix separators in `entryPoints`/`tsconfig` globs. */
const posix = (p: string): string => p.split(String.fromCharCode(92)).join('/');

let tmp: string;
let out: string;
/** Every message TypeDoc logged, any level, in order. */
const logged: string[] = [];
const read = (rel: string): string => readFileSync(join(out, ...rel.split('/')), 'utf8');

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'cjt-typedoc-plugin-'));
  out = join(tmp, 'dist');
  await mkdir(join(tmp, 'src'), { recursive: true });
  await mkdir(join(tmp, 'docs', 'guides'), { recursive: true });
  await writeFile(
    join(tmp, 'src', 'index.ts'),
    [
      '/** A block in the world. */',
      'export class Block {',
      '  /** How hard it is to break. */',
      '  hardness = 1;',
      '  /** Breaks the block. */',
      '  breakIt(): void {}',
      '}',
      '',
    ].join('\n'),
    'utf8'
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
  await writeFile(join(tmp, 'README.md'), '# MineJS\n\nThe project readme.\n', 'utf8');
  await writeFile(
    join(tmp, 'docs', 'guides', 'getting-started.md'),
    '# Getting started\n\nProse written in the docs directory.\n',
    'utf8'
  );

  // The reporter's typedoc.json (#334, #342), as options.
  const app = await Application.bootstrapWithPlugins({
    entryPoints: [posix(join(tmp, 'src', 'index.ts'))],
    tsconfig: posix(join(tmp, 'tsconfig.json')),
    readme: posix(join(tmp, 'README.md')),
    plugin: [PLUGIN],
    outputs: [{ name: 'clean-jsdoc-theme', path: posix(out) }],
    cleanJsdocTheme: { docs: posix(join(tmp, 'docs')), siteName: 'MineJS' },
    skipErrorChecking: true,
  } as Parameters<typeof Application.bootstrapWithPlugins>[0]);
  vi.spyOn(app.logger, 'log').mockImplementation((message) => {
    logged.push(String(message));
  });
  const project = await app.convert();
  if (!project) throw new Error('typedoc convert() returned undefined');
  await app.generateOutputs(project);
}, 120_000);

afterAll(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

describe('TypeDoc plugin end to end (typedoc.json as users write it)', () => {
  it('accepts the cleanJsdocTheme block without an unknown-option warning (#334)', () => {
    const said = logged.join('\n');
    // The capture saw the run, so the checks below can't pass on an empty log.
    expect(said).toContain('build complete');
    expect(said).not.toContain('unknown option');
    expect(said).not.toContain('opts/unknown-key');
  });

  it('generates a prose page from the docs directory (#334)', () => {
    expect(existsSync(join(out, 'guides', 'getting-started', 'index.html'))).toBe(true);
    const html = read('guides/getting-started/index.html');
    expect(html).toContain('Prose written in the docs directory.');
    // …and links it from the sidebar of another page.
    expect(read('index.html')).toContain('href="/guides/getting-started"');
  });

  it('renders every page: the readme home, the class page, no skipped pages (#342)', () => {
    const said = logged.join('\n');
    expect(said).not.toContain('failed to render');
    expect(said).not.toContain("reading 'context'");
    expect(read('index.html')).toContain('The project readme.');
    expect(read('block/index.html')).toContain('A block in the world.');
  });
});
