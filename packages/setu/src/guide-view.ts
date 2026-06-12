/**
 * README + tutorial + docs pages.
 *
 * JSDoc surfaces several kinds of free-form prose alongside the API: the project
 * README (`opts.readme`, already rendered to HTML by JSDoc's markdown plugin),
 * tutorials (the `--tutorials` directory, resolved into a tree of raw Markdown /
 * HTML documents), and — new in v5 — a docs directory the bridge walks. All
 * become ordinary {@link Page}s so they flow through the same MDX → dwar render
 * path as class pages — same chrome, TOC, heading anchors, and search indexing.
 *
 * The README becomes the site home page (slug `''` → `index.html`); tutorials
 * become guide pages under `tutorials/<name>`, grouped under "Tutorials" in the
 * nav with their resolved hierarchy flattened in document order.
 *
 * Tutorials and docs share one builder ({@link buildDocPages}) fed by the
 * exported {@link DocInput} shape: the docs front-end reads raw files (frontmatter
 * still embedded), while the tutorial front-end adapts the existing
 * {@link TutorialInput} tree via {@link tutorialsToDocInputs}. The adapter path
 * supplies metadata explicitly and disables frontmatter parsing, so legacy
 * tutorial output stays byte-identical.
 */

import type { PhrasingContent, Root, RootContent } from 'mdast';
import { slugifyPath, type Frontmatter, type NavNode, type Page } from '@clean-jsdoc-theme/utils';
import { htmlToMdastBlocks, markdownToMdastBlocks } from './mdast/from-html';
import { resolveLinkTags } from './mdast/link-tags';
import { embed } from './mdast/builders';
import { parseEmbedConfig } from './embed';
import { hrefFor, type ResolvedLink } from './link-registry';
import { toMdx } from './mdx';
import { extractHeadings } from './generate-site';

/**
 * A tutorial, normalized away from JSDoc's `Tutorial` class so setu doesn't
 * depend on JSDoc internals. The bridge walks JSDoc's resolver tree and hands
 * setu this plain shape.
 */
export interface TutorialInput {
  /** Identifier — the source filename without its extension. */
  name: string;
  /** Display title (from a `.json` config, else the file name). */
  title: string;
  /** Raw source content (Markdown or HTML, per `type`). */
  content: string;
  /** Source format. */
  type: 'markdown' | 'html';
  /** Child tutorials, in resolved order. */
  children?: TutorialInput[];
}

/** Sidebar group label for tutorial pages. */
export const TUTORIALS_GROUP = 'Tutorials';
/** URL prefix for tutorial pages (`tutorials/<name>`). */
const TUTORIAL_SLUG_PREFIX = 'tutorials';

/**
 * A single doc-page input — the shared shape consumed by {@link buildDocPages}.
 * The docs front-end (the bridge's directory walk) emits these with frontmatter
 * still embedded in `content`; the tutorial front-end synthesizes them via
 * {@link tutorialsToDocInputs} with explicit `group`/`title`/`order` overrides.
 */
export interface DocInput {
  /** Relative path, POSIX, no extension — drives slug + directory grouping. */
  path: string;
  /** Raw content (frontmatter may still be embedded). */
  content: string;
  type: 'markdown' | 'html';
  /** Explicit override (used by the tutorial adapter). */
  group?: string;
  title?: string;
  order?: number;
}

/** Options for {@link buildDocPages}. */
export interface BuildDocPagesOptions {
  /** Group label assigned to a doc with no frontmatter/input/directory group. */
  defaultDocGroup?: string;
  /**
   * Whether to parse + strip a leading YAML frontmatter block from each input's
   * `content`. The docs front-end wants this (frontmatter drives metadata); the
   * tutorial adapter sets it `false` so today's tutorial output stays
   * byte-identical (tutorial content is never frontmatter-stripped). Default
   * `true`.
   */
  parseFrontmatter?: boolean;
}

/**
 * Parse raw content into a structured mdast tree per its source format. Both
 * formats normalize through HTML so the resulting tree carries only structured
 * nodes (no raw HTML, no angle-bracket autolinks) — the prerequisite for
 * serializing MDX-safe output downstream. See {@link markdownToMdastBlocks}.
 */
function contentToMdast(content: string, type: 'markdown' | 'html'): Root {
  const children = type === 'html' ? htmlToMdastBlocks(content) : markdownToMdastBlocks(content);
  return { type: 'root', children };
}

/** A node that owns a `children` array we can walk/rewrite. */
interface HasChildren {
  children: (RootContent | PhrasingContent)[];
}

