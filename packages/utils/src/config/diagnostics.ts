/**
 * Diagnostics model — the shared reporting spine for opts validation. Every
 * field validator collects {@link Diagnostic}s into a {@link DiagnosticBag};
 * the caller decides the policy (log + continue vs. fail on errors), and
 * {@link formatDiagnostics} renders the bag for the console.
 *
 * Pure + node-free (rang imports utils in the browser) — no I/O, no `process`,
 * no color autodetection here. Color is an explicit opt passed by the caller.
 */

import { ansi } from './format';

/** Severity of a diagnostic. Drives the caller's strict-mode policy. */
export type DiagnosticLevel = 'error' | 'warning' | 'info';

/** A single, structured validation finding. */
export interface Diagnostic {
  /** Severity — `error` is the only level a strict build fails on. */
  level: DiagnosticLevel;
  /** Stable identifier, e.g. `'opts/unknown-key'` or `'fonts/not-google'`. */
  code: string;
  /** What's wrong, in plain language. */
  message: string;
  /** What to use instead — the actionable "reason" (e.g. "did you mean X?"). */
  hint?: string;
  /** Opt path the finding applies to, e.g. `'siteName.alt'` or `'fonts.heading'`. */
  path?: string;
}

/** Convenience extras for the {@link DiagnosticBag} level helpers. */
type DiagnosticExtras = Pick<Diagnostic, 'hint' | 'path'>;

/**
 * An append-only collector of {@link Diagnostic}s. Validators share one bag so
 * the caller gets a single ordered list to format and to gate strict mode on.
 */
export class DiagnosticBag {
  private readonly items: Diagnostic[] = [];

  /** Append a fully-formed diagnostic. */
  add(d: Diagnostic): void {
    this.items.push(d);
  }

  /** Add an `error` — the level a strict build fails on. */
  error(code: string, message: string, extras?: DiagnosticExtras): void {
    this.add({ level: 'error', code, message, ...extras });
  }

  /** Add a `warning` — reported but never fatal (unless strict escalates it). */
  warning(code: string, message: string, extras?: DiagnosticExtras): void {
    this.add({ level: 'warning', code, message, ...extras });
  }

  /** Add an `info` — purely advisory (e.g. "couldn't verify offline"). */
  info(code: string, message: string, extras?: DiagnosticExtras): void {
    this.add({ level: 'info', code, message, ...extras });
  }

  /** The diagnostics collected so far, in insertion order. */
  get list(): readonly Diagnostic[] {
    return this.items;
  }

  /** `true` when at least one `error`-level diagnostic was collected. */
  hasErrors(): boolean {
    return this.items.some((d) => d.level === 'error');
  }
}

/** Console label + color for each level. */
const LEVEL_META: Record<DiagnosticLevel, { label: string; color: keyof typeof ansi }> = {
  error: { label: 'error', color: 'red' },
  warning: { label: 'warning', color: 'yellow' },
  info: { label: 'info', color: 'cyan' },
};

/** Order levels are grouped in the formatted output (most severe first). */
const LEVEL_ORDER: readonly DiagnosticLevel[] = ['error', 'warning', 'info'];

/**
 * Format a bag for the console — grouped by level (errors first), each line
 * carrying the code, message, optional path, and a `→` hint. `color` gates the
 * ANSI escapes (default off, so the output is plain/testable); the caller
 * passes `true` only for a real TTY.
 */
export function formatDiagnostics(bag: DiagnosticBag, opts?: { color?: boolean }): string {
  const color = opts?.color ?? false;
  const lines: string[] = [];

  for (const level of LEVEL_ORDER) {
    const group = bag.list.filter((d) => d.level === level);
    if (group.length === 0) continue;

    const meta = LEVEL_META[level];
    for (const d of group) {
      const tag = ansi[meta.color](`${meta.label}`, color);
      const where = d.path ? ` ${ansi.dim(`(${d.path})`, color)}` : '';
      lines.push(`${tag} ${d.message}${where} ${ansi.dim(`[${d.code}]`, color)}`);
      if (d.hint) {
        lines.push(`  ${ansi.dim('→', color)} ${d.hint}`);
      }
    }
  }

  return lines.join('\n');
}
