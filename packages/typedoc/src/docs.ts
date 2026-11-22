/**
 * Prose-docs collection + local-image asset pipeline for the TypeDoc bridge —
 * the `cleanJsdocTheme.docs` directory front-end, plus the shared image resolver
 * the README, symbol-comment prose and TypeDoc project documents
 * (`projectDocuments` / `@document`, resolved against each document's own file)
 * also flow through.
 *
 * This is the TypeDoc twin of the JSDoc bridge's `collectDocs` /
 * `resolveDocImages` / `resolveDocletImages` (in `clean-jsdoc-theme/src/publish.ts`).
 * Per the repo convention, the two bridges are independent leaf packages: pure
 * helpers are COPIED, never cross-imported. The only behavioural differences are
 * that warnings go through a `warn` callback (TypeDoc's `logger.warn`) rather than
 * `console.warn`.
 *
 * Page bodies are site-root-relative and base-free: rewritten image srcs are
 * `/_assets/…` WITHOUT the deploy `basePath`, like page and source links. The
 * base is applied exactly once downstream — by rang's `MdxImg` for HTML and by
 * dwar's `prefixRootRelativeUrls` for the companion `.md` / `llms-full.txt`
 * (#377). `hrefForServed` in `write-site.ts` is only for theme-level assets
 * (logos, favicon) whose href is emitted verbatim.
 *
 * The bridge is the I/O layer here — it walks the docs tree and routes every
 * referenced local image (Markdown `![](src)` AND raw `<img src>`) through
 * `_assets/` — so setu/dwar only ever see in-memory `DocInput`s / doclets and
 * already-rewritten `/_assets/…` srcs, and `dwar.render()` stays pure.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  join as joinPath,
  relative as relativePath,
  resolve as resolvePath,
  sep,
} from 'node:path';
import type { DocInput } from '@clean-jsdoc-theme/setu';
import type { OutputFile } from '@clean-jsdoc-theme/dwar';
import type { TDoclet } from '@clean-jsdoc-theme/utils';

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
        // `source` only names the file in diagnostics (e.g. a skipped page).
        const source = relativePath(process.cwd(), abs).split(sep).join('/');
        docs.push({ path: relPath, content, type, source });
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
 * HTML image: captures the `<img …src=` prefix (through the opening quote), the
 * quote char, the src value, and the closing quote (a backreference to the
 * opener). TypeDoc's comment pipeline renders `![alt](src)` to `<img src="…">`,
 * and prose can embed raw `<img>`; this matches both quote styles wherever `src`
 * sits in the tag.
 */
