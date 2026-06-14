/**
 * Validation primitives for catalogs and slot values.
 *
 * These reuse the theme's existing diagnostics spine (`DiagnosticBag`,
 * `suggestKey` from `@clean-jsdoc-theme/utils/config`) rather than re-inventing
 * a reporter — so localization findings format and gate exactly like opts
 * validation. Each primitive **appends to a bag** (creating one if none is
 * passed) and reports **against the key**, so a downstream `--strict` build can
 * fail fast on the offending entry before a full N-locale render.
 *
 * Posture mirrors `opts.strict`: a *gap* (missing translation) is a warning; a
 * *malformation* (broken markdown, dropped `{var}`, unknown key) is an error.
 *
 * Pure + browser-safe — `utils/config` is itself node-free.
 */

import { DiagnosticBag, suggestKey } from '@clean-jsdoc-theme/utils';
import { interpolationTokens } from './interpolate';
import type { Messages } from './catalog';

/**
 * Catalog shape check against a reference key set (the EN catalog for chrome, or
 * the freshly-extracted template for API). A key present in `reference` but
 * missing/empty in `messages` is a **gap** (warning, falls back); a key present
 * in `messages` but absent from `reference` is **unknown** (error — likely a
 * stale/renamed key; obsolete keys should have been moved to `_obsolete` by the
 * caller before validating). Unknown keys get a near-miss "did you mean?" hint.
 */
export function validateCatalogShape(
  messages: Messages,
  reference: Messages,
  bag: DiagnosticBag = new DiagnosticBag()
): DiagnosticBag {
  const referenceKeys = Object.keys(reference);

  for (const key of referenceKeys) {
    const value = messages[key];
    if (value == null || value === '') {
      bag.warning('bhasha/missing-key', `No translation for "${key}"`, {
        path: key,
        hint: 'Falls back to the default locale.',
      });
    }
  }

  for (const key of Object.keys(messages)) {
    if (!(key in reference)) {
      const suggestion = suggestKey(key, referenceKeys);
      bag.error('bhasha/unknown-key', `Unknown catalog key "${key}"`, {
        path: key,
        hint: suggestion
          ? `Did you mean "${suggestion}"?`
          : 'Not in the reference catalog — likely renamed or removed.',
      });
    }
  }

  return bag;
}

/**
 * Coverage of `messages` against a reference key set: how many reference keys
 * have a non-empty value. Drives the "fr: 80% translated" report line.
 */
export function catalogCoverage(
  messages: Messages,
  reference: Messages
): { translated: number; total: number; ratio: number } {
  const keys = Object.keys(reference);
  const translated = keys.filter((k) => {
    const v = messages[k];
    return v != null && v !== '';
  }).length;
  const total = keys.length;
  return { translated, total, ratio: total === 0 ? 1 : translated / total };
}

/**
 * Lint a translated slot value for MDX-hostile malformations a translator might
 * introduce. A broken slot would abort the page compile in dwar (it skips +
 * reports), so we catch it here, named against the key. Checks:
 *   - code-fence parity (an odd number of ``` ``` ``` markers);
 *   - `{@link …}` termination (every `{@link` has a closing `}`);
 *   - curly-brace balance (MDX reads a stray `{` as a JS expression).
 *
 * Escaped braces (`\{`, `\}`) are ignored in the balance check.
 */
export function lintSlotMarkdown(
  value: string,
  key: string,
  bag: DiagnosticBag = new DiagnosticBag()
): DiagnosticBag {
  const fenceCount = (value.match(/```/g) ?? []).length;
  if (fenceCount % 2 !== 0) {
    bag.error('bhasha/unbalanced-fence', `Unbalanced code fence in "${key}"`, {
      path: key,
      hint: 'Every opening ``` needs a matching closing ```.',
    });
  }

  const linkOpens = (value.match(/\{@link\b/g) ?? []).length;
  const linkClosed = (value.match(/\{@link\b[^}]*\}/g) ?? []).length;
  if (linkOpens !== linkClosed) {
    bag.error('bhasha/broken-link-tag', `Unterminated {@link} in "${key}"`, {
      path: key,
      hint: 'Each {@link …} must close with "}".',
    });
  }

  if (!bracesBalanced(value)) {
    bag.error('bhasha/unbalanced-braces', `Unbalanced "{ }" in "${key}"`, {
      path: key,
      hint: 'MDX reads a stray "{" as an expression — escape it as "\\{" or close it.',
    });
  }

  return bag;
}

/** True if `{`/`}` are balanced and never close before they open. Ignores `\{`/`\}`. */
function bracesBalanced(value: string): boolean {
  let depth = 0;
  let escaped = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    // Track escape state by scanning, so an escaped backslash (`\\`) doesn't
    // wrongly mark the following brace as escaped — in `\\{` the `{` is structural.
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

/**
 * Interpolation-token parity between a source string and its translation. Tokens
 * the source has but the translation **drops**, and tokens the translation
 * **adds** that the source lacks (a rename or typo), are both errors — a dropped
 * `{count}` renders a broken sentence, a renamed one never substitutes.
 */
export function validateTokenParity(
  source: string,
  translated: string,
  key: string,
  bag: DiagnosticBag = new DiagnosticBag()
): DiagnosticBag {
  const sourceTokens = new Set(interpolationTokens(source));
  const translatedTokens = new Set(interpolationTokens(translated));

  for (const token of sourceTokens) {
    if (!translatedTokens.has(token)) {
      bag.error(
        'bhasha/dropped-token',
        `Translation of "${key}" drops the {${token}} placeholder`,
        {
          path: key,
          hint: `Keep {${token}} so it can be substituted.`,
        }
      );
    }
  }

  for (const token of translatedTokens) {
    if (!sourceTokens.has(token)) {
      bag.error(
        'bhasha/unknown-token',
        `Translation of "${key}" adds an unknown {${token}} placeholder`,
        {
          path: key,
          hint: `The source has no {${token}} — it will render literally.`,
        }
      );
    }
  }

  return bag;
}
