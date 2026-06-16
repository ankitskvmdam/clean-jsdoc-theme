/**
 * HTML document skeleton + utilities.
 *
 * `renderHtmlDocument` builds the full `<html>...</html>` shell around the
 * SSR'd body. The order in `<head>` is load-bearing:
 *
 *   1. charset + viewport
 *   2. title + description meta
 *   3. pre-hydration theme script (inline) — MUST come before the stylesheet
 *      so `data-theme` is set on `<html>` before any styled paint happens
 *   4. stylesheet `<link>`
 *
 * The body holds the rendered Preact tree plus a single JSON props payload
 * script and a tiny inline loader that lazy-imports island chunks.
 */

import type { Page, IslandName, MetaTag } from '@clean-jsdoc-theme/utils';
import type { IslandRecord } from './layout';
import { getPreHydrationThemeScript } from './theme-script';
import { getIslandsLoaderScript } from './islands-loader';
import { getHeadingAnchorsScript } from './heading-anchors';
import { getScrollbarScript } from './scrollbar-script';

export interface HtmlDocumentOptions {
  page: Page;
  bodyHtml: string;
  islands: IslandRecord[];
  cssHref: string;
  /** Site name suffix appended to `<title>`. */
  siteName?: string;
  /** Map from island name to its content-hashed chunk href (the loader's import map). */
  islandChunks: Record<string, string>;
  /** Optional base path. */
  basePath?: string;
  /**
   * Site-wide per-provider playground options (`ThemeConfig.playground`'s
   * `codepen`/`jsfiddle`/`codesandbox` records). Emitted as a single
   * `<script data-playground-config>` JSON payload — but only on pages that
   * actually contain a `playground` marker — for the playground island to read.
   * Omitted when the feature is off, so those pages stay byte-identical.
   */
  playground?: Record<string, unknown>;
  /** Google Fonts family names to load for headings, body, and code. */
  fonts?: { heading: string; body: string; mono: string };
  /** Stylesheet hrefs (content-hashed custom-CSS assets), `<link>`ed after the theme stylesheet so they can override. */
  customCssLinks?: string[];
  /** Inline custom CSS, emitted as a `<style>` after the stylesheet/customCssLinks so it can override. */
  customCss?: string;
  /** Script srcs (content-hashed custom-JS assets), referenced before `</body>`, after the theme's own scripts. */
  customJsLinks?: string[];
  /** Inline custom JS, emitted as a classic `<script>` before `</body>`, last of all scripts. */
  customJs?: string;
  /**
   * Site-wide custom `<meta>` tags (`ThemeConfig.meta`). Emitted into `<head>`
   * after the theme's own defaults, which are skipped where an author entry
   * shares the same identifying attribute (de-dupe). Values are escaped and
   * invalid attribute names dropped.
   */
  meta?: MetaTag[];
  /** Active locale code for `<html lang>` (defaults to `en`). */
  lang?: string;
  /**
   * Active-locale chrome i18n, embedded in the per-page payload as `__i18n` so
   * each island root can seed its own `LanguageProvider` at hydration. Omitted
   * for a normal (non-localized) build — the payload then carries only islands.
   */
  i18n?: { locale: string; defaultLocale: string; messages: Record<string, string> };
  /**
   * hreflang alternates for this page (localized builds with >1 locale): one
   * `<link rel="alternate" hreflang>` per locale (root-relative URLs, since the
   * site domain isn't known at build time) plus an `x-default` pointing at the
   * default locale. Omitted for a normal build.
   */
  hreflang?: { alternates: Array<{ code: string; href: string }>; defaultLocale: string };
}

/** Build the `<link rel="alternate" hreflang>` tags (incl. `x-default`). */
function buildHreflangLinks(hreflang: HtmlDocumentOptions['hreflang']): string {
  if (!hreflang || hreflang.alternates.length === 0) return '';
  const links = hreflang.alternates.map(
    (a) => `<link rel="alternate" hreflang="${escapeHtml(a.code)}" href="${escapeHtml(a.href)}" />`
  );
  const def = hreflang.alternates.find((a) => a.code === hreflang.defaultLocale);
  if (def) {
    links.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(def.href)}" />`);
  }
  return links.join('');
}

/** HTML attribute name shape — a crafted key can't inject extra attributes. */
const META_ATTR_NAME_RE = /^[A-Za-z][A-Za-z0-9-]*$/;

/**
 * The de-dupe identity of a `<meta>` tag: the value of its first identifying
 * attribute (`charset`, then `name` / `property` / `http-equiv`), or `undefined`
 * when it has none. `charset` collapses to the bare key (there's only one
 * charset); the others key off `attr=value` (case-insensitive). An author tag
 * sharing an identity with a theme default makes the theme skip its own.
 */
function metaIdentity(tag: MetaTag): string | undefined {
  const charset = tag.charset;
  if (typeof charset === 'string' && charset.trim()) return 'charset';
  for (const attr of ['name', 'property', 'http-equiv'] as const) {
    const v = tag[attr];
    if (typeof v === 'string' && v.trim()) return `${attr}=${v.trim().toLowerCase()}`;
  }
  return undefined;
}

