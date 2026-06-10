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

import type { Page, IslandName } from '@clean-jsdoc-theme/utils';
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
  /** Asset path prefix for island chunks. */
  islandsBase: string;
  /** Optional base path. */
  basePath?: string;
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
      (family) =>
        `family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700`,
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
  return json
    .split('</')
    .join('<\\/')
    .split(U2028)
    .join('\\u2028')
    .split(U2029)
    .join('\\u2029');
}

export function buildIslandsPropsPayload(islands: IslandRecord[]): string {
  const obj: Record<string, unknown> = {};
  for (const island of islands) obj[island.id] = island.props;
  return escapeJsonForScript(JSON.stringify(obj));
}

export function collectIslandNamesOnPage(islands: IslandRecord[]): IslandName[] {
  const set = new Set<IslandName>();
  for (const island of islands) set.add(island.name);
  return [...set];
}

export function renderHtmlDocument(opts: HtmlDocumentOptions): string {
  const { page, bodyHtml, islands, cssHref, siteName, islandsBase, fonts } = opts;
  const { customCssLinks, customCss, customJsLinks, customJs } = opts;
  const titleSuffix = siteName ? ` | ${escapeHtml(siteName)}` : '';
  const title = `${escapeHtml(page.frontmatter.title)}${titleSuffix}`;
  const description = escapeHtml(page.frontmatter.description ?? '');
  const propsPayload = buildIslandsPropsPayload(islands);
  const islandNames = collectIslandNamesOnPage(islands);
  const loaderScript = getIslandsLoaderScript(islandNames, islandsBase);
  const themeScript = getPreHydrationThemeScript();

  return (
    `<!doctype html>` +
    `<html lang="en">` +
    `<head>` +
    `<meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<title>${title}</title>` +
    (description ? `<meta name="description" content="${description}" />` : '') +
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
    `<script type="module">${loaderScript}</script>` +
    `<script>${getHeadingAnchorsScript()}</script>` +
    `<script>${getScrollbarScript()}</script>` +
    // Custom JS runs last, after the theme's own scripts: the file links first
    // (in order), then the inline string. Classic scripts (not modules) for v4 parity.
    (customJsLinks ?? [])
      .map((src) => `<script src="${escapeHtml(src)}"></script>`)
      .join('') +
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
