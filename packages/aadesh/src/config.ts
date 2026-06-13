/**
 * Read locale configuration from the jsdoc/typedoc config file — the single
 * config source (the plan's decision 7: locales declared in jsdoc opts,
 * validated through utils). aadesh never owns its own config file.
 *
 * For JSDoc the theme opts live in the top-level `opts` block of `jsdoc.json`
 * (where `siteName`/`sectionOrder`/… already live); for TypeDoc they live in the
 * `cleanJsdocTheme` block. We read `locales` + `defaultLocale` from there and run
 * them through utils' `validateLocales`, so aadesh and the bridge agree.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DiagnosticBag, validateLocales, type ValidatedLocales } from '@clean-jsdoc-theme/utils';

/** Which pipeline produced the config (selects where the theme opts live). */
export type Pipeline = 'jsdoc' | 'typedoc';

export interface LoadedConfig {
  /** Absolute path of the config file. */
  configPath: string;
  /** Directory of the config — the cwd to spawn the pipeline in (relative paths). */
  cwd: string;
  /** Validated locale config, or `undefined` when localization is off. */
  locales: ValidatedLocales | undefined;
  /** The site output dir from the config (jsdoc `opts.destination` / typedoc `out`). */
  destination: string | undefined;
  /** The base-path prefix from the config (theme opts `basePath`). */
  basePath: string | undefined;
  /** Findings from reading + validating the config. */
  diagnostics: DiagnosticBag;
}

/** Pull the theme-opts object out of a parsed config, by pipeline. */
function themeOpts(config: Record<string, unknown>, pipeline: Pipeline): Record<string, unknown> {
  if (pipeline === 'typedoc') {
    const block = config.cleanJsdocTheme;
    return block && typeof block === 'object' ? (block as Record<string, unknown>) : {};
  }
  const opts = config.opts;
  return opts && typeof opts === 'object' ? (opts as Record<string, unknown>) : {};
}

/**
 * Load + validate the locale config from a JSON config file. Throws only on an
 * unreadable / non-JSON file (a hard, user-facing setup error); locale-shape
 * issues are collected into `diagnostics`, never thrown.
 */
export async function loadLocaleConfig(
  configPath: string,
  pipeline: Pipeline = 'jsdoc'
): Promise<LoadedConfig> {
  const abs = resolve(configPath);
  const diagnostics = new DiagnosticBag();

  let raw: string;
  try {
    raw = await readFile(abs, 'utf8');
  } catch {
    throw new Error(`aadesh: cannot read config file "${abs}".`);
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `aadesh: config "${abs}" is not valid JSON (a .js config isn't supported yet).`
    );
  }

  const opts = themeOpts(config, pipeline);
  const locales = validateLocales(opts.locales, opts.defaultLocale, diagnostics);

  // Output dir: jsdoc keeps it in `opts.destination`; typedoc uses a top-level
  // `out`. base path is a theme opt either way.
  const destination =
    pipeline === 'typedoc'
      ? typeof config.out === 'string'
        ? config.out
        : undefined
      : typeof opts.destination === 'string'
        ? opts.destination
        : undefined;
  const basePath = typeof opts.basePath === 'string' ? opts.basePath : undefined;

  return { configPath: abs, cwd: dirname(abs), locales, destination, basePath, diagnostics };
}
