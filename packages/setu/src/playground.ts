/**
 * Shared parser for the `@playground` block tag (doclets), the ```` ```js
 * playground … ```` prose fence, and the `<playground …>` prose container. All
 * three use ONE token grammar — the same whitespace-token / `key=value` style as
 * `embed.ts` — so a single {@link parsePlaygroundSpec} reads every authoring site:
 *
 *     codepen jsfiddle filename=resize.js highlight=1,4,8
 *
 * Tokens are: bare provider names (`codepen` | `jsfiddle` | `codesandbox`) that
 * enable those providers; `none`/`off` to opt a block out; `filename=<name>`; and
 * `highlight=1,4,8` (also `highlight=[1,4,8]`). Values may be single/double
 * quoted. Unknown tokens are warned-and-ignored; the parser never throws.
 */

import type { PlaygroundProvider } from '@clean-jsdoc-theme/utils';

/** The providers a code block can be opened in. */
export const KNOWN_PROVIDERS = ['codepen', 'jsfiddle', 'codesandbox'] as const;

const PROVIDER_SET = new Set<string>(KNOWN_PROVIDERS);
const OFF_TOKENS = new Set<string>(['none', 'off']);

/**
 * The parsed grammar of one `@playground` / fence / container config string.
 * `providers: null` means "no explicit provider list was given" (a bare
 * `@playground`) — distinct from an empty list — so callers can fall back to the
 * site-wide default set. `off` records a `none`/`off` opt-out token.
 */
export interface PlaygroundSpec {
  /** `none`/`off` token present — opt this block out of the playground dropdown. */
  off: boolean;
  /** Explicit provider list (author order), or `null` when none were named. */
  providers: PlaygroundProvider[] | null;
  /** `filename=<name>` — header label for the code block. */
  filename?: string;
  /** `highlight=…` — sorted, de-duped 1-based line numbers (empty when unset). */
  highlight: number[];
}

/** The resolved render opts a `<Playground>` wrapper carries (see {@link resolvePlaygroundOpts}). */
export interface PlaygroundOpts {
  providers: PlaygroundProvider[];
  filename?: string;
  highlight: number[];
}

/**
 * Tokenize a config string into whitespace-delimited tokens, keeping spaces
 * inside single- or double-quoted runs intact (mirrors `embed.ts`'s tokenizer;
 * duplicated here to keep `embed.ts` untouched). Never throws.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;

  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v') {
      if (started) {
        tokens.push(current);
        current = '';
        started = false;
      }
      continue;
    }
    current += ch;
    started = true;
  }
  if (started) tokens.push(current);
  return tokens;
}

/** Split a `key=value` token at the first `=`; `null` for a bare flag. */
function splitPair(token: string): { key: string; value: string } | null {
  const eq = token.indexOf('=');
  if (eq === -1) return null;
  return { key: token.slice(0, eq), value: token.slice(eq + 1) };
}

/**
 * Parse a `highlight=` value into sorted, de-duped 1-based line numbers. Accepts
 * `1,4,8` and `[1,4,8]` (brackets stripped). Non-numeric / `< 1` entries are
 * dropped; an all-junk value yields `[]`.
 */
function parseHighlight(value: string): number[] {
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '');
  const seen = new Set<number>();
  for (const part of inner.split(',')) {
    const n = Number(part.trim());
    if (Number.isInteger(n) && n >= 1) seen.add(n);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Parse a config string into a {@link PlaygroundSpec}. Never throws — unknown
 * bare tokens / unknown keys are warned-and-ignored (mirroring `parseEmbedConfig`).
 */
export function parsePlaygroundSpec(text: string): PlaygroundSpec {
  const spec: PlaygroundSpec = { off: false, providers: null, highlight: [] };
  if (typeof text !== 'string') return spec;

  const providers: PlaygroundProvider[] = [];
  for (const token of tokenize(text)) {
    const pair = splitPair(token);

    if (!pair) {
      const flag = token.toLowerCase();
      if (OFF_TOKENS.has(flag)) {
        spec.off = true;
      } else if (PROVIDER_SET.has(flag)) {
        if (!providers.includes(flag as PlaygroundProvider)) providers.push(flag as PlaygroundProvider);
      } else if (token.length > 0) {
        console.warn(`[setu:playground] ignoring unknown token: "${token}"`);
      }
      continue;
    }

    const { key, value } = pair;
    if (key === 'filename') {
      const name = value.trim();
      if (name) spec.filename = name;
    } else if (key === 'highlight') {
      spec.highlight = parseHighlight(value);
    } else {
      console.warn(`[setu:playground] ignoring unknown config key: "${key}"`);
    }
  }

  if (providers.length > 0) spec.providers = providers;
  return spec;
}

/**
 * Resolve a {@link PlaygroundSpec} into the concrete {@link PlaygroundOpts} a
 * `<Playground>` wrapper carries, or `null` when nothing warrants a wrapper.
 *
 * `defaultProviders` fills in the provider list for a bare config (no explicit
 * providers and not opted out): API examples pass the site-wide default set,
 * prose fences/containers pass {@link KNOWN_PROVIDERS}. An `off` block keeps an
 * empty provider list but still wraps when it carries a `filename`/`highlight`
 * (so opting out of the dropdown doesn't lose the presentation options).
 */
export function resolvePlaygroundOpts(
  spec: PlaygroundSpec,
  defaultProviders: readonly PlaygroundProvider[]
): PlaygroundOpts | null {
  const providers = spec.off ? [] : (spec.providers ?? [...defaultProviders]);
  const warrants = providers.length > 0 || !!spec.filename || spec.highlight.length > 0;
  if (!warrants) return null;
  return { providers, filename: spec.filename, highlight: spec.highlight };
}
