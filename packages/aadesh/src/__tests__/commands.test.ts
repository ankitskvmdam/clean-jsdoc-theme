import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { writeFile as writeFileCb } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceHash } from '@clean-jsdoc-theme/bhasha';
import { runExtract } from '../commands/extract';
import { runValidate } from '../commands/validate';
import { readLocaleFile, writeLocaleFile } from '../artifacts';
import type { PipelineRunner } from '../extract-manifest';

const SLOTS = [
  {
    key: 'api.X#description',
    sourceText: '<p>Hi {count}.</p>',
    hash: sourceHash('<p>Hi {count}.</p>'),
  },
  { key: 'api.Y#description', sourceText: '<p>Yo.</p>', hash: sourceHash('<p>Yo.</p>') },
];

/** A fake pipeline: writes the extract manifest the bridge would, then "succeeds". */
const fakeRunner: PipelineRunner = ({ env }) =>
  new Promise((resolve, reject) => {
    const out = env[`CLEAN_JSDOC_THEME_EXTRACT`];
    if (!out) return reject(new Error('extract env var not set'));
    writeFileCb(out, JSON.stringify({ version: 1, slots: SLOTS }), (err) =>
      err ? reject(err) : resolve({ code: 0, stderr: '' })
    );
  });

let root: string;
let configPath: string;
let localesDir: string;

async function writeConfig(opts: Record<string, unknown>): Promise<void> {
  await writeFile(configPath, JSON.stringify({ opts }), 'utf8');
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'aadesh-cli-'));
  configPath = join(root, 'jsdoc.json');
  localesDir = join(root, 'locales');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('runExtract', () => {
  it('does nothing when no locales are configured', async () => {
    await writeConfig({});
    let called = false;
    const runner: PipelineRunner = async (s) => {
      called = true;
      return fakeRunner(s);
    };
    const res = await runExtract({ configPath, dir: localesDir, runner });
    expect(res.localized).toBe(false);
    expect(res.reports).toHaveLength(0);
    expect(called).toBe(false); // never spawns the pipeline
  });

  it('surfaces a malformed-locales config as an error (not a silent no-op)', async () => {
    await writeConfig({ locales: 'en' }); // not an array → validation error
    const res = await runExtract({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.localized).toBe(false);
    expect(res.diagnostics.hasErrors()).toBe(true); // the CLI exits non-zero on this
  });

  it('creates a skeleton default + empty non-default on first run', async () => {
    await writeConfig({ locales: ['en', 'fr'], defaultLocale: 'en' });
    const res = await runExtract({ configPath, dir: localesDir, runner: fakeRunner });

    expect(res.localized).toBe(true);
    expect(res.reports.map((r) => r.locale)).toEqual(['en', 'fr']);

    const en = (await readLocaleFile(localesDir, 'en'))!;
    expect(en.api['X#description']).toBe('<p>Hi {count}.</p>'); // skeleton = source
    expect(en.chrome.search).toMatchObject({ recent: 'Recent' }); // chrome from EN_CHROME

    const fr = (await readLocaleFile(localesDir, 'fr'))!;
    expect(fr.api['X#description']).toBe(''); // untranslated

    const frReport = res.reports.find((r) => r.locale === 'fr')!;
    expect(frReport.translated).toBe(0);
    const enReport = res.reports.find((r) => r.locale === 'en')!;
    expect(enReport.translated).toBe(enReport.total); // 100%
  });
});

describe('runValidate', () => {
  beforeEach(async () => {
    await writeConfig({ locales: ['en', 'fr'], defaultLocale: 'en' });
    await runExtract({ configPath, dir: localesDir, runner: fakeRunner }); // seed files
  });

  it('passes when translations are well-formed (coverage gaps are warnings, not failures)', async () => {
    const fr = (await readLocaleFile(localesDir, 'fr'))!;
    fr.api['X#description'] = '<p>Bonjour {count}.</p>'; // good (keeps {count})
    fr.api['Y#description'] = '<p>Ouais.</p>'; // good
    await writeLocaleFile(localesDir, 'fr', fr);

    const res = await runValidate({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.ok).toBe(true); // chrome still untranslated → warnings, but not errors
    expect(res.coverage.find((c) => c.locale === 'fr')!.translated).toBeGreaterThanOrEqual(2);
    // default locale isn't validated as a translation
    expect(res.coverage.some((c) => c.locale === 'en')).toBe(false);
  });

  it('errors on a dropped/added {var} token and fails', async () => {
    const fr = (await readLocaleFile(localesDir, 'fr'))!;
    fr.api['X#description'] = '<p>Bonjour.</p>'; // DROPS {count}
    fr.api['Y#description'] = '<p>Yo {oops}.</p>'; // ADDS {oops}
    await writeLocaleFile(localesDir, 'fr', fr);

    const res = await runValidate({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.ok).toBe(false);
    const codes = res.diagnostics.list.map((d) => d.code);
    expect(codes).toContain('bhasha/dropped-token');
    expect(codes).toContain('bhasha/unknown-token');
  });

  it('errors on a key not in the template', async () => {
    const fr = (await readLocaleFile(localesDir, 'fr'))!;
    fr.api['Ghost#description'] = 'Fantôme';
    await writeLocaleFile(localesDir, 'fr', fr);

    const res = await runValidate({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.ok).toBe(false);
    expect(res.diagnostics.list.some((d) => d.code === 'locale/unknown-key')).toBe(true);
  });

  it('strict mode fails on coverage gaps (warnings → failures)', async () => {
    const res = await runValidate({
      configPath,
      dir: localesDir,
      strict: true,
      runner: fakeRunner,
    });
    expect(res.ok).toBe(false); // fr is entirely untranslated → coverage warning escalates
    expect(res.diagnostics.list.some((d) => d.code === 'locale/coverage')).toBe(true);
  });

  it('errors when a configured locale has no catalog file', async () => {
    await rm(join(localesDir, 'fr.json'));
    const res = await runValidate({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.diagnostics.list.some((d) => d.code === 'locale/missing-file')).toBe(true);
    expect(res.ok).toBe(false);
  });
});
