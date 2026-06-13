/**
 * `aadesh build` — render one site per locale (the plan §4, step 4b: "template +
 * filled catalogs → setu stamp → dwar render → per-locale sites"). For each
 * locale aadesh writes a build spec (the locale's API translations + its output
 * dir + base path) and spawns the pipeline in build mode; the theme stamps the
 * translations in and renders. The default locale renders unprefixed; others
 * under `/<locale>`.
 *
 * Scope of this chunk: API translations + per-locale output/base-path. Chrome
 * locale seeding, the language switcher, hreflang, and shared-asset dedup are
 * follow-on sub-chunks (they need dwar changes).
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BUILD_SPEC_VERSION, type DiagnosticBag } from '@clean-jsdoc-theme/utils';
import { DEFAULT_ARTIFACTS_DIR, readLocaleFile } from '../artifacts';
import { localeBuildPlan } from '../build-plan';
import { loadLocaleConfig, type Pipeline } from '../config';
import { BUILD_ENV_VAR, runPipeline, type PipelineRunner } from '../extract-manifest';
import { localeMessages } from '../locale';

export interface BuildOptions {
  configPath: string;
  /** Locale-artifacts directory (default `clean-jsdoc-theme-artifacts/locales`). */
  dir?: string;
  /** Restrict to a single locale code (default: every configured locale). */
  locale?: string;
  pipeline?: Pipeline;
  runner?: PipelineRunner;
}

/** One locale's build outcome. */
export interface LocaleBuildResult {
  locale: string;
  destination: string;
  ok: boolean;
}

export interface BuildResult {
  results: LocaleBuildResult[];
  diagnostics: DiagnosticBag;
  localized: boolean;
}

/**
 * Build every configured locale (or `--locale`). Returns per-locale results; the
 * CLI prints them and sets the exit code. Throws only on hard setup errors
 * (unreadable config, a pipeline that can't be spawned).
 */
export async function runBuild(opts: BuildOptions): Promise<BuildResult> {
  const pipeline = opts.pipeline ?? 'jsdoc';
  const { configPath, cwd, locales, destination, basePath, diagnostics } = await loadLocaleConfig(
    opts.configPath,
    pipeline
  );

  if (!locales) {
    return { results: [], diagnostics, localized: false };
  }
  if (!destination) {
    diagnostics.error('build/no-destination', 'no output directory found in the config.', {
      hint: pipeline === 'typedoc' ? 'set `out` in typedoc.json.' : 'set `opts.destination`.',
    });
    return { results: [], diagnostics, localized: true };
  }

  // Resolve the artifacts dir against the config's cwd (like `destination`), so
  // `-c sub/jsdoc.json` finds the catalogs next to the config, not next to cwd.
  const dir = resolve(cwd, opts.dir ?? DEFAULT_ARTIFACTS_DIR);
  const plan = localeBuildPlan({
    locales: locales.locales,
    defaultLocale: locales.defaultLocale,
    destination,
    basePath,
  }).filter((b) => !opts.locale || b.code === opts.locale);

  const specDir = await mkdtemp(join(tmpdir(), 'cjt-build-'));
  const results: LocaleBuildResult[] = [];
  try {
    for (const target of plan) {
      // The default locale stamps nothing (identity → live source / English
      // chrome via fallback); a non-default locale needs its catalog file for
      // the API + chrome translations.
      let apiMessages: Record<string, string> = {};
      let chromeMessages: Record<string, string> = {};
      if (!target.isDefault) {
        const file = await readLocaleFile(dir, target.code);
        if (!file) {
          diagnostics.error(
            'locale/missing-file',
            `${target.code}: no catalog — run \`aadesh extract\`.`,
            {
              path: target.code,
            }
          );
          continue;
        }
        const messages = localeMessages(file);
        apiMessages = messages.api;
        chromeMessages = messages.chrome;
      }

      const absDestination = resolve(cwd, target.destination);
      const specPath = join(specDir, `${target.code}.json`);
      await writeFile(
        specPath,
        JSON.stringify({
          version: BUILD_SPEC_VERSION,
          locale: target.code,
          defaultLocale: locales.defaultLocale,
          apiMessages,
          chromeMessages,
          destination: absDestination,
          basePath: target.basePath,
        }),
        'utf8'
      );

      const run = await runPipeline({
        pipeline,
        configPath,
        cwd,
        env: { ...process.env, [BUILD_ENV_VAR]: specPath },
        runner: opts.runner,
      });
      const ok = run.code === 0;
      if (!ok) {
        diagnostics.error(
          'build/pipeline-failed',
          `${target.code}: ${pipeline} exited ${run.code}.`,
          {
            path: target.code,
            ...(run.stderr ? { hint: run.stderr.trim().split('\n').slice(-1)[0] } : {}),
          }
        );
      }
      results.push({ locale: target.code, destination: absDestination, ok });
    }
  } finally {
    await rm(specDir, { recursive: true, force: true });
  }

  return { results, diagnostics, localized: true };
}
