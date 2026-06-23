/**
 * Prose-docs collection for the TypeDoc bridge — the `cleanJsdocTheme.docs`
 * directory front-end.
 *
 * This is the TypeDoc twin of the JSDoc bridge's `collectDocs` / `resolveDocImages`
 * (in `clean-jsdoc-theme/src/publish.ts`). Per the repo convention, the two
 * bridges are independent leaf packages: pure helpers are COPIED, never
 * cross-imported. The only behavioural difference is that warnings go through a
 * `warn` callback (TypeDoc's `logger.warn`) rather than `console.warn`.
 *
 * The bridge is the I/O layer here — it walks the docs tree and routes referenced
 * images through `_assets/` — so setu/dwar only ever see in-memory `DocInput`s and
 * already-rewritten `/_assets/…` srcs, and `dwar.render()` stays pure.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, extname, join as joinPath, resolve as resolvePath } from 'node:path';
import type { DocInput } from '@clean-jsdoc-theme/setu';
import type { OutputFile } from '@clean-jsdoc-theme/dwar';

/** Sink for non-fatal warnings (TypeDoc's `logger.warn`). */
type Warn = (message: string) => void;

/** A value that's already a servable URL/URI needs no copying. */
function isServableUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || /^data:/i.test(value);
}

/** Short content hash for cache-busting an asset's served name. */
function contentHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/** Doc-file extensions → `DocInput.type`. Markdown is the priority; html maps to 'html'. */
const DOC_EXTENSIONS = new Map<string, DocInput['type']>([
  ['.md', 'markdown'],
  ['.markdown', 'markdown'],
  ['.html', 'html'],
  ['.htm', 'html'],
]);

/** Directory names skipped while walking a docs tree (build/vcs noise). */
const DOC_DIR_SKIP = new Set(['node_modules', '.git', '.svn', '.hg']);

/**
 * Recursively walk a docs directory and read each Markdown/HTML file into a
 * {@link DocInput} for setu's docs front-end. Mirrors the JSDoc bridge's
 * `collectDocs`:
 *
 * - `path` is the file path relative to `dir`, POSIX-normalized (forward slashes)
 *   with the extension stripped (`<dir>/guides/advanced.md` → `'guides/advanced'`,
 *   `<dir>/index.md` → `'index'`).
 * - `content` is the raw UTF-8 text (frontmatter stays embedded — setu parses it).
 * - `type` is `'markdown'` for `.md`/`.markdown`, `'html'` for `.html`/`.htm`.
 *
 * Resilient by design: a missing/unreadable directory yields `[]` (never throws);
 * dotfiles/dot-dirs and `node_modules`-like noise are skipped; a single
 * unreadable file is warned about and skipped. Results are sorted by `path` so
 * the output is stable build-to-build.
 */
export async function collectDocs(dir: string, warn: Warn): Promise<DocInput[]> {
  if (typeof dir !== 'string' || dir.trim().length === 0) return [];
  const root = resolvePath(dir);
  const docs: DocInput[] = [];

  const walk = async (absDir: string, relPrefix: string): Promise<void> => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch {
      // Missing/unreadable directory — skip leniently (root miss → []).
      return;
    }

    for (const entry of entries) {
      const name = entry.name;
      // Skip dotfiles/dot-dirs and known build/vcs noise.
      if (name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        if (DOC_DIR_SKIP.has(name)) continue;
        await walk(joinPath(absDir, name), relPrefix ? `${relPrefix}/${name}` : name);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = extname(name).toLowerCase();
      const type = DOC_EXTENSIONS.get(ext);
      if (!type) continue;

      const abs = joinPath(absDir, name);
      const stem = name.slice(0, name.length - ext.length);
      const relPath = relPrefix ? `${relPrefix}/${stem}` : stem;
      try {
        const content = await readFile(abs, 'utf8');
        docs.push({ path: relPath, content, type });
      } catch (err) {
        warn(
          `[clean-jsdoc-theme] could not read doc file '${abs}' — ${(err as Error).message}; skipping.`
        );
      }
    }
  };

  await walk(root, '');

  // Deterministic order so the manifest is stable build-to-build.
  docs.sort((a, b) => a.path.localeCompare(b.path));
  return docs;
}

