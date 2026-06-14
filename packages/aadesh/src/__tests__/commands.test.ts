import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { writeFile as writeFileCb } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceHash } from '@clean-jsdoc-theme/bhasha';
import { runExtract } from '../commands/extract';
import { runValidate } from '../commands/validate';
import { runPrompt } from '../commands/prompt';
import { runBuild } from '../commands/build';
import {
  localeFilePath,
  localeMetaFilePath,
  readLocaleFile,
  writeLocaleFile,
} from '../artifacts';
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

    // On disk it's two files: the editable content (no machine bookkeeping) and
    // the auto-managed meta sidecar that carries the hashes.
    const enContent = await readFile(localeFilePath(localesDir, 'en'), 'utf8');
    const enMeta = await readFile(localeMetaFilePath(localesDir, 'en'), 'utf8');
    expect(enContent).not.toContain('_hashes');
    expect(enContent).toContain('"api"');
    expect(enMeta).toContain('_hashes');

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

describe('runPrompt', () => {
  beforeEach(async () => {
    await writeConfig({ locales: ['en', 'fr'], defaultLocale: 'en' });
    await runExtract({ configPath, dir: localesDir, runner: fakeRunner });
  });

  it('prompts only the non-default locale, covering its untranslated entries', async () => {
    const res = await runPrompt({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.prompts.map((p) => p.locale)).toEqual(['fr']); // en (default) excluded
    const fr = res.prompts[0];
    expect(fr.count).toBeGreaterThan(0);
    expect(fr.chunks.length).toBeGreaterThan(0);
    expect(fr.chunks[0]).toContain('Translate to fr');
  });

  it('warns (no crash) when --locale names the default locale', async () => {
    const res = await runPrompt({ configPath, dir: localesDir, locale: 'en', runner: fakeRunner });
    expect(res.prompts).toHaveLength(0);
    expect(res.diagnostics.list.some((d) => d.code === 'prompt/unknown-locale')).toBe(true);
  });

  it('errors when a target locale has no catalog file', async () => {
    await rm(join(localesDir, 'fr.json'));
    const res = await runPrompt({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.diagnostics.list.some((d) => d.code === 'locale/missing-file')).toBe(true);
  });

  it('emits no chunks once a locale is fully translated', async () => {
    // Translate every entry in fr to match the template (so nothing is new/stale).
    const en = (await readLocaleFile(localesDir, 'en'))!; // skeleton = source + hashes
    const fr = (await readLocaleFile(localesDir, 'fr'))!;
    fr.api = { ...en.api };
    fr.chrome = JSON.parse(JSON.stringify(en.chrome));
    fr._hashes = { ...en._hashes };
    await writeLocaleFile(localesDir, 'fr', fr);

    const res = await runPrompt({ configPath, dir: localesDir, runner: fakeRunner });
    expect(res.prompts[0].count).toBe(0);
    expect(res.prompts[0].chunks).toEqual([]);
  });
});

describe('runBuild', () => {
  let specs: Array<{
    locale: string;
    defaultLocale: string;
    apiMessages: Record<string, string>;
    chromeMessages: Record<string, string>;
    destination: string;
    basePath: string;
  }>;
  // Captured spawn argv per locale (the spec carries the locale code).
  let runs: Array<{ locale: string; args: string[] }>;
  // A fake build pipeline: capture the per-locale spec the theme would render + its argv.
  const buildRunner: PipelineRunner = async ({ args, env }) => {
    const path = env['CLEAN_JSDOC_THEME_BUILD'];
    if (path) {
      const spec = JSON.parse(await readFile(path, 'utf8'));
      specs.push(spec);
      runs.push({ locale: spec.locale, args });
    }
    return { code: 0, stderr: '' };
  };

  beforeEach(async () => {
    specs = [];
    runs = [];
    await writeConfig({ locales: ['en', 'fr'], defaultLocale: 'en', destination: 'dist' });
    await runExtract({ configPath, dir: localesDir, runner: fakeRunner }); // seed catalogs
  });

  it('renders default unprefixed (identity) + fr under /fr with its translations', async () => {
    const fr = (await readLocaleFile(localesDir, 'fr'))!;
    fr.api['X#description'] = '<p>FR</p>';
    fr.chrome.search = { ...(fr.chrome.search as object), placeholder: 'Rechercher…' };
    await writeLocaleFile(localesDir, 'fr', fr);

    const res = await runBuild({ configPath, dir: localesDir, runner: buildRunner });
    expect(res.results.map((r) => r.locale)).toEqual(['en', 'fr']);
    expect(res.results.every((r) => r.ok)).toBe(true);

    const en = specs.find((s) => s.locale === 'en')!;
    const frSpec = specs.find((s) => s.locale === 'fr')!;
    // Default stamps nothing (identity → live source + English chrome via fallback).
    expect(en.basePath).toBe('/');
    expect(en.apiMessages).toEqual({});
    expect(en.chromeMessages).toEqual({});
    expect(en.defaultLocale).toBe('en');
    // Non-default carries its API + chrome translations (full keys, non-empty only).
    expect(frSpec.basePath).toBe('/fr');
    expect(frSpec.destination.replace(/\\/g, '/').endsWith('/fr')).toBe(true);
    expect(frSpec.apiMessages['api.X#description']).toBe('<p>FR</p>');
    expect(frSpec.chromeMessages['chrome.search.placeholder']).toBe('Rechercher…');
  });

  it('passes --readme <variant> for a non-default locale, never for the default', async () => {
    await writeConfig({
      locales: ['en', 'fr'],
      defaultLocale: 'en',
      destination: 'dist',
      readme: 'README.md',
    });
    await writeFile(join(root, 'README.md'), '# Home', 'utf8');
    await writeFile(join(root, 'README.en.md'), '# Default home', 'utf8'); // present but ignored
    await writeFile(join(root, 'README.fr.md'), '# Accueil', 'utf8');

    const res = await runBuild({ configPath, dir: localesDir, runner: buildRunner });
    expect(res.results.every((r) => r.ok)).toBe(true);

    const enArgs = runs.find((r) => r.locale === 'en')!.args;
    const frArgs = runs.find((r) => r.locale === 'fr')!.args;

    // The default locale always uses the configured README — a README.en.md is
    // NOT honored (the canonical source home stays config-driven).
    expect(enArgs).not.toContain('--readme');
    // fr has a variant → `--readme <abs path to README.fr.md>`.
    const i = frArgs.indexOf('--readme');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(frArgs[i + 1].replace(/\\/g, '/').endsWith('/README.fr.md')).toBe(true);
  });

  it('reports a fallback (info) + passes no --readme when a non-default locale lacks a variant', async () => {
    await writeConfig({
      locales: ['en', 'fr'],
      defaultLocale: 'en',
      destination: 'dist',
      readme: 'README.md',
    });
    await writeFile(join(root, 'README.md'), '# Home', 'utf8'); // no README.fr.md

    const res = await runBuild({ configPath, dir: localesDir, runner: buildRunner });
    expect(runs.find((r) => r.locale === 'fr')!.args).not.toContain('--readme');
    const note = res.diagnostics.list.find((d) => d.code === 'home/readme-fallback');
    expect(note?.level).toBe('info');
    expect(note?.path).toBe('fr');
  });

  it('errors (no build) when the config has no output directory', async () => {
    await writeConfig({ locales: ['en', 'fr'], defaultLocale: 'en' }); // no destination
    const res = await runBuild({ configPath, dir: localesDir, runner: buildRunner });
    expect(res.diagnostics.list.some((d) => d.code === 'build/no-destination')).toBe(true);
    expect(res.results).toHaveLength(0);
  });

  it('errors + skips a non-default locale missing its catalog', async () => {
    await rm(join(localesDir, 'fr.json'));
    const res = await runBuild({ configPath, dir: localesDir, runner: buildRunner });
    expect(res.diagnostics.list.some((d) => d.code === 'locale/missing-file')).toBe(true);
    expect(res.results.map((r) => r.locale)).toEqual(['en']); // en still built
  });

  it('records a failed pipeline (non-zero exit) as a build error', async () => {
    const failing: PipelineRunner = async ({ env }) =>
      env['CLEAN_JSDOC_THEME_BUILD'] ? { code: 2, stderr: 'boom' } : { code: 0, stderr: '' };
    const res = await runBuild({ configPath, dir: localesDir, runner: failing });
    expect(res.results.every((r) => !r.ok)).toBe(true);
    expect(res.diagnostics.list.some((d) => d.code === 'build/pipeline-failed')).toBe(true);
  });

  it('--locale builds only that locale', async () => {
    const res = await runBuild({ configPath, dir: localesDir, locale: 'fr', runner: buildRunner });
    expect(res.results.map((r) => r.locale)).toEqual(['fr']);
  });
});
