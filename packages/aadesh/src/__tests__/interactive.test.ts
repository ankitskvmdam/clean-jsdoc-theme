import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COMMANDS, findCommand, toArgv, toCommandString } from '../interactive/registry';
import { addScript, hasScript, writeScript } from '../interactive/package-json';

describe('interactive registry — toArgv', () => {
  const extract = findCommand('extract')!;
  const prompt = findCommand('prompt')!;
  const build = findCommand('build')!;

  it('omits defaults + falsy flags → bare command', () => {
    // config left at its default, every confirm false, optionals blank.
    expect(toArgv(extract, { config: 'jsdoc.json', dir: undefined, prune: false, typedoc: false }))
      .toEqual(['extract']);
  });

  it('emits a non-default config (short flag), true confirms, and a dir', () => {
    expect(
      toArgv(extract, { config: 'sub/jsdoc.json', dir: 'locales', prune: true, typedoc: true })
    ).toEqual(['extract', '-c', 'sub/jsdoc.json', '--dir', 'locales', '--prune', '--typedoc']);
  });

  it('emits a number option only when provided', () => {
    expect(toArgv(prompt, { config: 'jsdoc.json', locale: 'fr', chunkSize: 40, typedoc: false }))
      .toEqual(['prompt', '--locale', 'fr', '--chunk-size', '40']);
    expect(toArgv(prompt, { config: 'jsdoc.json', chunkSize: undefined })).toEqual(['prompt']);
  });

  it('treats a blank/whitespace text answer as omitted', () => {
    expect(toArgv(build, { config: '   ', dir: '', locale: '  ', typedoc: false })).toEqual([
      'build',
    ]);
  });

  it('build is the last command and frames itself as the recurring step', () => {
    expect(COMMANDS[COMMANDS.length - 1].id).toBe('build');
    expect(build.description.toLowerCase()).toContain('periodically');
  });
});

describe('interactive registry — toCommandString', () => {
  it('prefixes clean-jsdoc and quotes parts with whitespace', () => {
    expect(toCommandString(['extract', '--prune'])).toBe('clean-jsdoc extract --prune');
    expect(toCommandString(['build', '-c', 'my docs/jsdoc.json'])).toBe(
      'clean-jsdoc build -c "my docs/jsdoc.json"'
    );
  });
});

describe('interactive package.json — addScript / hasScript', () => {
  const pkg = (scripts: Record<string, string> = {}): string =>
    JSON.stringify({ name: 'demo', scripts }, null, 2) + '\n';

  it('detects an existing script key', () => {
    expect(hasScript({ scripts: { build: 'x' } }, 'build')).toBe(true);
    expect(hasScript({ scripts: {} }, 'build')).toBe(false);
    expect(hasScript({}, 'build')).toBe(false);
  });

  it('adds a new script, preserving 2-space indent + trailing newline', () => {
    const res = addScript(pkg({ test: 'vitest' }), 'i18n:build', 'clean-jsdoc build');
    expect(res.status).toBe('added');
    const parsed = JSON.parse(res.json);
    expect(parsed.scripts).toEqual({ test: 'vitest', 'i18n:build': 'clean-jsdoc build' });
    expect(res.json.endsWith('\n')).toBe(true);
    expect(res.json).toContain('\n  "scripts"'); // 2-space indent kept
  });

  it('creates the scripts block when absent', () => {
    const res = addScript(JSON.stringify({ name: 'demo' }) + '', 'i18n:extract', 'clean-jsdoc extract');
    expect(res.status).toBe('added');
    expect(JSON.parse(res.json).scripts).toEqual({ 'i18n:extract': 'clean-jsdoc extract' });
  });

  it('never overwrites an existing key (status exists, text unchanged)', () => {
    const original = pkg({ 'i18n:build': 'old command' });
    const res = addScript(original, 'i18n:build', 'clean-jsdoc build');
    expect(res.status).toBe('exists');
    expect(res.json).toBe(original);
  });

  it('preserves tab indentation when detected', () => {
    const tabbed = '{\n\t"name": "demo"\n}\n';
    const res = addScript(tabbed, 'k', 'cmd');
    expect(res.json).toContain('\n\t"scripts"');
  });
});

describe('interactive package.json — writeScript (fs)', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aadesh-pkg-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('adds a script to package.json on disk', async () => {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'demo' }, null, 2) + '\n');
    const res = await writeScript(dir, 'i18n:build', 'clean-jsdoc build');
    expect(res.status).toBe('added');
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
    expect(pkg.scripts['i18n:build']).toBe('clean-jsdoc build');
  });

  it('returns exists (and does not modify) when the key is taken', async () => {
    const original =
      JSON.stringify({ name: 'demo', scripts: { 'i18n:build': 'old' } }, null, 2) + '\n';
    await writeFile(join(dir, 'package.json'), original);
    const res = await writeScript(dir, 'i18n:build', 'clean-jsdoc build');
    expect(res.status).toBe('exists');
    expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(original);
  });

  it('throws an actionable error when there is no package.json', async () => {
    await expect(writeScript(dir, 'k', 'cmd')).rejects.toThrow(/no package\.json/);
  });
});