/** The output of {@link resolveDocImages}: resolved docs + their image assets. */
export interface ResolvedDocs {
  docs: DocInput[];
  files: OutputFile[];
  inlineSvgs: Record<string, string>;
}

/** Markdown image: captures `![alt](`, the src, an optional `"title"`, and `)`. */
const DOC_IMAGE_RE = /(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

/**
 * Resolve the local images a doc references and route them through the same
 * content-hashed `_assets/` pipeline as the JSDoc bridge. For each `![alt](src)`
 * whose `src` points to a file on disk, the file is copied to
 * `_assets/<base>.<hash><ext>` (cache-busted, deduped across docs) and the `src`
 * is rewritten to the root-relative `/_assets/<base>.<hash><ext>`. A `src` is
 * resolved relative to the project root when it starts with `/`, else relative to
 * the doc's own directory; absolute (`http(s):`, `data:`), `#`-anchor, and
 * unreadable srcs are left untouched (the last with a warning). SVGs are ALSO
 * collected as inline markup (keyed by the rewritten src) so the renderer can drop
 * them into the page — its `[data-theme="dark"]` styles then follow the toggle.
 */
export async function resolveDocImages(
  docs: DocInput[],
  docsDir: string,
  warn: Warn
): Promise<ResolvedDocs> {
  if (docs.length === 0) return { docs, files: [], inlineSvgs: {} };
  const root = resolvePath(docsDir);
  const files: OutputFile[] = [];
  const seenServed = new Set<string>();
  const inlineSvgs: Record<string, string> = {};
  // abs path → rewritten src (root-relative `/_assets/…`), or null if unreadable.
  const cache = new Map<string, string | null>();

  const resolveOne = async (rawSrc: string, docDir: string): Promise<string | null> => {
    const src = rawSrc.trim();
    if (!src || isServableUrl(src) || src.startsWith('#') || src.startsWith('data:')) return null;
    const abs = src.startsWith('/') ? resolvePath(src.slice(1)) : resolvePath(docDir, src);
    if (cache.has(abs)) return cache.get(abs) ?? null;
    let bytes: Buffer;
    try {
      bytes = await readFile(abs);
    } catch {
      warn(
        `[clean-jsdoc-theme] could not read doc image '${src}' (resolved '${abs}'); leaving it as-is.`
      );
      cache.set(abs, null);
      return null;
    }
    const ext = extname(abs);
    const served = `_assets/${basename(abs, ext) || 'asset'}.${contentHash(bytes)}${ext}`;
    if (!seenServed.has(served)) {
      seenServed.add(served);
      files.push({ path: served, contents: bytes });
    }
    const href = '/' + served;
    if (ext.toLowerCase() === '.svg') {
      inlineSvgs[href] = bytes
        .toString('utf8')
        .replace(/<svg\b/, '<svg style="max-width:100%;height:auto;display:block"');
    }
    cache.set(abs, href);
    return href;
  };

  const out: DocInput[] = [];
  for (const doc of docs) {
    const docDir = dirname(resolvePath(root, doc.path));
    const map = new Map<string, string>();
    for (const m of doc.content.matchAll(DOC_IMAGE_RE)) {
      const src = m[2];
      if (map.has(src)) continue;
      const href = await resolveOne(src, docDir);
      if (href) map.set(src, href);
    }
    if (map.size === 0) {
      out.push(doc);
      continue;
    }
    const content = doc.content.replace(DOC_IMAGE_RE, (full, pre, src, post) =>
      map.has(src) ? `${pre}${map.get(src)}${post}` : full
    );
    out.push({ ...doc, content });
  }
  return { docs: out, files, inlineSvgs };
}
