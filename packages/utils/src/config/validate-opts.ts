/**
 * Orchestrator — runs every field validator into a single {@link DiagnosticBag}
 * and returns clean, normalized option values for the bridge. This replaces the
 * scattered `normalize*` / `prepareSiteName` shape-checks: the bridge makes one
 * `validateThemeOpts` call, logs the bag, then (in strict mode) fails on errors.
 *
 * Pure + node-free. The only networked dependency — Google Fonts existence —
 * arrives as the optional `fontResolver`; without it, font checks are skipped
 * gracefully and the build proceeds.
 */

import type { LlmsTxtConfig } from '../site/llms';
import type { SiteName } from '../site/site-name';
import { DiagnosticBag } from './diagnostics';
import { validateFonts, type FontResolver, type ValidatedFonts } from './fonts';
import { validateLocales, type ValidatedLocales } from './locales';
import { THEME_OPT_KEYS } from './opts-schema';
import { validateLlmsTxt } from './llms-txt';
import { validateSiteName } from './site-name';
import { validateSiteUrl } from './site-url';
import { suggestKey } from './suggest';
import { checkV4Options, v4OptionKeys, V4_TOP_LEVEL_CODE } from './v4-options';

/** How `validateThemeOpts` treats keys not in {@link THEME_OPT_KEYS}. */
export type UnknownKeyPolicy = 'suggest-typos' | 'warn-all' | 'ignore';

/** Input to {@link validateThemeOpts}. */
export interface ValidateThemeOptsInput {
  /** Raw opts (JSDoc's flat `env.opts`, or a namespaced typedoc block). */
  opts: Record<string, unknown>;
  /**
   * Google Fonts existence resolver (see `createGoogleFontResolver`). Omit to
   * skip the live `heading`/`body` check (shape validation still runs).
   */
  fontResolver?: FontResolver;
  /**
   * Unknown-key handling. `'suggest-typos'` (default) only flags keys within an
   * edit-distance of a known theme key — safe for JSDoc's shared flat namespace.
   * `'warn-all'` flags every unrecognized key — for a dedicated namespaced block.
   * `'ignore'` flags nothing.
   */
  unknownKeyPolicy?: UnknownKeyPolicy;
  /**
   * Keys that are valid in this namespace but aren't theme opts (e.g. JSDoc's
   * own `destination`/`template`/…). Never flagged, regardless of policy.
   */
  knownNonThemeKeys?: ReadonlySet<string>;
  /**
   * Flag leftover v4 options (an `opts.theme_opts` block, top-level v4 names
   * like `base_url`) with a migration hint, regardless of `unknownKeyPolicy`.
   * For the JSDoc bridge, whose users may come from v4; the TypeDoc plugin never
   * had v4 options, so it leaves this off. Default `false`.
   */
  checkV4Options?: boolean;
  /**
   * Strict mode: every `warning` this call collects is reported as an `error`,
   * so the caller's `hasErrors()` check fails the build — except top-level v4
   * option names, which may belong to another JSDoc plugin and stay warnings.
   * Default `false`.
   */
  strict?: boolean;
}

/**
 * Clean, defaulted values for the bridge to consume directly. Only the keys
 * Phase 2 validates richly (`siteName`, `fonts`) are reshaped; the rest pass
 * through after the bridge's own `normalize*` step (Phase 4 folds those in).
 * `undefined` means "fall back to the theme default for this key".
 */
export interface NormalizedThemeOpts {
  /** Validated site identity (text or logo set), or `undefined` if unusable/omitted. */
  siteName: SiteName | undefined;
  /** Validated font overrides — a subset of `{ heading, body, mono }`. */
  fonts: ValidatedFonts;
  /** Validated locale config, or `undefined` when localization is off. */
  locales: ValidatedLocales | undefined;
  /** Validated public site URL, or `undefined` when unset/unusable. */
  siteUrl: string | undefined;
  /** Resolved `llmsTxt` config, or `undefined` when the feature is off. */
  llmsTxt: LlmsTxtConfig | undefined;
}

