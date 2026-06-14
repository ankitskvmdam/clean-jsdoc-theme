/**
 * `aadesh build` — render one site per locale (the plan §4, step 4b: "template +
 * filled catalogs → setu stamp → dwar render → per-locale sites"). For each
 * locale aadesh writes a build spec (the locale's API translations + its output
 * dir + base path) and spawns the pipeline in build mode; the theme stamps the
 * translations in and renders. The default locale renders unprefixed; others
 * under `/<locale>`.
 *
 * Covers API + chrome translations, per-locale output/base-path, and the
 * language switcher (the spec carries siteBasePath + the locale list). hreflang
 * tags and shared-asset content-hash dedup are the remaining sub-chunks.
 *
 * **Prose track (home page).** `opts.readme` reaches the bridge already rendered
 * to HTML, so the theme can't swap it per locale — the file must be chosen before
 * the pipeline runs. So for each locale we look for a sibling `README.<locale>.md`
 * next to the configured README and, when present, pass `--readme <that>` to the
 * spawned pipeline (jsdoc `-R/--readme` / typedoc `--readme` — a CLI flag wins
 * over the config). Missing variant → the configured README (the default-locale
 * home). Whole-file translation; no bridge change needed.
 *
 * **Prose track (multi-page docs).** Unlike the README, `opts.docs` is a directory
 * the bridge reads itself, so it's overridden through the build spec rather than a
 * CLI flag: a non-default locale with a sibling `docs.<locale>/` directory has its
 * absolute path passed as `BuildSpec.docsDir`, and the bridge overlays those files
 * over the default docs by path (a translated page wins; an untranslated one falls
 * back to the default). Partial translation is fine.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import {
  BUILD_SPEC_VERSION,
  normalizeBasePath,
  type DiagnosticBag,
} from '@clean-jsdoc-theme/utils';
import { DEFAULT_ARTIFACTS_DIR, readLocaleFile } from '../artifacts';
import { localeBuildPlan } from '../build-plan';
import { loadLocaleConfig, type Pipeline } from '../config';
import { BUILD_ENV_VAR, runPipeline, type PipelineRunner } from '../extract-manifest';
import { localeMessages } from '../locale';

/**
 * The per-locale README variant path: insert `.<locale>` before the extension
 * (`docs/README.md` + `ja` → `docs/README.ja.md`). `readmeAbs` is the resolved
 * configured README; the variant sits in the same directory.
 */
function localeReadmePath(readmeAbs: string, locale: string): string {
  const ext = extname(readmeAbs);
  return join(dirname(readmeAbs), `${basename(readmeAbs, ext)}.${locale}${ext}`);
}

/**
 * The per-locale docs-overlay directory: a sibling of the configured docs dir
 * with `.<locale>` appended (`docs` + `ja` → `docs.ja`). The bridge overlays its
 * files over the default docs by path, so a locale only needs to translate the
 * pages it has — the rest fall back to the default docs.
 */
function localeDocsPath(docsAbs: string, locale: string): string {
  return `${docsAbs}.${locale}`;
}

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
  const { configPath, cwd, locales, destination, basePath, readme, docs, diagnostics } =
    await loadLocaleConfig(opts.configPath, pipeline);

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

  // The un-prefixed site base (the default locale's base) — for switcher URLs.
  const siteBase = normalizeBasePath(basePath);
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

      // Prose track (multi-page docs): a non-default locale with a sibling
      // `docs.<locale>/` overlay dir has its docs translated per-file; the bridge
      // overlays them over the default docs. Default locale + no-overlay locales
      // render the default docs. (Per-file fallback inside an overlay — a locale
      // dir missing one page — is silent: the bridge stays pure/log-free and
      // aadesh can't see the dir's contents from here; only a wholly-absent
      // overlay is reported below.)
      let docsDir: string | undefined;
      if (docs && !target.isDefault) {
        const overlay = localeDocsPath(resolve(cwd, docs), target.code);
        if (existsSync(overlay)) {
          docsDir = overlay;
        } else {
          diagnostics.info(
            'docs/overlay-fallback',
            `${target.code}: no docs.${target.code}/ — the docs render in the default language.`,
            { path: target.code }
          );
        }
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
          // The un-prefixed site base (same for all locales) + the locale list
          // feed the language switcher's cross-locale URLs.
          siteBasePath: siteBase,
          locales: locales.locales,
          ...(docsDir ? { docsDir } : {}),
        }),
        'utf8'
      );

      // Prose track: localize the home page by overriding the README when a
      // `README.<locale>.md` sits next to the configured one. The DEFAULT locale
      // always uses the configured README (the canonical source home), so it's
      // never overridden. A non-default locale with no variant falls back to that
      // source home — reported (info) so the gap is visible, not silent.
      let extraArgs: string[] | undefined;
      if (readme && !target.isDefault) {
        const variant = localeReadmePath(resolve(cwd, readme), target.code);
        if (existsSync(variant)) {
          extraArgs = ['--readme', variant];
        } else {
          diagnostics.info(
            'home/readme-fallback',
            `${target.code}: no README.${target.code}.md — the home page uses the default README.`,
            { path: target.code }
          );
        }
      }

      const run = await runPipeline({
        pipeline,
        configPath,
        cwd,
        env: { ...process.env, [BUILD_ENV_VAR]: specPath },
        extraArgs,
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
