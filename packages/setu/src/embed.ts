/**
 * Shared config parser for `@iframe` block tags (doclets) and ```` ```iframe ````
 * fenced blocks (prose). Both use the same grammar: the first whitespace-delimited
 * token is the URL, the rest are `key=value` pairs. Values may be quoted with
 * single or double quotes, and quoted values may contain spaces.
 *
 *     https://codepen.io/x/embed/abc height=400 title="Live demo" clickToLoad=true
 *
 * See `packages/setu/docs/plan-iframe-embeds.md` (Design §1).
 */

export interface EmbedSpec {
  /** Required; `https://` or protocol-relative `//` only (see security). */
  src: string;
  /** iframe title (a11y) + poster label. */
  title?: string;
  /** px. */
  height?: number;
  /** optional; default 100%. */
  width?: string;
  /** e.g. "16/9"; alternative to height. */
  aspectRatio?: string;
  /** iframe `allow=` (e.g. "fullscreen; clipboard-write"). */
  allow?: string;
  /** override default sandbox. */
  sandbox?: string;
  /** poster until clicked. */
  clickToLoad?: boolean;
  /** src contains a {theme} token to swap on theme change. */
  themed?: boolean;
}

/** Keys accepted in the `key=value` portion (everything in EmbedSpec but `src`). */
const STRING_KEYS = new Set<keyof EmbedSpec>(['title', 'width', 'aspectRatio', 'allow', 'sandbox']);
const NUMBER_KEYS = new Set<keyof EmbedSpec>(['height']);
const BOOLEAN_KEYS = new Set<keyof EmbedSpec>(['clickToLoad', 'themed']);

/** All allowlisted config keys (used to detect unknown keys for the warning). */
const KNOWN_KEYS = new Set<string>([
  ...STRING_KEYS,
  ...NUMBER_KEYS,
  ...BOOLEAN_KEYS,
] as string[]);

/**
 * Tokenize a config string into whitespace-delimited tokens, keeping spaces
 * inside single- or double-quoted runs intact. Newlines and runs of whitespace
 * are treated as a single delimiter (the prose fence body can span lines).
 * Never throws.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false; // whether `current` holds a (possibly empty quoted) token

  for (const ch of text) {
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
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

/**
 * Split a `key=value` token at the first `=`. Quotes around the value have
 * already been stripped by the tokenizer, so a quoted value with spaces arrives
 * here as one token. Returns null if there is no `=` (a bare flag).
 */
function splitPair(token: string): { key: string; value: string } | null {
  const eq = token.indexOf('=');
  if (eq === -1) return null;
  return { key: token.slice(0, eq), value: token.slice(eq + 1) };
}

/** Coerce a string to boolean: "true"/"false" (case-insensitive). null otherwise. */
function toBoolean(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

/**
 * Parse an embed config string into an EmbedSpec, or `null` if there is no URL
 * token, the input is empty, or the URL is not `https://` / protocol-relative
 * `//`. Never throws on malformed input — unknown keys are warned-and-ignored,
 * bad coercions are skipped.
 */
export function parseEmbedConfig(text: string): EmbedSpec | null {
  if (typeof text !== 'string') return null;
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const [src, ...rest] = tokens;
  if (!src) return null;

  // Security: only https or protocol-relative URLs.
  if (!src.startsWith('https://') && !src.startsWith('//')) return null;

  const spec: Record<string, unknown> = { src };

  for (const token of rest) {
    const pair = splitPair(token);

    // A bare flag with no `=` (e.g. `clickToLoad`) → true for boolean keys.
    if (!pair) {
      if (BOOLEAN_KEYS.has(token as keyof EmbedSpec)) {
        spec[token] = true;
      } else if (token.length > 0) {
        console.warn(`[setu:embed] ignoring unknown or malformed embed config token: "${token}"`);
      }
      continue;
    }

    const { key, value } = pair;

    if (!KNOWN_KEYS.has(key)) {
      console.warn(`[setu:embed] ignoring unknown embed config key: "${key}"`);
      continue;
    }

    if (NUMBER_KEYS.has(key as keyof EmbedSpec)) {
      const n = Number(value);
      if (Number.isNaN(n)) continue; // drop NaN
      spec[key] = n;
      continue;
    }

    if (BOOLEAN_KEYS.has(key as keyof EmbedSpec)) {
      const b = toBoolean(value);
      if (b === null) continue; // drop unparseable boolean
      spec[key] = b;
      continue;
    }

    // String key.
    spec[key] = value;
  }

  return spec as unknown as EmbedSpec;
}
