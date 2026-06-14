/**
 * Save a reconstructed command into the project's `package.json` `scripts`, so a
 * user can re-run it with `npm run <key>` (the plan's "write this command to
 * package.json … really helpful").
 *
 * The parse/insert is pure + tested ({@link addScript}); {@link writeScript} is
 * the thin fs wrapper. Existing keys are never clobbered — adding a key that's
 * taken returns `'exists'` so the caller can ask for a different one.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Outcome of an {@link addScript} attempt. */
export type AddScriptStatus = 'added' | 'exists';

export interface AddScriptResult {
  status: AddScriptStatus;
  /** The (possibly unchanged) package.json text to write back. */
  json: string;
}

/** Whether `pkg.scripts` already has `key`. */
export function hasScript(pkg: unknown, key: string): boolean {
  const scripts =
    pkg && typeof pkg === 'object' ? (pkg as { scripts?: unknown }).scripts : undefined;
  return Boolean(scripts && typeof scripts === 'object' && key in (scripts as object));
}

/** Detect the indentation unit of a JSON document (first indented line); default 2 spaces. */
function detectIndent(text: string): string | number {
  const m = /\n([ \t]+)"/.exec(text);
  if (!m) return 2;
  return m[1].includes('\t') ? '\t' : m[1].length;
}

/**
 * Add `scripts[key] = command` to a package.json's text. Returns `'exists'`
 * (text unchanged) when the key is already present — never overwrites. The
 * document's indentation + trailing newline are preserved; the `scripts` block
 * is created if absent.
 */
export function addScript(pkgText: string, key: string, command: string): AddScriptResult {
  const pkg = JSON.parse(pkgText) as Record<string, unknown>;
  if (hasScript(pkg, key)) return { status: 'exists', json: pkgText };

  const scripts = (
    pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {}
  ) as Record<string, string>;
  pkg.scripts = { ...scripts, [key]: command };

  const indent = detectIndent(pkgText);
  const trailingNewline = pkgText.endsWith('\n') ? '\n' : '';
  return { status: 'added', json: JSON.stringify(pkg, null, indent) + trailingNewline };
}

export interface WriteScriptResult {
  status: AddScriptStatus;
  /** Absolute-ish path of the package.json that was (or would be) written. */
  path: string;
}

/**
 * Read `<dir>/package.json`, add the script, and write it back. Throws an
 * actionable error when there's no readable package.json. Returns `'exists'`
 * without writing when the key is taken.
 */
export async function writeScript(
  dir: string,
  key: string,
  command: string
): Promise<WriteScriptResult> {
  const path = join(dir, 'package.json');
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    throw new Error(`aadesh: no package.json found at "${path}".`);
  }
  const result = addScript(text, key, command);
  if (result.status === 'added') await writeFile(path, result.json, 'utf8');
  return { status: result.status, path };
}
