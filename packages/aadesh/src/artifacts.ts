/**
 * Disk I/O for the locale artifacts — the thin fs layer around the pure
 * (de)serialization in `./locale`. Each locale is two files under
 * `clean-jsdoc-theme-artifacts/locales/` (the plan, §5):
 *
 *  - `<code>.json` — the **editable** translations (`_version`/`chrome`/`api`).
 *  - `<code>.meta.json` — the **auto-managed** `_hashes`/`_obsolete` the user
 *    never touches (pure processing state for staleness + soft-delete).
 *
 * Splitting them keeps the file a translator edits free of machine bookkeeping.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  parseLocaleFiles,
  serializeLocaleContent,
  serializeLocaleMeta,
  type LocaleFile,
} from './locale';

/** Default artifacts directory, relative to the project root (the config's cwd). */
export const DEFAULT_ARTIFACTS_DIR = 'clean-jsdoc-theme-artifacts/locales';

/** Absolute path of the editable locale file within `dir`. */
export function localeFilePath(dir: string, code: string): string {
  return join(resolve(dir), `${code}.json`);
}

/** Absolute path of the auto-managed meta sidecar within `dir`. */
export function localeMetaFilePath(dir: string, code: string): string {
  return join(resolve(dir), `${code}.meta.json`);
}

/** Read a file, returning `null` on ENOENT (rethrowing anything else). */
async function readOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Read + recombine a locale's content + meta files, or `null` when the editable
 * file doesn't exist yet (first run). A present content file with a missing meta
 * sidecar recombines with empty hashes/obsolete (self-heals on next extract).
 */
export async function readLocaleFile(dir: string, code: string): Promise<LocaleFile | null> {
  const content = await readOrNull(localeFilePath(dir, code));
  if (content === null) return null;
  const meta = await readOrNull(localeMetaFilePath(dir, code));
  return parseLocaleFiles(content, meta);
}

/** Serialize + write a locale's content + meta files (creating the dir if needed). */
export async function writeLocaleFile(dir: string, code: string, file: LocaleFile): Promise<void> {
  await mkdir(resolve(dir), { recursive: true });
  await writeFile(localeFilePath(dir, code), serializeLocaleContent(file), 'utf8');
  await writeFile(localeMetaFilePath(dir, code), serializeLocaleMeta(file), 'utf8');
}