const HTML_IMAGE_RE = /(<img\b[^>]*?\bsrc\s*=\s*(["']))([^"']*)(\2)/gi;

/**
 * A reusable local-image asset pipeline shared by every prose source (docs,
 * README, symbol comments). `resolve(src, baseDir)` copies a local image to
 * `_assets/<base>.<hash><ext>` (content-hashed → cache-busted, deduped across all
 * sources via the shared caches) and returns the site-root-relative `/_assets/…`
 * href (no `basePath`; see the module header). It accumulates each copied file
 * on `files` and each SVG's markup on `inlineSvgs` (keyed by that base-free
 * href, so the renderer can inline it — its `[data-theme]` styles then track
 * the toggle). A `src` is resolved
 * relative to the project root when it starts with `/`, else relative to
 * `baseDir`; absolute (`http(s):`, `data:`), `#`-anchor, and unreadable srcs yield
 * `null` (the last warned) so callers leave them untouched. The JSDoc twin is
 * `createImageCollector` in `clean-jsdoc-theme/src/publish.ts`.
 */
export interface ImageCollector {
  resolve(rawSrc: string, baseDir: string): Promise<string | null>;
  readonly files: OutputFile[];
  readonly inlineSvgs: Record<string, string>;
}

export function createImageCollector(warn: Warn): ImageCollector {
  const files: OutputFile[] = [];
  const inlineSvgs: Record<string, string> = {};
  const seenServed = new Set<string>();
  // abs path → rewritten src (served `/_assets/…` href), or null if unreadable.
  const cache = new Map<string, string | null>();

  const resolve = async (rawSrc: string, baseDir: string): Promise<string | null> => {
    const src = rawSrc.trim();
    if (!src || isServableUrl(src) || src.startsWith('#') || src.startsWith('data:')) return null;
    const abs = src.startsWith('/') ? resolvePath(src.slice(1)) : resolvePath(baseDir, src);
    if (cache.has(abs)) return cache.get(abs) ?? null;
    let bytes: Buffer;
    try {
      bytes = await readFile(abs);
    } catch {
      warn(
        `[clean-jsdoc-theme] could not read image '${src}' (resolved '${abs}'); leaving it as-is.`
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
    // Base-free by design: rang's `MdxImg` adds `basePath` for HTML and dwar's
    // `prefixRootRelativeUrls` adds it for the companion .md / llms-full.txt —
    // exactly once each (#377). `inlineSvgs` is keyed by this same href.
    const href = '/' + served;
    if (ext.toLowerCase() === '.svg') {
      inlineSvgs[href] = bytes
        .toString('utf8')
        .replace(/<svg\b/, '<svg style="max-width:100%;height:auto;display:block"');
    }
    cache.set(abs, href);
    return href;
  };

  return { resolve, files, inlineSvgs };
}

/**
 * Char ranges of Markdown/HTML **code** regions — fenced blocks (` ``` `/`~~~`),
 * HTML `<pre>`/`<code>`, and inline backtick spans. Image references inside these
 * are literal example syntax an author is *documenting*, not real images, so the
 * rewriter skips them. Mirrors the JSDoc bridge's `CODE_REGION_RE`.
 */
const CODE_REGION_RE =
  /```[\s\S]*?```|~~~[\s\S]*?~~~|<pre[\s\S]*?<\/pre>|<code[^>]*>[\s\S]*?<\/code>|`[^`\n]+`/gi;

/** Collect the [start, end) char ranges of code regions in `content`. */
function codeRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const m of content.matchAll(CODE_REGION_RE)) {
    if (m.index !== undefined) ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

/** Whether char offset `idx` falls inside any code range. */
function indexInCode(idx: number, ranges: ReadonlyArray<[number, number]>): boolean {
  for (const [s, e] of ranges) if (idx >= s && idx < e) return true;
  return false;
}

/**
 * Rewrite the local image references in `content` to their served `_assets/…`
 * paths, routing each through `collector`. Handles BOTH Markdown `![alt](src)`
 * and raw HTML `<img src="…">` (TypeDoc renders comment images to the latter), so
 * prose in either form is covered. Relative srcs resolve against `baseDir`,
 * `/`-rooted srcs against the project root, and external/`data:`/anchor srcs are
 * left untouched — as is image syntax inside a code span / fenced block (example
 * syntax, not a real image). Returns the original string unchanged when nothing
 * was rewritten.
 */
export async function rewriteImageRefs(
  content: string,
  baseDir: string,
  collector: ImageCollector
): Promise<string> {
  if (!content) return content;
  const ranges = codeRanges(content);
  const map = new Map<string, string>();
  const collect = async (re: RegExp, srcGroup: number): Promise<void> => {
    for (const m of content.matchAll(re)) {
      if (m.index !== undefined && indexInCode(m.index, ranges)) continue; // example syntax
      const src = m[srcGroup];
      if (map.has(src)) continue;
      const href = await collector.resolve(src, baseDir);
      if (href) map.set(src, href);
    }
  };
  await collect(DOC_IMAGE_RE, 2);
  await collect(HTML_IMAGE_RE, 3);
  if (map.size === 0) return content;
  return content
    .replace(DOC_IMAGE_RE, (full, pre, src, post, offset: number) =>
      !indexInCode(offset, ranges) && map.has(src) ? `${pre}${map.get(src)}${post}` : full
    )
    .replace(HTML_IMAGE_RE, (full, pre, _quote, src, close, offset: number) =>
      !indexInCode(offset, ranges) && map.has(src) ? `${pre}${map.get(src)}${close}` : full
    );
}

/**
 * Resolve the local images a doc references and route them through the shared
 * content-hashed `_assets/` pipeline (see {@link createImageCollector}). Each
 * `![alt](src)` / `<img src>` whose `src` points to a file on disk is copied and
 * its `src` rewritten to the root-relative `/_assets/<base>.<hash><ext>`
 * (base-free; see {@link createImageCollector}), resolved relative to the
 * project root when it starts with `/`, else relative to the doc's own
 * directory. SVGs are also collected for inlining (theme-toggle-aware).
 */
export async function resolveDocImages(
  docs: DocInput[],
  docsDir: string,
  warn: Warn
): Promise<ResolvedDocs> {
  if (docs.length === 0) return { docs, files: [], inlineSvgs: {} };
  const root = resolvePath(docsDir);
  const collector = createImageCollector(warn);
  const out = await resolveLocatedDocImages(
    docs.map((doc) => ({ doc, baseDir: dirname(resolvePath(root, doc.path)) })),
    collector
  );
  return { docs: out, files: collector.files, inlineSvgs: collector.inlineSvgs };
}

/** A doc plus where its relative image srcs resolve from. */
export interface LocatedDoc {
  doc: DocInput;
  /** Absolute directory of the doc's source file. */
  baseDir?: string;
  /** Used only when `baseDir` is unknown: raw src text → absolute file path. */
  files?: ReadonlyMap<string, string>;
}

/**
 * A view of `collector` that only resolves `/`-rooted srcs and the srcs listed
 * in `files` (by their known absolute path). Anything else yields `null` with no
 * warning: TypeDoc already warned about an unresolvable relative path when it
 * converted the document. Shares the real collector's `files` / `inlineSvgs`.
 */
function knownFilesOnly(
  collector: ImageCollector,
  files: ReadonlyMap<string, string>
): ImageCollector {
  return {
    files: collector.files,
    inlineSvgs: collector.inlineSvgs,
    resolve: async (rawSrc, baseDir) => {
      if (rawSrc.trim().startsWith('/')) return collector.resolve(rawSrc, baseDir);
      const abs = files.get(rawSrc);
      // `./<name>` from the file's own dir — passing `abs` itself would read as
      // project-root-relative (leading `/`) on POSIX.
      return abs ? collector.resolve('./' + basename(abs), dirname(abs)) : null;
    },
  };
}

/**
 * Route the local images of docs that each carry their own base (TypeDoc
 * `projectDocuments` / `@document` pages, #378) through `collector`, the same
 * way {@link resolveDocImages} does for a docs directory. A doc with `baseDir`
 * resolves relative srcs against it; one without (a package-level document in
 * `entryPointStrategy: "packages"`, whose source path TypeDoc doesn't keep)
 * rewrites only the srcs listed in `files`. An unchanged doc is returned as-is.
 */
export async function resolveLocatedDocImages(
  docs: readonly LocatedDoc[],
  collector: ImageCollector
): Promise<DocInput[]> {
  const out: DocInput[] = [];
  for (const { doc, baseDir, files } of docs) {
    const content =
      baseDir !== undefined
        ? await rewriteImageRefs(doc.content, baseDir, collector)
        : await rewriteImageRefs(
            doc.content,
            process.cwd(),
            knownFilesOnly(collector, files ?? new Map())
          );
    out.push(content === doc.content ? doc : { ...doc, content });
  }
  return out;
}

/**
 * Doclet keys whose string values are raw source/code/meta, NOT rendered prose —
 * never scanned for images (a stray `<img`/`![` there must not be rewritten).
 */
const DOCLET_IMAGE_SKIP_KEYS = new Set(['meta', 'comment', 'examples', 'tags']);

/**
 * Recursively rewrite the `<img>`/`![]()` image srcs in every prose string
 * reachable from a doclet object, resolving against `baseDir`. Only strings that
 * actually carry an image marker (`<img` or `![`) are touched — a cheap guard so
 * names/identifiers/code are never scanned — and raw/code keys
 * ({@link DOCLET_IMAGE_SKIP_KEYS}) are skipped. Recurses into nested
 * objects/arrays (e.g. `params[].description`). Mutates `node` in place.
 */
async function rewriteDocletStrings(
  node: Record<string, unknown>,
  baseDir: string,
  collector: ImageCollector
): Promise<void> {
  for (const [key, value] of Object.entries(node)) {
    if (DOCLET_IMAGE_SKIP_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      if (value.includes('<img') || value.includes('![')) {
        const rewritten = await rewriteImageRefs(value, baseDir, collector);
        if (rewritten !== value) node[key] = rewritten;
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === 'string') {
          if (item.includes('<img') || item.includes('![')) {
            const rewritten = await rewriteImageRefs(item, baseDir, collector);
            if (rewritten !== item) value[i] = rewritten;
          }
        } else if (item && typeof item === 'object') {
          await rewriteDocletStrings(item as Record<string, unknown>, baseDir, collector);
        }
      }
    } else if (value && typeof value === 'object') {
      await rewriteDocletStrings(value as Record<string, unknown>, baseDir, collector);
    }
  }
}

/**
 * Resolve the local images referenced inside symbol-comment prose (doclet
 * descriptions / `classdesc` / nested param/property/returns/type-param
 * descriptions) and route them through the shared `collector`. The TypeDoc
 * comment pipeline has already rendered a comment's `![alt](../img/x.png)` to an
 * HTML `<img src="../img/x.png">` by the time the doclets are built, so each src
 * is resolved **relative to that symbol's own source file** (`meta.path` — the
 * directory `reflectionsToDoclets` recorded from `reflection.sources[0]`). The
 * doclets are a bridge-owned in-memory array, so they're mutated IN PLACE before
 * `generateSite` reads them. Resilient — a doclet without `meta.path` (no source
 * coords) is skipped; an unreadable image is warned + left as-is. The JSDoc twin
 * is `resolveDocletImages` in `clean-jsdoc-theme/src/publish.ts`.
 */
export async function resolveDocletImages(
  doclets: readonly TDoclet[],
  collector: ImageCollector
): Promise<void> {
  for (const d of doclets) {
    if (!d || typeof d !== 'object') continue;
    const path = d.meta?.path;
    if (typeof path !== 'string' || path.length === 0) continue;
    await rewriteDocletStrings(d as unknown as Record<string, unknown>, path, collector);
  }
}
