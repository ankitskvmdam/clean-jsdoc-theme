#!/usr/bin/env node
/**
 * `clean-jsdoc` — the aadesh localization CLI. Two front-ends over ONE execution
 * core (`runners.ts`):
 *
 *  - **Flag-driven** subcommands (`extract`/`validate`/`prompt`/`build`) — run
 *    headless in CI (the plan's "flag equivalent for every prompt").
 *  - **Interactive** menu — when invoked with NO subcommand (`clean-jsdoc`), a
 *    welcome screen + a looped command picker that asks each command's options,
 *    runs it, and offers to save the equivalent command to package.json.
 */

import { Command } from 'commander';
import { execExtract, execValidate, execPrompt, execBuild } from './runners';
import { runInteractive } from './interactive';

const program = new Command();
program.name('clean-jsdoc').description('clean-jsdoc-theme localization CLI');

program
  .command('extract')
  .description('Run the pipeline in extract mode and sync the locale catalogs')
  .option('-c, --config <path>', 'jsdoc/typedoc config file', 'jsdoc.json')
  .option('--dir <path>', 'locale artifacts directory')
  .option('--prune', 'permanently remove obsolete entries (default: soft-delete)', false)
  .option('--typedoc', 'use the TypeDoc pipeline instead of JSDoc', false)
  .action((o: { config: string; dir?: string; prune: boolean; typedoc: boolean }) =>
    execExtract(o)
  );

program
  .command('validate')
  .description('Preflight the committed locale catalogs')
  .option('-c, --config <path>', 'jsdoc/typedoc config file', 'jsdoc.json')
  .option('--dir <path>', 'locale artifacts directory')
  .option('--strict', 'treat warnings (coverage gaps) as failures', false)
  .option('--typedoc', 'use the TypeDoc pipeline instead of JSDoc', false)
  .action((o: { config: string; dir?: string; strict: boolean; typedoc: boolean }) =>
    execValidate(o)
  );

program
  .command('prompt')
  .description('Emit an LLM translation prompt for the new + stale keys')
  .option('-c, --config <path>', 'jsdoc/typedoc config file', 'jsdoc.json')
  .option('--dir <path>', 'locale artifacts directory')
  .option('--locale <code>', 'restrict to a single locale (default: all non-default)')
  .option('--chunk-size <n>', 'entries per prompt chunk', (v) => Number.parseInt(v, 10))
  .option('--typedoc', 'use the TypeDoc pipeline instead of JSDoc', false)
  .action(
    (o: { config: string; dir?: string; locale?: string; chunkSize?: number; typedoc: boolean }) =>
      execPrompt(o)
  );

program
  .command('build')
  .description('Render one site per locale (default unprefixed, others under /<locale>)')
  .option('-c, --config <path>', 'jsdoc/typedoc config file', 'jsdoc.json')
  .option('--dir <path>', 'locale artifacts directory')
  .option('--locale <code>', 'build a single locale (default: all configured)')
  .option('--typedoc', 'use the TypeDoc pipeline instead of JSDoc', false)
  .action((o: { config: string; dir?: string; locale?: string; typedoc: boolean }) => execBuild(o));

// No subcommand → the interactive menu (the welcome screen + command picker).
// Any args (a subcommand or `--help`) flow through commander as usual.
if (process.argv.slice(2).length === 0) {
  runInteractive().catch((err: unknown) => {
    console.error((err as Error).message);
    process.exitCode = 1;
  });
} else {
  program.parseAsync().catch((err: unknown) => {
    console.error((err as Error).message);
    process.exitCode = 1;
  });
}
