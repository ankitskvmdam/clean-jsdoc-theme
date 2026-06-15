/**
 * Command runners — one `exec*` per subcommand that runs the tested pure core,
 * prints diagnostics + the report, and sets `process.exitCode` on failure.
 *
 * These are the single execution path shared by BOTH the flag-driven commander
 * actions (`cli.ts`) and the interactive menu (`interactive/`), so the two
 * front-ends never drift in how a command runs or reports. Each is self-contained
 * (its own try/catch) — a caller just awaits it; a thrown setup error is caught,
 * printed, and reflected in the exit code.
 */

import { relative } from 'node:path';
import { formatDiagnostics } from '@clean-jsdoc-theme/utils';
import { runExtract } from './commands/extract';
import { runValidate } from './commands/validate';
import { runPrompt } from './commands/prompt';
import { runBuild } from './commands/build';
import { formatExtractReport } from './report';
import type { Pipeline } from './config';

/** Colored output only when stdout is a TTY (no ANSI in a pipe/file). */
const color = (): boolean => Boolean(process.stdout.isTTY);

/** Map the shared `typedoc` flag to the pipeline name. */
const pipelineOf = (typedoc: boolean): Pipeline => (typedoc ? 'typedoc' : 'jsdoc');

/** "no locales configured" notice — shared by every command's empty path. */
function noLocalesNotice(verb: string): void {
  console.log(`aadesh: no locales configured — ${verb}`);
}

export interface ExtractOpts {
  config: string;
  dir?: string;
  prune: boolean;
  typedoc: boolean;
}

export async function execExtract(o: ExtractOpts): Promise<void> {
  try {
    const result = await runExtract({
      configPath: o.config,
      dir: o.dir,
      prune: o.prune,
      pipeline: pipelineOf(o.typedoc),
    });
    if (result.diagnostics.list.length > 0) {
      console.log(formatDiagnostics(result.diagnostics, { color: color() }));
    }
    // A config error (e.g. malformed `locales`) fails even though it yields no
    // locales — set the exit code BEFORE the no-locales bail.
    if (result.diagnostics.hasErrors()) process.exitCode = 1;
    if (!result.localized) {
      if (!result.diagnostics.hasErrors()) noLocalesNotice('set `opts.locales` in your config.');
      return;
    }
    console.log(formatExtractReport(result.reports));
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}

export interface ValidateOpts {
  config: string;
  dir?: string;
  strict: boolean;
  typedoc: boolean;
}

export async function execValidate(o: ValidateOpts): Promise<void> {
  try {
    const result = await runValidate({
      configPath: o.config,
      dir: o.dir,
      strict: o.strict,
      pipeline: pipelineOf(o.typedoc),
    });
    if (result.diagnostics.list.length > 0) {
      console.log(formatDiagnostics(result.diagnostics, { color: color() }));
    }
    // No locales: a benign no-op UNLESS the config itself was malformed (errors).
    if (!result.localized && !result.diagnostics.hasErrors()) {
      noLocalesNotice('nothing to validate.');
      return;
    }
    // `ok` already folds in errors + (under --strict) warnings; a config error
    // with no locales isn't reflected in `ok`, so check the bag too.
    const failed = result.diagnostics.hasErrors() || !result.ok;
    console.log(failed ? 'Localization validation failed.' : 'Localization validation passed.');
    if (failed) process.exitCode = 1;
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}

export interface PromptOpts {
  config: string;
  dir?: string;
  locale?: string;
  chunkSize?: number;
  typedoc: boolean;
}

export async function execPrompt(o: PromptOpts): Promise<void> {
  try {
    const result = await runPrompt({
      configPath: o.config,
      dir: o.dir,
      locale: o.locale,
      chunkSize: o.chunkSize,
      pipeline: pipelineOf(o.typedoc),
    });
    if (result.diagnostics.list.length > 0) {
      console.log(formatDiagnostics(result.diagnostics, { color: color() }));
    }
    if (result.diagnostics.hasErrors()) process.exitCode = 1;
    if (!result.localized) {
      if (!result.diagnostics.hasErrors()) noLocalesNotice('set `opts.locales` in your config.');
      return;
    }
    const rel = (p: string): string => relative(process.cwd(), p) || p;
    let wrote = false;
    for (const { locale, count, files } of result.prompts) {
      if (count === 0) {
        console.log(`${locale}: fully translated — nothing to prompt.`);
        continue;
      }
      wrote = true;
      const noun = files.length === 1 ? 'file' : 'files';
      console.log(`${locale}: ${count} ${count === 1 ? 'entry' : 'entries'} → ${files.length} prompt ${noun}:`);
      for (const f of files) console.log(`  ${rel(f)}`);
    }
    if (wrote) {
      console.log('');
      console.log('Open each file and paste its contents into your LLM — or upload the .md directly.');
      console.log(
        'Then copy the returned translations into the matching <code>.json catalog and run `clean-jsdoc i18n validate`.'
      );
    }
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}

export interface BuildOpts {
  config: string;
  dir?: string;
  locale?: string;
  typedoc: boolean;
}

export async function execBuild(o: BuildOpts): Promise<void> {
  try {
    const result = await runBuild({
      configPath: o.config,
      dir: o.dir,
      locale: o.locale,
      pipeline: pipelineOf(o.typedoc),
    });
    if (result.diagnostics.list.length > 0) {
      console.log(formatDiagnostics(result.diagnostics, { color: color() }));
    }
    if (result.diagnostics.hasErrors()) process.exitCode = 1;
    if (!result.localized) {
      if (!result.diagnostics.hasErrors()) noLocalesNotice('set `opts.locales` in your config.');
      return;
    }
    for (const r of result.results) {
      console.log(`${r.ok ? '✓' : '✗'} ${r.locale} → ${r.destination}`);
    }
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}
