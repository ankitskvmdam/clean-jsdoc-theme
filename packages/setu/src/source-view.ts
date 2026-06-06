/**
 * Source-file viewer pages + the "Source: file:line" link resolver.
 *
 * JSDoc records, per doclet, the file + line it was declared in (`meta.path`,
 * `meta.filename`, `meta.lineno`). When the bridge hands setu the project's
 * source files, this module turns each into a read-only `kind: 'source'`
 * {@link Page} (rendered by dwar in an editor island, not compiled as MDX), an
 * index page listing them all, a nav node, and a `resolve(meta)` function that
 * maps a doclet's `meta` back to its source page anchor.
 *
 * The module is pure: it only transforms the inputs it is given — no fs, no
 * cwd. Path normalization is defensive (backslashes → `/`) because the inputs
 * arrive pre-normalized from the bridge in Phase 5.
 */

import {
  slugifySourcePath,
  type Frontmatter,
  type NavNode,
  type Page,
  type TDoclet,
} from '@clean-jsdoc-theme/utils';
import { h, link, li, p, text, ul } from './mdast/builders';
import { toMdx } from './mdx';
import { extractHeadings } from './generate-site';
import type { Root } from 'mdast';

/** One source file the bridge wants rendered as a viewer page. */
export interface SourceFileInput {
  /** Absolute path on disk (used to match doclet `meta.path` + `meta.filename`). */
  absPath: string;
  /** Project-relative path (drives the slug, title, and link labels). */
  relPath: string;
  /** Raw file content, rendered verbatim in the editor island. */
  content: string;
}

/** Map a file extension to a Monaco language id. */
const EXTENSION_LANGUAGE: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  markdown: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  vue: 'vue',
  svelte: 'html',
};

/**
 * Detect a Monaco language id from a file path's extension. Returns
 * `'plaintext'` for unknown or extension-less paths. Uses Monaco ids
 * (`javascript`/`typescript`), not the bare extension.
 */
export function detectLanguage(relPath: string): string {
  const normalized = String(relPath ?? '').replace(/\\/g, '/');
  const base = normalized.slice(normalized.lastIndexOf('/') + 1);
  const dotIdx = base.lastIndexOf('.');
  if (dotIdx <= 0) return 'plaintext';
  const ext = base.slice(dotIdx + 1).toLowerCase();
  return EXTENSION_LANGUAGE[ext] ?? 'plaintext';
}

/** A resolved "Source: file:line" link target. */
export interface SourceLink {
  href: string;
  label: string;
}

/** Result of building source pages: pages, index, nav node, and a resolver. */
export interface SourceModel {
  /** One `kind: 'source'` page per input file. */
  pages: Page[];
  /** The "Source Files" index page listing every source file. */
  indexPage: Page;
  /** Nav entry pointing at the index page. */
  navNode: NavNode;
  /**
   * Resolve a doclet's `meta` to its source page anchor. Returns `null` when
   * there is no `meta`, no matching source file, or insufficient info.
   */
  resolve(meta: TDoclet['meta']): SourceLink | null;
}

/** Forward-slash join that normalizes backslashes and collapses repeats. */
function joinPath(dir: string, file: string): string {
  const a = String(dir ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
  const b = String(file ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!a) return b;
  if (!b) return a;
  return `${a}/${b}`;
}

const SOURCE_SLUG_PREFIX = 'source';
/** Sidebar label + nav title for the source section. */
const SOURCE_FILES_LABEL = 'Source Files';

/** Slug for a single source file viewer page. */
function fileSlug(relPath: string): string {
  return `${SOURCE_SLUG_PREFIX}/${slugifySourcePath(relPath)}`;
}

/** Build a single read-only `kind: 'source'` viewer page. */
function buildSourcePage(input: SourceFileInput): Page {
  const frontmatter: Frontmatter = {
    title: input.relPath,
    kind: 'source',
    hidden: true,
  };
  return {
    slug: fileSlug(input.relPath),
    frontmatter,
    body: '',
    headings: [],
    source: {
      code: input.content,
      language: detectLanguage(input.relPath),
      filename: input.relPath,
    },
  };
}

/** Build the "Source Files" index page: a heading + a sorted list of links. */
function buildIndexPage(sources: readonly SourceFileInput[]): Page {
  const sorted = [...sources].sort((a, b) => a.relPath.localeCompare(b.relPath));
  // Each entry is a list item wrapping a paragraph with a link to the file page.
  const listItems = sorted.map((s) =>
    li(p(link(`/${fileSlug(s.relPath)}/`, text(s.relPath)))),
  );

  const tree: Root = {
    type: 'root',
    children: [h(1, text(SOURCE_FILES_LABEL)), ul(listItems)],
  };

  const frontmatter: Frontmatter = { title: SOURCE_FILES_LABEL, kind: 'guide' };
  return {
    slug: SOURCE_SLUG_PREFIX,
    frontmatter,
    body: toMdx(tree, { frontmatter }),
    mdast: tree,
    headings: extractHeadings(tree),
  };
}

/**
 * Turn a set of source files into viewer pages, an index page, a nav node, and
 * a `resolve(meta)` that maps a doclet's declaration site back to its page.
 */
export function buildSourceModel(sources: readonly SourceFileInput[]): SourceModel {
  const pages = sources.map(buildSourcePage);
  const indexPage = buildIndexPage(sources);
  const navNode: NavNode = { label: SOURCE_FILES_LABEL, slug: SOURCE_SLUG_PREFIX };

  // Primary match: doclet `meta.path` + `meta.filename` → normalized abs path.
  // Fallback: bare `meta.filename` (when `meta.path` is absent). Both map to the
  // file's relPath so we can derive its slug and label.
  const byAbs = new Map<string, SourceFileInput>();
  const byFilename = new Map<string, SourceFileInput>();
  for (const s of sources) {
    byAbs.set(s.absPath.replace(/\\/g, '/'), s);
    const filename = s.relPath.replace(/\\/g, '/').split('/').pop() ?? s.relPath;
    // First writer wins so an unambiguous match is preferred over a later dup.
    if (!byFilename.has(filename)) byFilename.set(filename, s);
  }

  const resolve = (meta: TDoclet['meta']): SourceLink | null => {
    if (!meta) return null;
    const filename = meta.filename;
    let hit: SourceFileInput | undefined;

    if (meta.path && filename) {
      hit = byAbs.get(joinPath(meta.path, filename));
    }
    if (!hit && filename) {
      hit = byFilename.get(filename.replace(/\\/g, '/').split('/').pop() ?? filename);
    }
    if (!hit) return null;

    const lineno = meta.lineno ?? 1;
    return {
      href: `/${fileSlug(hit.relPath)}/#L${lineno}`,
      label: `${filename ?? hit.relPath}:${lineno}`,
    };
  };

  return { pages, indexPage, navNode, resolve };
}
