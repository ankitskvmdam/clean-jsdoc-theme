/**
 * Post-write Pagefind step. Operates on a directory of already-written HTML
 * files and emits the search bundle under `<destination>/pagefind/`.
 *
 * `pagefind` is dynamically imported so it can be marked optional — callers
 * who don't need search at build time aren't forced to install it.
 */

import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

interface PagefindIndex {
  addDirectory(opts: { path: string }): Promise<{ errors: string[] }>;
  writeFiles(opts: { outputPath: string }): Promise<{ errors: string[] }>;
}

interface PagefindModule {
  createIndex(opts?: unknown): Promise<{ index?: PagefindIndex; errors?: string[] }>;
}

export async function runPagefindAgainstDir(destination: string): Promise<void> {
  // Cheap existence check so we throw a clear error early.
  const abs = resolve(destination);
  try {
    await access(abs);
  } catch {
    throw new Error(`runPagefindAgainstDir: destination does not exist: ${abs}`);
  }

  let mod: PagefindModule;
  try {
    // Vite/tsup can statically rewrite `import('pagefind')`; an indirect
    // dynamic import via a variable name keeps the dependency truly optional.
    const specifier = 'pagefind';
    mod = (await import(specifier)) as PagefindModule;
  } catch (err) {
    throw new Error(
      `runPagefindAgainstDir: failed to load 'pagefind'. Install it as a dep ` +
        `to enable search index generation. Original: ${(err as Error).message}`
    );
  }

  const { index, errors } = await mod.createIndex();
  if (!index) {
    throw new Error(
      `runPagefindAgainstDir: createIndex returned no index. Errors: ${(errors ?? []).join(', ')}`
    );
  }

  const addRes = await index.addDirectory({ path: abs });
  if (addRes.errors && addRes.errors.length > 0) {
    throw new Error(`runPagefindAgainstDir: addDirectory errors: ${addRes.errors.join(', ')}`);
  }

  const writeRes = await index.writeFiles({ outputPath: resolve(abs, 'pagefind') });
  if (writeRes.errors && writeRes.errors.length > 0) {
    throw new Error(`runPagefindAgainstDir: writeFiles errors: ${writeRes.errors.join(', ')}`);
  }
}
