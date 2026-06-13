#!/usr/bin/env node
/**
 * `clean-jsdoc` — the aadesh localization CLI. Flag-driven so it runs headless in
 * CI (the plan's "flag equivalent for every prompt"); interactive prompts are a
 * later addition layered on top. Subcommands `extract` / `validate` / `prompt`
 * orchestrate the tested pure core; the heavy `build` lands in a later chunk.
 */

import { Command } from 'commander';
import { formatDiagnostics } from '@clean-jsdoc-theme/utils';
import { runExtract } from './commands/extract';
import { runValidate } from './commands/validate';
import { runPrompt } from './commands/prompt';
import { formatExtractReport } from './report';

const color = (): boolean => Boolean(process.stdout.isTTY);

const program = new Command();
program.name('clean-jsdoc').description('clean-jsdoc-theme localization CLI');

program
  .command('extract')
  .description('Run the pipeline in extract mode and sync the locale catalogs')
  .option('-c, --config <path>', 'jsdoc/typedoc config file', 'jsdoc.json')
  .option('--dir <path>', 'locale artifacts directory')
  .option('--prune', 'permanently remove obsolete entries (default: soft-delete)', false)
  .option('--typedoc', 'use the TypeDoc pipeline instead of JSDoc', false)
  .action(async (o: { config: string; dir?: string; prune: boolean; typedoc: boolean }) => {
    try {
      const result = await runExtract({
        configPath: o.config,
        dir: o.dir,
        prune: o.prune,
        pipeline: o.typedoc ? 'typedoc' : 'jsdoc',
      });
      if (result.diagnostics.list.length > 0) {
        console.log(formatDiagnostics(result.diagnostics, { color: color() }));
      }
      // A config error (e.g. malformed `locales`) fails even though it yields
      // no locales — set the exit code BEFORE the no-locales bail.
      if (result.diagnostics.hasErrors()) process.exitCode = 1;
      if (!result.localized) {
        if (!result.diagnostics.hasErrors()) {
          console.log('aadesh: no locales configured — set `opts.locales` in your config.');
        }
        return;
      }
      console.log(formatExtractReport(result.reports));
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('validate')
  .description('Preflight the committed locale catalogs')
  .option('-c, --config <path>', 'jsdoc/typedoc config file', 'jsdoc.json')
  .option('--dir <path>', 'locale artifacts directory')
  .option('--strict', 'treat warnings (coverage gaps) as failures', false)
  .option('--typedoc', 'use the TypeDoc pipeline instead of JSDoc', false)
  .action(async (o: { config: string; dir?: string; strict: boolean; typedoc: boolean }) => {
    try {
      const result = await runValidate({
        configPath: o.config,
        dir: o.dir,
        strict: o.strict,
        pipeline: o.typedoc ? 'typedoc' : 'jsdoc',
      });
      if (result.diagnostics.list.length > 0) {
        console.log(formatDiagnostics(result.diagnostics, { color: color() }));
      }
      // No locales: a benign no-op UNLESS the config itself was malformed (errors).
      if (!result.localized && !result.diagnostics.hasErrors()) {
        console.log('aadesh: no locales configured — nothing to validate.');
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
  });

program
  .command('prompt')
  .description('Emit an LLM translation prompt for the new + stale keys')
  .option('-c, --config <path>', 'jsdoc/typedoc config file', 'jsdoc.json')
  .option('--dir <path>', 'locale artifacts directory')
  .option('--locale <code>', 'restrict to a single locale (default: all non-default)')
  .option('--chunk-size <n>', 'entries per prompt chunk', (v) => Number.parseInt(v, 10))
  .option('--typedoc', 'use the TypeDoc pipeline instead of JSDoc', false)
  .action(
    async (o: {
      config: string;
      dir?: string;
      locale?: string;
      chunkSize?: number;
      typedoc: boolean;
    }) => {
      try {
        const result = await runPrompt({
          configPath: o.config,
          dir: o.dir,
          locale: o.locale,
          chunkSize: o.chunkSize,
          pipeline: o.typedoc ? 'typedoc' : 'jsdoc',
        });
        if (result.diagnostics.list.length > 0) {
          console.log(formatDiagnostics(result.diagnostics, { color: color() }));
        }
        if (result.diagnostics.hasErrors()) process.exitCode = 1;
        if (!result.localized) {
          if (!result.diagnostics.hasErrors()) {
            console.log('aadesh: no locales configured — set `opts.locales` in your config.');
          }
          return;
        }
        for (const { locale, count, chunks } of result.prompts) {
          if (count === 0) {
            console.log(`# ${locale}: fully translated — nothing to prompt.\n`);
            continue;
          }
          console.log(`# ${locale}: ${count} entries to translate, ${chunks.length} chunk(s)\n`);
          chunks.forEach((chunk, i) => {
            if (i > 0) console.log('\n' + '─'.repeat(72) + '\n');
            console.log(chunk);
          });
          console.log('');
        }
      } catch (err) {
        console.error((err as Error).message);
        process.exitCode = 1;
      }
    }
  );

program.parseAsync().catch((err: unknown) => {
  console.error((err as Error).message);
  process.exitCode = 1;
});
