/**
 * The interactive command registry — pure metadata that drives the menu, the
 * per-command option prompts, AND the equivalent CLI command saved to
 * package.json. One source of truth so the three never drift.
 *
 * Each option's `name` matches the corresponding `exec*` opts field (config /
 * dir / prune / strict / locale / chunkSize / typedoc), so collected answers map
 * straight onto a runner with no per-command glue. The `flag` is what's emitted
 * into the reconstructed argv.
 *
 * No I/O, no prompt library — pure, so argv reconstruction is unit-tested.
 */

/** An answer value collected for one option. */
export type OptionAnswer = string | number | boolean | undefined;

/** A free-text option (e.g. the config path). Omitted from argv when it equals `default` or is blank. */
export interface TextOption {
  kind: 'text';
  name: string;
  flag: string;
  message: string;
  /** Shown as the prompt default; an answer equal to it isn't emitted to argv. */
  default?: string;
}

/** A boolean flag (e.g. `--prune`). Defaults false; emitted to argv only when true. */
export interface ConfirmOption {
  kind: 'confirm';
  name: string;
  flag: string;
  message: string;
  default: boolean;
}

/** A numeric option (e.g. `--chunk-size`). Omitted from argv when left blank. */
export interface NumberOption {
  kind: 'number';
  name: string;
  flag: string;
  message: string;
}

export type OptionSpec = TextOption | ConfirmOption | NumberOption;

export interface InteractiveCommand {
  id: 'extract' | 'validate' | 'prompt' | 'build';
  /** Menu label. */
  title: string;
  /** One-line description shown for the focused menu item. */
  description: string;
  options: OptionSpec[];
}

/** Shared options every command takes. */
const config: TextOption = {
  kind: 'text',
  name: 'config',
  flag: '-c',
  message: 'Config file',
  default: 'jsdoc.json',
};
const dir: TextOption = {
  kind: 'text',
  name: 'dir',
  flag: '--dir',
  message: 'Locale artifacts directory (blank for the default)',
};
const typedoc: ConfirmOption = {
  kind: 'confirm',
  name: 'typedoc',
  flag: '--typedoc',
  message: 'Use the TypeDoc pipeline instead of JSDoc?',
  default: false,
};

/**
 * The commands, in menu order. `build` is last and framed as the recurring step
 * (the command you wire into your docs build + run periodically).
 */
export const COMMANDS: readonly InteractiveCommand[] = [
  {
    id: 'extract',
    title: 'extract',
    description: 'Run the pipeline and sync the per-locale catalogs (new/stale/obsolete keys).',
    options: [
      config,
      dir,
      {
        kind: 'confirm',
        name: 'prune',
        flag: '--prune',
        message: 'Permanently remove obsolete entries (--prune)?',
        default: false,
      },
      typedoc,
    ],
  },
  {
    id: 'prompt',
    title: 'prompt',
    description: 'Write an LLM translation prompt file per locale for the untranslated + stale keys.',
    options: [
      config,
      dir,
      {
        kind: 'text',
        name: 'locale',
        flag: '--locale',
        message: 'Restrict to a single locale (blank for all)',
      },
      {
        kind: 'number',
        name: 'chunkSize',
        flag: '--chunk-size',
        message: 'Entries per prompt chunk (blank for the default)',
      },
      typedoc,
    ],
  },
  {
    id: 'validate',
    title: 'validate',
    description: 'Preflight the committed catalogs (gaps warn, malformations error).',
    options: [
      config,
      dir,
      {
        kind: 'confirm',
        name: 'strict',
        flag: '--strict',
        message: 'Treat coverage gaps as failures (--strict)?',
        default: false,
      },
      typedoc,
    ],
  },
  {
    id: 'build',
    title: 'build',
    description: 'Render one site per locale — the command to wire in + run periodically.',
    options: [
      config,
      dir,
      {
        kind: 'text',
        name: 'locale',
        flag: '--locale',
        message: 'Build a single locale (blank for all)',
      },
      typedoc,
    ],
  },
];

/** Look up a command by id. */
export function findCommand(id: string): InteractiveCommand | undefined {
  return COMMANDS.find((c) => c.id === id);
}

/** A non-empty, trimmed string, or undefined. */
function cleanText(value: OptionAnswer): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Reconstruct the CLI argv for a command from collected answers — the array a
 * user could pass to `clean-jsdoc`. Defaults and blanks are omitted so the saved
 * command stays minimal: a text option equal to its default (or blank) is
 * dropped, a confirm is emitted only when true, a number only when provided.
 */
export function toArgv(command: InteractiveCommand, answers: Record<string, OptionAnswer>): string[] {
  const argv: string[] = [command.id];
  for (const opt of command.options) {
    const value = answers[opt.name];
    if (opt.kind === 'confirm') {
      if (value === true) argv.push(opt.flag);
    } else if (opt.kind === 'number') {
      if (typeof value === 'number' && Number.isFinite(value)) argv.push(opt.flag, String(value));
    } else {
      const text = cleanText(value);
      if (text !== undefined && text !== opt.default) argv.push(opt.flag, text);
    }
  }
  return argv;
}

/** Quote a single argv part for a shell command string when it contains whitespace. */
function quote(part: string): string {
  return /\s/.test(part) ? `"${part}"` : part;
}

/** The full saved command string, e.g. `clean-jsdoc extract --prune`. */
export function toCommandString(argv: readonly string[]): string {
  return ['clean-jsdoc', ...argv].map(quote).join(' ');
}
