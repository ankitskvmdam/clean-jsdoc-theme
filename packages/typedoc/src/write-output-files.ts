import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { OutputFile } from '@clean-jsdoc-theme/dwar';

/**
 * Persist dwar's in-memory {@link OutputFile}s to disk under `destination`.
 *
 * Copied (not cross-imported) from the JSDoc bridge package: each file's `path`
 * is a forward-slash, site-relative path; `join` maps it onto the OS, the parent
 * directory is created, and the contents (string or bytes) are written.
 */
export async function writeOutputFiles(
  destination: string,
  files: readonly OutputFile[]
): Promise<void> {
  for (const file of files) {
    const target = join(destination, file.path);
    await mkdir(dirname(target), { recursive: true });
    const contents = typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents);
    await writeFile(target, contents);
  }
}
