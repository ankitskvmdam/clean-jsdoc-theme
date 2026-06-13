/**
 * Disk I/O for the locale artifacts — the thin fs layer around the pure
 * (de)serialization in `./locale`. The committable files live under
 * `clean-jsdoc-theme-artifacts/locales/<code>.json` (the plan, §5).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseLocaleFile, serializeLocaleFile, type LocaleFile } from './locale';

/** Default artifacts directory, relative to the project root (the config's cwd). */
export const DEFAULT_ARTIFACTS_DIR = 'clean-jsdoc-theme-artifacts/locales';

/** Absolute path of a locale file within `dir`. */
export function localeFilePath(dir: string, code: string): string {
  return join(resolve(dir), `${code}.json`);
}

/** Read + parse a locale file, or `null` when it doesn't exist yet (first run). */
export async function readLocaleFile(dir: string, code: string): Promise<LocaleFile | null> {
  try {
    const json = await readFile(localeFilePath(dir, code), 'utf8');
    return parseLocaleFile(json);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/** Serialize + write a locale file (creating the directory if needed). */
export async function writeLocaleFile(dir: string, code: string, file: LocaleFile): Promise<void> {
  const target = localeFilePath(dir, code);
  await mkdir(resolve(dir), { recursive: true });
  await writeFile(target, serializeLocaleFile(file), 'utf8');
}