function hasChildren(node: unknown): node is HasChildren {
  return (
    typeof node === 'object' &&
    node !== null &&
    Array.isArray((node as { children?: unknown }).children)
  );
}

/**
 * Rewrite ```` ```iframe ```` fenced code blocks in `tree` in place — the prose
 * counterpart to the doclet `@iframe` tag (Phase 2). The fence body uses the same
 * grammar as the block tag (see {@link parseEmbedConfig}) and may span multiple
 * lines.
 *
 * For each `code` node with `lang === 'iframe'`:
 * - a valid config → replaced with the `<Embed …/>` JSX node ({@link embed});
 * - an invalid config (e.g. non-https; `parseEmbedConfig` returns `null` and
 *   warns) → dropped entirely.
 *
 * All other fences (`js`, `ts`, `bash`, …) and every non-`code` node are left
 * untouched. Walks parents with a manual parent-aware recursion (matching
 * {@link resolveLinkTags}), rebuilding each parent's `children` so replacement /
 * removal never corrupts indices.
 */
export function resolveEmbedFences(tree: Root): void {
  walkFences(tree);
}

function walkFences(parent: HasChildren): void {
  const next: (RootContent | PhrasingContent)[] = [];

  for (const child of parent.children) {
    if (child.type === 'code' && child.lang === 'iframe') {
      const spec = parseEmbedConfig(child.value);
      // Valid → swap in the Embed JSX node; invalid → drop (parser already warned).
      if (spec) next.push(embed(spec));
      continue;
    }
    // Never descend into other code spans/blocks; recurse into real parents.
    if (child.type !== 'code' && child.type !== 'inlineCode' && hasChildren(child)) {
      walkFences(child);
    }
    next.push(child);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mdast child unions are narrower than the rebuilt array; the contents are type-correct per branch above.
  parent.children = next as any;
}

/** Coerce a scalar frontmatter token into a string, number, or boolean. */
function parseScalar(raw: string): string | number | boolean {
  const value = raw.trim();
  // Strip a single matching pair of surrounding quotes (preserve inner content).
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  // A bare numeric token becomes a number; anything else stays a string.
  if (value !== '' && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return value;
}

/**
 * Parse a leading `---\n…\n---` YAML frontmatter block and return the parsed
 * `data` plus the remaining `body`. Dependency-light: a small hand-rolled parser
 * for the simple `key: value` (string / number / boolean) cases, which is all
 * the docs pipeline needs (`title`, `group`, `order`, `slug`, `hidden`, …).
 *
 * - No leading block → `{ data: {}, body: raw }`.
 * - Malformed / unterminated block (no closing `---`) → treated as no
 *   frontmatter: `{ data: {}, body: raw }`. Never throws.
 *
 * The block is stripped from the body BEFORE content is converted to mdast, so
 * it never renders as a thematic break.
 */
export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const text = typeof raw === 'string' ? raw : '';
  // Frontmatter must be the very first line: `---` (allow a leading BOM and a
  // trailing CR for CRLF files), followed by a newline.
  const opener = /^\uFEFF?---[ \t]*\r?\n/;
  const open = opener.exec(text);
  if (!open) return { data: {}, body: raw };

  const bodyStart = open[0].length;
  // Find the closing fence: a line that is exactly `---` (optionally `...`).
  const closer = /\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/g;
  closer.lastIndex = bodyStart - 1; // start search at the newline ending the opener
  const close = closer.exec(text);
  if (!close) return { data: {}, body: raw }; // unterminated → no frontmatter

  const block = text.slice(bodyStart, close.index);
  const body = text.slice(close.index + close[0].length);

  const data: Record<string, unknown> = {};
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue; // not a `key: value` pair — skip leniently
    const key = line.slice(0, sep).trim();
    if (key === '') continue;
    const value = line.slice(sep + 1).trim();
    data[key] = value === '' ? '' : parseScalar(value);
  }

  return { data, body };
}