/** Result of {@link validateThemeOpts}. */
export interface ValidateThemeOptsResult {
  /** Normalized, defaulted values for the bridge. */
  value: NormalizedThemeOpts;
  /** Every finding from every validator, in one ordered bag. */
  diagnostics: DiagnosticBag;
}

/**
 * Apply the unknown-key policy: for each opt key that is neither a recognized
 * theme key nor a declared non-theme key, emit a `warning`. `'suggest-typos'`
 * only warns when the key is a near-miss of a known theme key (and attaches the
 * "did you mean" hint); `'warn-all'` warns on every leftover; `'ignore'` skips.
 */
function checkUnknownKeys(
  opts: Record<string, unknown>,
  bag: DiagnosticBag,
  policy: UnknownKeyPolicy,
  knownNonThemeKeys: ReadonlySet<string>
): void {
  if (policy === 'ignore') return;

  const themeKeys = new Set<string>(THEME_OPT_KEYS);
  for (const key of Object.keys(opts)) {
    if (themeKeys.has(key) || knownNonThemeKeys.has(key)) continue;

    if (policy === 'warn-all') {
      const guess = suggestKey(key, THEME_OPT_KEYS);
      bag.warning('opts/unknown-key', `unknown option "${key}".`, {
        ...(guess ? { hint: `did you mean \`${guess}\`?` } : {}),
        path: key,
      });
      continue;
    }

    // 'suggest-typos': only flag keys close enough to a known theme key.
    const guess = suggestKey(key, THEME_OPT_KEYS);
    if (guess) {
      bag.warning('opts/unknown-key', `unknown option "${key}".`, {
        hint: `did you mean \`${guess}\`?`,
        path: key,
      });
    }
  }
}

/**
 * Validate a raw opts object. Runs `siteName` + `fonts` validators (the latter
 * does the async Google Fonts check when a resolver is supplied) and the
 * unknown-key policy, all into one bag, then returns normalized values. Never
 * throws — with `strict` the warnings come back as errors, and failing the
 * build is the caller's job via `result.diagnostics.hasErrors()`.
 */
export async function validateThemeOpts(
  input: ValidateThemeOptsInput
): Promise<ValidateThemeOptsResult> {
  const { opts, fontResolver } = input;
  const policy = input.unknownKeyPolicy ?? 'suggest-typos';
  const knownNonThemeKeys = input.knownNonThemeKeys ?? new Set<string>();

  const diagnostics = new DiagnosticBag();

  const siteName = validateSiteName(opts.siteName, diagnostics);
  const fonts = await validateFonts(opts.fonts, diagnostics, fontResolver);
  const locales = validateLocales(opts.locales, opts.defaultLocale, diagnostics);
  // siteUrl feeds both sitemap.xml and llms.txt; llmsTxt needs it to be usable.
  const siteUrl = validateSiteUrl(opts.siteUrl, opts.basePath, diagnostics);
  const llmsTxt = validateLlmsTxt(opts.llmsTxt, siteUrl, diagnostics);

  if (input.checkV4Options) {
    const themeKeys = new Set<string>(THEME_OPT_KEYS);
    checkV4Options(opts, diagnostics, themeKeys);
    // Already reported with a migration hint — keep the unknown-key pass from
    // adding a second, vaguer diagnostic for the same key.
    const handled = v4OptionKeys(themeKeys);
    for (const key of knownNonThemeKeys) handled.add(key);
    checkUnknownKeys(opts, diagnostics, policy, handled);
  } else {
    checkUnknownKeys(opts, diagnostics, policy, knownNonThemeKeys);
  }

  if (input.strict) diagnostics.escalateWarnings((d) => d.code === V4_TOP_LEVEL_CODE);

  return { value: { siteName, fonts, locales, siteUrl, llmsTxt }, diagnostics };
}
