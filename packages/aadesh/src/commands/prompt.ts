/**
 * `aadesh prompt` — emit the LLM translation prompt for the new + stale keys of
 * each locale (the plan §4, step 3). Runs the pipeline to regenerate the
 * template, then for each (non-default, or `--locale`) catalog builds the chunked
 * prompts from its untranslated/stale entries.
 */

import { resolve } from 'node:path';
import type { DiagnosticBag } from '@clean-jsdoc-theme/utils';
import {
  DEFAULT_ARTIFACTS_DIR,
  promptsDirPath,
  readLocaleFile,
  writePromptFiles,
} from '../artifacts';
import { loadLocaleConfig, type Pipeline } from '../config';
import { extractManifest, type PipelineRunner } from '../extract-manifest';
import { buildTemplate } from '../locale';
import { buildPrompts, collectTranslatable } from '../prompt';

export interface PromptOptions {
  configPath: string;
  dir?: string;
  /** Restrict to a single locale code (default: every non-default locale). */
  locale?: string;
  /** Entries per chunk. */
  chunkSize?: number;
  pipeline?: Pipeline;
  runner?: PipelineRunner;
}

/** One locale's emitted prompts. */
export interface LocalePrompts {
  locale: string;
  /** Number of new+stale entries the prompts cover. */
  count: number;
  /** Self-contained prompt chunks (empty when the locale is fully translated). */
  chunks: string[];
  /** Absolute paths of the Markdown prompt files written for this locale, in order. */
  files: string[];
}

export interface PromptResult {
  prompts: LocalePrompts[];
  /** Directory the prompt files were written under (the CLI points the user here). */
  promptsDir?: string;
  diagnostics: DiagnosticBag;
  localized: boolean;
}

/**
 * Build the translation prompts and write each chunk to a Markdown file under
 * `<dir>/prompts/` so the user can copy/paste or upload it straight to an LLM.
 * Returns the per-locale chunks + written file paths; the CLI points the user at
 * them. Throws only on hard setup errors (unreadable config, failed pipeline).
 */
export async function runPrompt(opts: PromptOptions): Promise<PromptResult> {
  const pipeline = opts.pipeline ?? 'jsdoc';
  const { configPath, cwd, locales, diagnostics } = await loadLocaleConfig(
    opts.configPath,
    pipeline
  );

  if (!locales) {
    return { prompts: [], diagnostics, localized: false };
  }

  const dir = resolve(cwd, opts.dir ?? DEFAULT_ARTIFACTS_DIR);
  const manifest = await extractManifest({ configPath, cwd, pipeline, runner: opts.runner });
  const template = buildTemplate(manifest.slots);

  const targets = locales.locales.filter(
    (l) => l.code !== locales.defaultLocale && (!opts.locale || l.code === opts.locale)
  );
  if (opts.locale && !targets.some((l) => l.code === opts.locale)) {
    const isDefault = opts.locale === locales.defaultLocale;
    diagnostics.warning(
      'prompt/unknown-locale',
      isDefault
        ? `"${opts.locale}" is the default locale — it's the source text, nothing to translate.`
        : `"${opts.locale}" is not a configured locale.`,
      { path: opts.locale }
    );
  }

  const prompts: LocalePrompts[] = [];
  for (const { code, name } of targets) {
    const file = await readLocaleFile(dir, code);
    if (!file) {
      diagnostics.error(
        'locale/missing-file',
        `${code}: no catalog file — run \`aadesh extract\`.`,
        {
          path: code,
        }
      );
      continue;
    }
    const items = collectTranslatable(template, file);
    const chunks = buildPrompts({ locale: code, name, items, chunkSize: opts.chunkSize });
    const files = chunks.length > 0 ? await writePromptFiles(dir, code, chunks) : [];
    prompts.push({ locale: code, count: items.length, chunks, files });
  }

  return { prompts, promptsDir: promptsDirPath(dir), diagnostics, localized: true };
}
