/**
 * Small formatting helpers shared by the diagnostics output and the build
 * report — human-readable byte sizes, fixed-width column padding, and a tiny
 * ANSI color helper gated on a `color` boolean.
 *
 * Strictly node-free (rang imports utils in the browser): byte sizes use
 * `TextEncoder`, never `Buffer`; there is no `chalk` dependency and no TTY
 * autodetection — the caller decides whether color is on.
 */

/** Shared encoder for measuring UTF-8 byte lengths of strings. */
const ENCODER = new TextEncoder();

/**
 * Byte length of a string or `Uint8Array`. Strings are measured as UTF-8 via
 * `TextEncoder` (not `Buffer.byteLength`) so this stays browser-safe.
 */
export function byteLength(contents: string | Uint8Array): number {
  return typeof contents === 'string' ? ENCODER.encode(contents).length : contents.byteLength;
}

/**
 * Format a raw byte count as a human-readable size — `B` under 1 kB, then `kB`
 * / `MB` / `GB` with one decimal place (decimal/SI units, 1 kB = 1000 B, to
 * match the build-report convention). Negative inputs are clamped to `0`.
 */
export function humanFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['kB', 'MB', 'GB', 'TB'] as const;
  if (bytes < 1000) return `${bytes} B`;

  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

/**
 * Pad `text` to `width` columns (measured in visible characters — assumes the
 * input carries no ANSI escapes, so apply color *after* padding). `align`
 * controls the side: `'left'` (default) right-pads, `'right'` left-pads.
 * Strings already at/over `width` are returned unchanged.
 */
export function padColumn(
  text: string,
  width: number,
  align: 'left' | 'right' = 'left',
): string {
  const gap = width - text.length;
  if (gap <= 0) return text;
  const pad = ' '.repeat(gap);
  return align === 'right' ? pad + text : text + pad;
}

/** SGR codes for the colors the diagnostics + report output use. */
const SGR = {
  red: 31,
  yellow: 33,
  green: 32,
  cyan: 36,
  gray: 90,
} as const;

/** Wrap `text` in an SGR pair when `enabled`, else return it untouched. */
function wrap(code: number, text: string, enabled: boolean): string {
  return enabled ? `[${code}m${text}[0m` : text;
}

/**
 * Tiny ANSI color helper — each method colors `text` only when `enabled` is
 * `true`, so callers thread a single `color` boolean through. No `chalk`
 * dependency; the second arg keeps it a no-op for non-TTY / tests.
 */
export const ansi = {
  red: (text: string, enabled: boolean): string => wrap(SGR.red, text, enabled),
  yellow: (text: string, enabled: boolean): string => wrap(SGR.yellow, text, enabled),
  green: (text: string, enabled: boolean): string => wrap(SGR.green, text, enabled),
  cyan: (text: string, enabled: boolean): string => wrap(SGR.cyan, text, enabled),
  /** Dimmed/gray — used for codes, paths, and separators. */
  dim: (text: string, enabled: boolean): string => wrap(SGR.gray, text, enabled),
};
