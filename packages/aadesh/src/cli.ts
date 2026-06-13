#!/usr/bin/env node
/**
 * `clean-jsdoc` — the aadesh localization CLI. Flag-driven so it runs headless in
 * CI (the plan's "flag equivalent for every prompt"); interactive prompts are a
 * later addition layered on top. Subcommands `extract` + `validate` orchestrate
 * the tested pure core; the heavy `build` lands in a later chunk.
 */

import { Command } from 'commander';
import { formatDiagnostics } from '@clean-jsdoc-theme/utils';
import { runExtract } from './commands/extract';
import { runValidate } from './commands/validate';
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
      if (!result.localized) {
        console.log('aadesh: no locales configured — set `opts.locales` in your config.');
        return;
      }
      console.log(formatExtractReport(result.reports));
      if (result.diagnostics.hasErrors()) process.exitCode = 1;
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
      if (!result.localized) {
        console.log('aadesh: no locales configured — nothing to validate.');
        return;
      }
      if (result.diagnostics.list.length > 0) {
        console.log(formatDiagnostics(result.diagnostics, { color: color() }));
      }
      console.log(
        result.ok ? 'Localization validation passed.' : 'Localization validation failed.'
      );
      if (!result.ok) process.exitCode = 1;
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program.parseAsync().catch((err: unknown) => {
  console.error((err as Error).message);
  process.exitCode = 1;
});