/**
 * Render one author `<meta>` tag from its attribute map. Attribute names that
 * aren't simple HTML names are dropped (so a crafted key can't inject markup),
 * and every value is HTML-escaped. Returns '' when nothing valid remains.
 */
function renderMetaTag(tag: MetaTag): string {
  const attrs: string[] = [];
  for (const [k, v] of Object.entries(tag)) {
    if (!META_ATTR_NAME_RE.test(k) || typeof v !== 'string') continue;
    attrs.push(`${k}="${escapeHtml(v)}"`);
  }
  return attrs.length > 0 ? `<meta ${attrs.join(' ')} />` : '';
}

/** CSS generic family keywords — never requested from Google Fonts. */
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
  'inherit',
  'initial',
  'revert',
  'unset',
]);

/**
 * The first concrete family in a CSS font stack — unquoted and trimmed. Returns
 * '' when the stack leads with a generic keyword (e.g. the default `mono` stack
 * `ui-monospace, …`), so a system stack never gets requested from Google Fonts.
 */
function primaryFamily(value: string): string {
  const first = (value.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '');
  return !first || GENERIC_FAMILIES.has(first.toLowerCase()) ? '' : first;
}

/**
 * Build the Google Fonts `<link>` block for the configured heading/body/mono
 * families. Each family is reduced to its primary name (so a `mono` value that
 * is a system stack contributes nothing), deduped (heading === body emits one),
 * and requested at the weights the theme uses (400–700). Returns '' when no
 * loadable family is set.
 */
export function buildGoogleFontsLinks(fonts?: {
  heading: string;
  body: string;
  mono: string;
}): string {
  if (!fonts) return '';
  const families = [
    ...new Set([fonts.heading, fonts.body, fonts.mono].map(primaryFamily).filter(Boolean)),
  ];
  if (families.length === 0) return '';
  const params = families
    .map(
      (family) => `family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700`
    )
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  return (
    `<link rel="preconnect" href="https://fonts.googleapis.com" />` +
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />` +
    `<link rel="stylesheet" href="${escapeHtml(href)}" />`
  );
}

/**
 * Guard raw user CSS against breaking out of its `<style>` element. CSS has no
 * comment/quote that can terminate the element, so the only break-out is a
 * literal `</style` — split it so the parser never sees a closing tag. The CSS
 * itself is otherwise emitted verbatim (it must not be HTML-escaped).
 */
function escapeStyleContent(css: string): string {
  return css.replace(/<\/(style)/gi, '<\\/$1');
}

/**
 * Guard raw user JS against breaking out of its `<script>` element: a literal
 * `</script` in a string/regex/comment would close the block. Split it the
 * standard way (`<\/script`) — harmless in JS source, parser-safe in HTML.
 */
function escapeScriptContent(js: string): string {
  return js.replace(/<\/(script)/gi, '<\\/$1');
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Built from code points so the source file stays plain ASCII.
const U2028 = String.fromCharCode(0x2028);
const U2029 = String.fromCharCode(0x2029);

function escapeJsonForScript(json: string): string {
  // Defend against `</script>` injection and Unicode line separators that
  // break in JavaScript string contexts.
  return json.split('</').join('<\\/').split(U2028).join('\\u2028').split(U2029).join('\\u2029');
}

export function buildIslandsPropsPayload(
  islands: IslandRecord[],
  i18n?: { locale: string; defaultLocale: string; messages: Record<string, string> }
): string {
  const obj: Record<string, unknown> = {};
  for (const island of islands) obj[island.id] = island.props;
  // `__i18n` is a reserved key (island ids are `i0`, `i1`, …) read by the island
  // loader to seed each root's `LanguageProvider`. Only present in localized builds.
  if (i18n) obj.__i18n = i18n;
  return escapeJsonForScript(JSON.stringify(obj));
}

export function collectIslandNamesOnPage(islands: IslandRecord[]): IslandName[] {
  const set = new Set<IslandName>();
  for (const island of islands) set.add(island.name);
  return [...set];
}

export function renderHtmlDocument(opts: HtmlDocumentOptions): string {
  const { page, bodyHtml, islands, cssHref, siteName, islandChunks, fonts } = opts;
  const { customCssLinks, customCss, customJsLinks, customJs } = opts;
  const lang = opts.lang || 'en';
  const titleSuffix = siteName ? ` | ${escapeHtml(siteName)}` : '';
  const title = `${escapeHtml(page.frontmatter.title)}${titleSuffix}`;
  const description = escapeHtml(page.frontmatter.description ?? '');
  const propsPayload = buildIslandsPropsPayload(islands, opts.i18n);
  const islandNames = collectIslandNamesOnPage(islands);
  const loaderScript = getIslandsLoaderScript(islandNames, islandChunks);
  const themeScript = getPreHydrationThemeScript();

  // Author <meta> tags (site-wide). Theme defaults are emitted first, then these
  // — but a theme default is skipped when an author entry shares its identifying
  // attribute (so `name: "description"` replaces the auto description, etc.).
  const authorMeta = opts.meta ?? [];
  const authorIdentities = new Set(
    authorMeta.map(metaIdentity).filter((id): id is string => Boolean(id))
  );
  const authorMetaHtml = authorMeta.map(renderMetaTag).join('');

  // Site-wide playground options, emitted once per page — but only when the body
  // actually carries a playground marker, so pages without one stay byte-identical.
  const playgroundConfig =
    opts.playground && bodyHtml.includes('data-island="playground"')
      ? escapeJsonForScript(JSON.stringify(opts.playground))
      : undefined;

  return (
    `<!doctype html>` +
    `<html lang="${escapeHtml(lang)}">` +
    `<head>` +
    (authorIdentities.has('charset') ? '' : `<meta charset="utf-8" />`) +
    (authorIdentities.has('name=viewport')
      ? ''
      : `<meta name="viewport" content="width=device-width, initial-scale=1" />`) +
    `<title>${title}</title>` +
    (description && !authorIdentities.has('name=description')
      ? `<meta name="description" content="${description}" />`
      : '') +
    authorMetaHtml +
    buildHreflangLinks(opts.hreflang) +
    `<script>${themeScript}</script>` +
    buildGoogleFontsLinks(fonts) +
    `<link rel="stylesheet" href="${escapeHtml(cssHref)}" />` +
    // Custom CSS comes AFTER the theme stylesheet so it can override: the file
    // links first (in order), then the inline string (so inline beats the files).
    (customCssLinks ?? [])
      .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}" />`)
      .join('') +
    (customCss ? `<style>${escapeStyleContent(customCss)}</style>` : '') +
    `</head>` +
    `<body>` +
    bodyHtml +
    `<script type="application/json" data-island-props>${propsPayload}</script>` +
    (playgroundConfig
      ? `<script type="application/json" data-playground-config>${playgroundConfig}</script>`
      : '') +
    `<script type="module">${loaderScript}</script>` +
    `<script>${getHeadingAnchorsScript()}</script>` +
    `<script>${getScrollbarScript()}</script>` +
    // Custom JS runs last, after the theme's own scripts: the file links first
    // (in order), then the inline string. Classic scripts (not modules) for v4 parity.
    (customJsLinks ?? []).map((src) => `<script src="${escapeHtml(src)}"></script>`).join('') +
    (customJs ? `<script>${escapeScriptContent(customJs)}</script>` : '') +
    `</body>` +
    `</html>`
  );
}

