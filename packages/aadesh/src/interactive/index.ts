/**
 * The interactive front-end (`clean-jsdoc` with no subcommand): a small welcome
 * banner, then a looped command picker. Pick a command (its description shows for
 * the focused item), answer its options (defaults pre-filled), it runs, then you
 * can save the equivalent command to package.json. Loops until you choose Exit.
 *
 * This module is the thin glue over the pure pieces — the {@link COMMANDS}
 * registry, the {@link toArgv}/{@link toCommandString} reconstruction, the
 * {@link writeScript} saver, and the shared `exec*` runners — so the testable
 * logic lives elsewhere and this file is mostly prompts.
 */

import { confirm, input, number, select } from '@inquirer/prompts';
import { execBuild, execExtract, execPrompt, execValidate } from '../runners';
import {
  COMMANDS,
  toArgv,
  toCommandString,
  type InteractiveCommand,
  type OptionAnswer,
} from './registry';
import { writeScript } from './package-json';

/** Project links shown in the banner. */
const LINKS = {
  docs: 'https://ankdev.me/clean-jsdoc-theme/theme/jsdoc-getting-started',
  github: 'https://github.com/ankitskvmdam/clean-jsdoc-theme',
  npm: 'https://www.npmjs.com/package/clean-jsdoc-theme',
};

const useColor = (): boolean => Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const wrap = (open: number, s: string): string => (useColor() ? `\x1b[${open}m${s}\x1b[0m` : s);
const bold = (s: string): string => wrap(1, s);
const dim = (s: string): string => wrap(2, s);
const cyan = (s: string): string => wrap(36, s);

/** Print the (compact) welcome banner: title + the doc/github/npm links. */
function printWelcome(): void {
  console.log();
  console.log(`  ${bold('clean-jsdoc-theme')} ${dim('· localization CLI')}`);
  console.log(`  ${dim('Docs  ')} ${cyan(LINKS.docs)}`);
  console.log(`  ${dim('GitHub')} ${cyan(LINKS.github)}`);
  console.log(`  ${dim('npm   ')} ${cyan(LINKS.npm)}`);
  console.log();
}

/** Prompt every option for `command`, returning cleaned answers (blank text → undefined). */
async function promptOptions(command: InteractiveCommand): Promise<Record<string, OptionAnswer>> {
  const answers: Record<string, OptionAnswer> = {};
  for (const opt of command.options) {
    if (opt.kind === 'confirm') {
      answers[opt.name] = await confirm({ message: opt.message, default: opt.default });
    } else if (opt.kind === 'number') {
      answers[opt.name] = await number({ message: opt.message });
    } else {
      const value = (await input({ message: opt.message, default: opt.default })).trim();
      // Blank with a default → the default; blank without one → omitted.
      answers[opt.name] = value.length > 0 ? value : opt.default;
    }
  }
  return answers;
}

/** Run the chosen command through its shared runner. */
async function executeCommand(
  command: InteractiveCommand,
  a: Record<string, OptionAnswer>
): Promise<void> {
  const config = typeof a.config === 'string' && a.config ? a.config : 'jsdoc.json';
  const dir = typeof a.dir === 'string' ? a.dir : undefined;
  const locale = typeof a.locale === 'string' ? a.locale : undefined;
  const typedoc = a.typedoc === true;
  switch (command.id) {
    case 'extract':
      return execExtract({ config, dir, prune: a.prune === true, typedoc });
    case 'validate':
      return execValidate({ config, dir, strict: a.strict === true, typedoc });
    case 'prompt':
      return execPrompt({
        config,
        dir,
        locale,
        chunkSize: typeof a.chunkSize === 'number' ? a.chunkSize : undefined,
        typedoc,
      });
    case 'build':
      return execBuild({ config, dir, locale, typedoc });
  }
}

/** After a run, offer to persist the equivalent command to package.json. */
async function offerToSave(command: InteractiveCommand, commandString: string): Promise<void> {
  const save = await confirm({
    message: `Save this as a package.json script? (${dim(commandString)})`,
    default: false,
  });
  if (!save) return;

  // Loop until a free key is given (or the user backs out with a blank name).
  for (;;) {
    const key = (
      await input({ message: 'Script name', default: `i18n:${command.id}` })
    ).trim();
    if (!key) {
      console.log(dim('  Skipped — no script name given.'));
      return;
    }
    try {
      const result = await writeScript(process.cwd(), key, commandString);
      if (result.status === 'added') {
        console.log(`  ${bold('✓')} Added ${cyan(`"${key}"`)} — run it with ${cyan(`npm run ${key}`)}.`);
        return;
      }
      console.log(dim(`  "${key}" already exists in package.json — pick another name.`));
    } catch (err) {
      console.error(`  ${(err as Error).message}`);
      return;
    }
  }
}

/** Whether an inquirer error is the user pressing Ctrl+C / Esc to abort a prompt. */
function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'ExitPromptError';
}

/**
 * Run the interactive session: banner, then loop the command picker until Exit
 * (or Ctrl+C). Each iteration: pick → prompt options → run → offer to save.
 */
export async function runInteractive(): Promise<void> {
  printWelcome();
  try {
    for (;;) {
      // Top-level menu: the `i18n` group + the ungrouped top-level commands
      // (`build`). Mirrors the CLI structure (`clean-jsdoc i18n …` vs `build`).
      const top = await select({
        message: 'What would you like to do?',
        choices: [
          {
            name: 'i18n',
            value: 'i18n',
            description: 'Localization authoring: extract, prompt, validate.',
          },
          ...COMMANDS.filter((c) => !c.group).map((c) => ({
            name: c.title,
            value: c.id,
            description: c.description,
          })),
          { name: 'Exit', value: 'exit', description: 'Leave the interactive CLI.' },
        ],
      });
      if (top === 'exit') return;

      let command: InteractiveCommand | undefined;
      if (top === 'i18n') {
        // Drill into the i18n group; `Back` returns to the top-level menu.
        const sub = await select({
          message: 'i18n — which step?',
          choices: [
            ...COMMANDS.filter((c) => c.group === 'i18n').map((c) => ({
              name: c.title,
              value: c.id,
              description: c.description,
            })),
            { name: 'Back', value: 'back', description: 'Return to the main menu.' },
          ],
        });
        if (sub === 'back') continue;
        command = COMMANDS.find((c) => c.id === sub);
      } else {
        command = COMMANDS.find((c) => c.id === top);
      }
      if (!command) continue;

      const answers = await promptOptions(command);
      const argv = toArgv(command, answers);
      console.log(`\n  ${dim('Running')} ${cyan(toCommandString(argv))}\n`);
      await executeCommand(command, answers);
      console.log();
      await offerToSave(command, toCommandString(argv));
      console.log();
    }
  } catch (err) {
    if (isAbort(err)) {
      console.log(dim('\nAborted.'));
      return;
    }
    throw err;
  }
}
