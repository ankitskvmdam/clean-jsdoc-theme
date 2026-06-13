/**
 * `aadesh validate` — preflight the committed locale catalogs against the
 * regenerated template (the plan §5). Posture: resilient by default, `--strict`
 * escalates. The rule of thumb — **a gap is a warning, a malformation is an
 * error**:
 *  - missing/empty keys → a per-locale coverage warning (not N warnings);
 *  - a key not in the template → error (likely a hand-added/renamed key);
 *  - a broken markdown slot ({@link}/fence/brace) → error, against the key;
 *  - a dropped/added `{var}` token vs the source → error, against the key.
 *
 * The default locale is the skeleton (source text), so it isn't validated as a
 * translation. Reuses bhasha's validation primitives so findings format + gate
 * exactly like opts validation.
 */

import { DiagnosticBag, suggestKey } from '@clean-jsdoc-theme/utils';
import { lintSlotMarkdown, validateTokenParity } from '@clean-jsdoc-theme/bhasha';
import { readLocaleFile } from '../artifacts';
import { DEFAULT_ARTIFACTS_DIR } from '../artifacts';
import { loadLocaleConfig, type Pipeline } from '../config';
import { extractManifest, type PipelineRunner } from '../extract-manifest';
import { buildTemplate, flattenLocaleFile, type Template } from '../locale';

export interface ValidateOptions {
  configPath: string;
  dir?: string;
  /** Escalate warnings to failures. */
  strict?: boolean;
  pipeline?: Pipeline;
  runner?: PipelineRunner;
}

export interface LocaleCoverage {
  locale: string;
  translated: number;
  total: number;
}

export interface ValidateResult {
  diagnostics: DiagnosticBag;
  coverage: LocaleCoverage[];
  /** Whether localization is configured at all. */
  localized: boolean;
  /** Pass/fail: no errors (and, under `strict`, no warnings either). */
  ok: boolean;
}

/** Validate one locale file's translations against the template into `bag`. */
function validateLocaleFile(
  template: Template,
  flat: Map<string, { value: string; hash: string }>,
  locale: string,
  bag: DiagnosticBag
): LocaleCoverage {
  const sourceByKey = new Map(template.map((t) => [t.key, t.source]));
  const templateKeys = new Set(sourceByKey.keys());

  let translated = 0;
  for (const [key, entry] of flat) {
    // Unknown key (not in the template) — likely hand-added or stale-not-pruned.
    if (!templateKeys.has(key)) {
      const guess = suggestKey(key, [...templateKeys]);
      bag.error('locale/unknown-key', `${locale}: unknown key "${key}".`, {
        path: `${locale}.${key}`,
        ...(guess ? { hint: `did you mean "${guess}"?` } : {}),
      });
      continue;
    }
    if (entry.value === '') continue; // untranslated → covered by the coverage warning
    translated++;
    // Malformations are errors, reported against the key.
    lintSlotMarkdown(entry.value, `${locale}.${key}`, bag);
    const source = sourceByKey.get(key);
    if (source != null) validateTokenParity(source, entry.value, `${locale}.${key}`, bag);
  }

  const total = templateKeys.size;
  const missing = total - translated;
  if (missing > 0) {
    bag.warning(
      'locale/coverage',
      `${locale}: ${translated}/${total} translated (${missing} fall back to the default).`,
      { path: locale }
    );
  }
  return { locale, translated, total };
}

/**
 * Run the validate preflight. Returns diagnostics + per-locale coverage; the CLI
 * prints them and exits non-zero when `ok` is false. Throws only on hard setup
 * errors (unreadable config, failed pipeline).
 */
export async function runValidate(opts: ValidateOptions): Promise<ValidateResult> {
  const pipeline = opts.pipeline ?? 'jsdoc';
  const { configPath, cwd, locales, diagnostics } = await loadLocaleConfig(
    opts.configPath,
    pipeline
  );

  if (!locales) {
    return { diagnostics, coverage: [], localized: false, ok: true };
  }

  const dir = opts.dir ?? DEFAULT_ARTIFACTS_DIR;
  // Absolute config path — the pipeline runs with cwd = the config's dir.
  const manifest = await extractManifest({ configPath, cwd, pipeline, runner: opts.runner });
  const template = buildTemplate(manifest.slots);

  const coverage: LocaleCoverage[] = [];
  for (const { code } of locales.locales) {
    if (code === locales.defaultLocale) continue; // skeleton — not a translation
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
    coverage.push(validateLocaleFile(template, flattenLocaleFile(file), code, diagnostics));
  }

  const hasErrors = diagnostics.hasErrors();
  const hasWarnings = diagnostics.list.some((d) => d.level === 'warning');
  const ok = opts.strict ? !hasErrors && !hasWarnings : !hasErrors;

  return { diagnostics, coverage, localized: true, ok };
}