/**
 * Strip an MDX/HTML body to a plain-text excerpt for Pagefind/search snippets.
 * Heuristic, not exhaustive: fences, headings, links, images, formatting marks,
 * and any HTML tags get peeled away.
 */
export function extractExcerpt(mdxBody: string, max = 200): string {
  let text = mdxBody
    .replace(/^---[\s\S]*?---\s*/u, '') // frontmatter
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → label
    .replace(/<[^>]+>/g, ' ') // raw HTML / JSX
    .replace(/^#{1,6}\s+/gm, '') // ATX headings
    .replace(/[*_~>#]+/g, ' ') // emphasis & blockquotes
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > max) {
    text = text.slice(0, max).replace(/\s+\S*$/, '') + '…';
  }
  return text;
}

/**
 * Full plain-text of an MDX body for the search index's `content` field — the
 * whole page, not a 200-char snippet, so README prose and member descriptions
 * are searchable. Differs from {@link extractExcerpt} in two ways that matter
 * for code docs: inline code is **unwrapped** (`` `foo` `` → `foo`) rather than
 * dropped, so member/field/method identifiers stay searchable; and there is no
 * length cap. Fenced code blocks are still dropped (too noisy/large for fuzzy
 * ranking). The result is capped at `max` to keep the index from ballooning on
 * a pathologically long page.
 */
export function extractSearchText(mdxBody: string, max = 20000): string {
  const text = mdxBody
    .replace(/^---[\s\S]*?---\s*/u, '') // frontmatter
    .replace(/```[\s\S]*?```/g, ' ') // fenced code (noisy/large)
    .replace(/`([^`]*)`/g, '$1') // inline code → keep the identifier
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → label
    .replace(/<[^>]+>/g, ' ') // raw HTML / JSX
    .replace(/^#{1,6}\s+/gm, '') // ATX heading markers (keep the text)
    .replace(/[*_~>#|]+/g, ' ') // emphasis / blockquote / table marks
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max) : text;
}

/** Slug → output HTML path. Empty/root slug becomes `index.html`. */
export function htmlPathFor(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  if (clean === '' || clean === 'index') return 'index.html';
  return `${clean}/index.html`;
}

/**
 * Slug → companion Markdown path, co-located with the HTML (`index.html` →
 * `index.md`). This is the page's MDX body written verbatim, so an LLM (or a
 * future "copy page" button) can fetch the source markdown for the page it's on
 * by swapping `index.html` for `index.md`.
 */
export function mdPathFor(slug: string): string {
  return htmlPathFor(slug).replace(/\.html$/, '.md');
}