/** Humanize a slug-ish token into a display label: `getting-started` → `Getting Started`. */
function humanize(token: string): string {
  const words = token.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (words === '') return token;
  return words
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** POSIX-normalize a path and split into non-empty segments. */
function pathSegments(path: string): string[] {
  return String(path ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((s) => s.length > 0);
}

/** Coerce a frontmatter value to a non-empty trimmed string, else `undefined`. */
function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' ? undefined : t;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/** Coerce a frontmatter value to a finite number, else `undefined`. */
function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (value.trim() !== '' && Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Coerce a frontmatter value to a boolean (`true`/`'true'`), else `undefined`. */
function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase();
    if (t === 'true') return true;
    if (t === 'false') return false;
  }
  return undefined;
}

/**
 * Build the home page from the README HTML JSDoc provides in `opts.readme`.
 * Returns `null` when the README has no renderable content. The page lives at
 * the site root (slug `''`), so dwar writes it to `index.html`.
 */
export function buildReadmePage(
  readmeHtml: string,
  pkg?: { name?: string },
  resolveLink?: (target: string) => ResolvedLink | null
): Page | null {
  const tree: Root = { type: 'root', children: htmlToMdastBlocks(readmeHtml) };
  if (tree.children.length === 0) return null;
  if (resolveLink) resolveLinkTags(tree, resolveLink);
  // Prose `iframe` fences → <Embed/> (after normalization, before toMdx).
  resolveEmbedFences(tree);

  const title = pkg?.name ?? 'Home';
  const frontmatter: Frontmatter = { title, kind: 'index' };
  // README arrives as HTML, so serialize the converted tree (no raw Markdown to
  // preserve). dwar compiles the resulting MDX exactly like any other page.
  const body = toMdx(tree, { frontmatter });
  const headings = extractHeadings(tree);

  return { slug: '', frontmatter, body, mdast: tree, headings };
}

/** A resolved `@tutorial`/`{@link}` cross-reference: page href + display title. */
export interface ResolvedTutorial {
  href: string;
  title: string;
}

/** A resolver: a cross-reference name → its target, or `null` when unknown. */
export type CrossRefResolver = (name: string) => ResolvedTutorial | null;

/** A keyed cross-reference target, before it's folded into a resolver map. */
interface NamedEntry {
  /** The identifier a `@tutorial <name>` / `{@link <name>}` references. */
  name: string;
  href: string;
  title: string;
}

/**
 * Fold a list of {@link NamedEntry} into a `name → { href, title }` resolver,
 * the shared core behind {@link makeTutorialResolver} and {@link makeDocResolver}.
 * The lookup key is trimmed; an empty name and any duplicate are dropped
 * (**first registration wins**); an unknown name resolves to `null` so the
 * caller falls back to plain text rather than a broken anchor.
 */
function makeNamedResolver(entries: Iterable<NamedEntry>): CrossRefResolver {
  const byName = new Map<string, ResolvedTutorial>();
  for (const { name, href, title } of entries) {
    const key = name.trim();
    if (key !== '' && !byName.has(key)) byName.set(key, { href, title });
  }
  return (name: string) => byName.get(name.trim()) ?? null;
}

/**
 * Build a `@tutorial <name>` resolver over the tutorial tree, so a tag links to
 * the guide page setu generates for it. Walks the same hierarchy
 * {@link buildTutorialPages} flattens, keying each tutorial by its `name` (the
 * identifier the tag references). The href and slug share `slugifyPath`, so they
 * always agree with the emitted page.
 */
export function makeTutorialResolver(tutorials: readonly TutorialInput[]): CrossRefResolver {
  const entries: NamedEntry[] = [];
  const walk = (t: TutorialInput): void => {
    if (t.name) {
      const slug = `${TUTORIAL_SLUG_PREFIX}/${slugifyPath([t.name])}`;
      entries.push({ name: t.name, href: hrefFor(slug), title: t.title?.trim() || t.name });
    }
    for (const child of t.children ?? []) walk(child);
  };
  for (const t of tutorials) walk(t);
  return makeNamedResolver(entries);
}

/**
 * Build a `@tutorial`/`{@link}` resolver over the docs directory, the docs
 * counterpart of {@link makeTutorialResolver}. Each doc is keyed by its **slug**
 * — its canonical address (a frontmatter `slug:` override, else the path) — so
 * `@tutorial guides/advanced` links to that page. Derives the slug/title through
 * the same {@link deriveDocMeta} the page builder uses, so the resolved href can
 * never drift from the emitted page. The home page (slug `''`) is not linkable.
 */
export function makeDocResolver(docs: readonly DocInput[]): CrossRefResolver {
  const entries: NamedEntry[] = [];
  for (const input of docs) {
    const { slug, title, isHome } = deriveDocMeta(input, { parseFrontmatter: true });
    if (isHome) continue;
    entries.push({ name: slug, href: hrefFor(slug), title });
  }
  return makeNamedResolver(entries);
}

/**
 * Chain cross-reference resolvers, trying each in order and returning the first
 * hit (so an earlier resolver wins a name collision). Skips absent resolvers and
 * returns `undefined` when none are active, matching the optional `resolveTutorial`
 * the render path threads through.
 */
export function composeResolvers(
  ...resolvers: Array<CrossRefResolver | undefined>
): CrossRefResolver | undefined {
  const active = resolvers.filter((r): r is CrossRefResolver => typeof r === 'function');
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  return (name: string) => {
    for (const resolve of active) {
      const hit = resolve(name);
      if (hit) return hit;
    }
    return null;
  };
}

/**
 * Build guide/doc pages + flat nav entries from a list of {@link DocInput}.
 * Shared by the tutorial adapter ({@link tutorialsToDocInputs}) and the docs
 * front-end. Per input:
 *
 * - Parse + strip leading YAML frontmatter from `content` (unless
 *   `opts.parseFrontmatter === false`), so the block never renders as a
 *   thematic break.
 * - `slug` = `data.slug` ?? slugify the `path` (split on `/`, `slugifyPath` per
 *   segment, join — no prefix).
 * - `group` = `data.group` ?? `input.group` ?? the directory path derived from
 *   `path` (humanized per segment) ?? `opts.defaultDocGroup`.
 * - `title` = `data.title` ?? `input.title` ?? humanized basename of `path`.
 * - `order` = `data.order` ?? `input.order`.
 * - `kind: 'guide'`; `hidden` honored. A root `index` path → slug `''`,
 *   `kind: 'index'` (the home page).
 *
 * A `NavNode` is emitted per page carrying `label`/`slug`/`group`/`order`; nav
 * is skipped for `hidden` pages and for the home page (whose nav entry is added
 * elsewhere, matching `buildReadmePage`).
 */
export function buildDocPages(
  docs: readonly DocInput[],
  opts: BuildDocPagesOptions = {},
  resolveLink?: (target: string) => ResolvedLink | null
): { pages: Page[]; nav: NavNode[] } {
  const { defaultDocGroup, parseFrontmatter: doParse = true } = opts;
  const pages: Page[] = [];
  const nav: NavNode[] = [];

  for (const input of docs) {
    const { slug, title, group, order, hidden, isHome, kind, body } = deriveDocMeta(input, {
      defaultDocGroup,
      parseFrontmatter: doParse,
    });

    const tree = contentToMdast(body, input.type);
    if (tree.children.length === 0) continue;
    if (resolveLink) resolveLinkTags(tree, resolveLink);
    // Prose `iframe` fences → <Embed/> (after normalization, before toMdx).
    resolveEmbedFences(tree);

    const frontmatter: Frontmatter = { title, kind };
    // Tutorials carry group/order on the NAV node only (today's behavior), never
    // in page frontmatter — so the legacy tutorial output stays byte-identical.
    // The docs front-end (which parses frontmatter) does surface them on the
    // page, where the sidebar plan reads `frontmatter.group`/`order`.
    if (doParse) {
      if (group !== undefined) frontmatter.group = group;
      if (order !== undefined) frontmatter.order = order;
      if (hidden) frontmatter.hidden = true;
    }

    // Both formats are normalized to structured mdast (see contentToMdast), then
    // serialized to MDX-safe Markdown. Markdown is no longer passed through
    // verbatim: GFM-but-not-MDX constructs (angle-bracket autolinks, raw/unclosed
    // HTML) would otherwise abort the page compile in dwar. The GFM round-trip
    // preserves tables, task lists, strikethrough, and footnotes.
    const pageBody = toMdx(tree, { frontmatter });
    const headings = extractHeadings(tree);

    pages.push({ slug, frontmatter, body: pageBody, mdast: tree, headings });

    // No nav for hidden pages, nor for the home page (added elsewhere).
    if (hidden || isHome) continue;
    nav.push({
      label: title,
      slug,
      ...(group !== undefined ? { group } : {}),
      ...(order !== undefined ? { order } : {}),
    });
  }

  return { pages, nav };
}

/** A {@link DocInput}'s derived page metadata — the shared truth for the page
 * builder and the cross-reference resolver. */
interface DocMeta {
  slug: string;
  title: string;
  group: string | undefined;
  order: number | undefined;
  hidden: boolean;
  isHome: boolean;
  kind: 'index' | 'guide';
  /** Frontmatter-stripped raw content, ready for {@link contentToMdast}. */
  body: string;
}

/**
 * Derive a doc page's metadata (slug, title, group, order, …) from one
 * {@link DocInput} — the single place that resolution rule lives, so the page
 * builder ({@link buildDocPages}) and the `@tutorial`/`{@link}` resolver
 * ({@link makeDocResolver}) can never disagree about a page's slug.
 *
 * - `slug` = frontmatter `slug` ?? slugified `path` (no prefix); `index` → `''`.
 * - `title` = frontmatter → input → humanized basename.
 * - `group` = frontmatter → input → humanized directory path → default.
 * - `order`/`hidden` from frontmatter (or `input.order`).
 */
function deriveDocMeta(
  input: DocInput,
  opts: { defaultDocGroup?: string; parseFrontmatter: boolean }
): DocMeta {
  const rawContent = typeof input.content === 'string' ? input.content : '';
  const { data, body } = opts.parseFrontmatter
    ? parseFrontmatter(rawContent)
    : { data: {} as Record<string, unknown>, body: rawContent };

  const segments = pathSegments(input.path);
  const basename = segments.length > 0 ? segments[segments.length - 1] : input.path;
  const isHome = input.path === 'index';

  // slug: frontmatter override, else slugify the path (no prefix).
  const slugFromData = asString(data.slug);
  const slug = isHome ? '' : (slugFromData ?? slugifyPath(segments));

  // title: frontmatter → input → humanized basename.
  const title = asString(data.title) ?? (input.title?.trim() || undefined) ?? humanize(basename);

  // group: frontmatter → input → directory path (humanized) → default.
  const dirSegments = segments.slice(0, -1);
  const dirGroup = dirSegments.length > 0 ? dirSegments.map(humanize).join('/') : undefined;
  const group =
    asString(data.group) ?? (input.group?.trim() || undefined) ?? dirGroup ?? opts.defaultDocGroup;

  const order = asNumber(data.order) ?? input.order;
  const hidden = asBoolean(data.hidden) ?? false;
  const kind = isHome ? 'index' : 'guide';

  return { slug, title, group, order, hidden, isHome, kind, body };
}

/**
 * Adapt the tutorial tree into {@link DocInput}s for {@link buildDocPages},
 * depth-first (parent before its children — JSDoc's resolved order). Each
 * tutorial gets the path `tutorials/<name>` (so slugify yields exactly today's
 * `tutorials/<name>`), its title, source type/content, and an incrementing
 * `order`.
 *
 * The sidebar **group** mirrors the tutorial hierarchy (issue #253): a tutorial
 * that has sub-tutorials opens a nested group named after itself
 * (`Tutorials/<title>`), with its own page as the first entry; a leaf sits
 * directly in its parent's group. {@link buildGroupTree} turns these `/`-paths
 * into nested, collapsible nav branches. A flat tutorial set still yields one
 * flat "Tutorials" group, and page slugs/frontmatter/bodies are unchanged either
 * way — only the nav grouping reflects the hierarchy.
 */
export function tutorialsToDocInputs(tutorials: readonly TutorialInput[]): DocInput[] {
  const out: DocInput[] = [];
  let order = 0;
  const walk = (t: TutorialInput, parentGroup: string): void => {
    const title = t.title?.trim() || t.name;
    const hasChildren = (t.children?.length ?? 0) > 0;
    // A parent (has sub-tutorials) opens a collapsible group named after itself;
    // its page + children live inside it. A leaf stays in its parent's group.
    const group = hasChildren ? `${parentGroup}/${title}` : parentGroup;
    out.push({
      path: `${TUTORIAL_SLUG_PREFIX}/${t.name}`,
      content: typeof t.content === 'string' ? t.content : '',
      type: t.type,
      group,
      title,
      order: order++,
    });
    for (const child of t.children ?? []) walk(child, group);
  };
  for (const t of tutorials) walk(t, TUTORIALS_GROUP);
  return out;
}

/**
 * Build guide pages + nav entries from the tutorial tree. The hierarchy drives
 * the sidebar grouping (issue #253): a parent tutorial becomes a nested,
 * collapsible group (see {@link tutorialsToDocInputs}); a flat tutorial set
 * stays a single "Tutorials" group.
 *
 * Expressed via the shared {@link buildDocPages} builder. Frontmatter parsing is
 * disabled so a tutorial whose content begins with `---` keeps its exact output;
 * page slugs / frontmatter / bodies are unchanged — only the nav grouping now
 * reflects the hierarchy.
 */
export function buildTutorialPages(
  tutorials: readonly TutorialInput[],
  resolveLink?: (target: string) => ResolvedLink | null
): { pages: Page[]; nav: NavNode[] } {
  return buildDocPages(tutorialsToDocInputs(tutorials), { parseFrontmatter: false }, resolveLink);
}
