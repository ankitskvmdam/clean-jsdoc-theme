/**
 * `aadesh extract` — run the pipeline in extract mode, then sync every locale
 * catalog against the regenerated template (the plan §4, step 1-2). First run
 * creates the files; later runs merge (new / stale / obsolete, soft-delete,
 * `--prune`). Pure orchestration over the tested `locale` core + the disk/spawn
 * layers; the pipeline `runner` is injectable for tests.
 */

import { resolve } from 'node:path';
import type { DiagnosticBag } from '@clean-jsdoc-theme/utils';
import { DEFAULT_ARTIFACTS_DIR, readLocaleFile, writeLocaleFile } from '../artifacts';
import { loadLocaleConfig, type Pipeline } from '../config';
import { extractManifest, type PipelineRunner } from '../extract-manifest';
import { buildTemplate, mergeLocale, type MergeReport } from '../locale';

export interface ExtractOptions {
  /** Path to the jsdoc/typedoc config (default `jsdoc.json`). */
  configPath: string;
  /** Locale-artifacts directory (default `clean-jsdoc-theme-artifacts/locales`). */
  dir?: string;
  /** Permanently remove obsolete entries instead of soft-deleting them. */
  prune?: boolean;
  /** Which pipeline to invoke. */
  pipeline?: Pipeline;
  /** Injected pipeline runner (tests); defaults to spawning the real binary. */
  runner?: PipelineRunner;
}

export interface ExtractResult {
  /** Per-locale merge reports, in configured order. */
  reports: MergeReport[];
  /** Config-reading diagnostics (locale-opt validation). */
  diagnostics: DiagnosticBag;
  /** Whether localization is configured at all. */
  localized: boolean;
}

/**
 * Run the extract/sync flow. Returns the per-locale reports + config diagnostics;
 * the CLI layer prints them and decides the exit code. Throws only on hard setup
 * errors (unreadable config, failed pipeline) — locale gaps are reported, not
 * thrown.
 */
export async function runExtract(opts: ExtractOptions): Promise<ExtractResult> {
  const pipeline = opts.pipeline ?? 'jsdoc';
  const { configPath, cwd, locales, diagnostics } = await loadLocaleConfig(
    opts.configPath,
    pipeline
  );

  if (!locales) {
    return { reports: [], diagnostics, localized: false };
  }

  const dir = resolve(cwd, opts.dir ?? DEFAULT_ARTIFACTS_DIR);
  // Use the ABSOLUTE config path: the pipeline runs with cwd = the config's dir,
  // so a relative path would double-resolve.
  const manifest = await extractManifest({ configPath, cwd, pipeline, runner: opts.runner });
  const template = buildTemplate(manifest.slots);

  const reports: MergeReport[] = [];
  for (const { code } of locales.locales) {
    const existing = await readLocaleFile(dir, code);
    const { file, report } = mergeLocale(template, existing, {
      locale: code,
      isDefault: code === locales.defaultLocale,
      prune: opts.prune,
    });
    await writeLocaleFile(dir, code, file);
    reports.push(report);
  }

  return { reports, diagnostics, localized: true };
}
