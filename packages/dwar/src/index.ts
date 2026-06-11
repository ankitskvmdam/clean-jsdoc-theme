/**
 * @clean-jsdoc-theme/dwar
 *
 * Renders a SiteManifest into HTML/CSS/JS files (Preact + MDX + utility CSS +
 * esbuild islands), and provides a separate post-write hook for Pagefind.
 *
 * `render()` is pure: it returns an in-memory RenderResult. Callers write the
 * files themselves and then optionally call `runPagefindAgainstDir`.
 */

import { h, Fragment } from 'preact';
import type { ComponentChildren } from 'preact';
import { render as renderToString } from 'preact-render-to-string';
import {
  defaultMdxComponents,
  CodeViewer,
  CopyPageButton,
  PageNav,
  HeaderSlotContext,
} from '@clean-jsdoc-theme/rang';
import type { PageNavLink } from '@clean-jsdoc-theme/rang';
import { siteNameText, withBase } from '@clean-jsdoc-theme/utils';
import { BasePathContext } from '@clean-jsdoc-theme/rang';
import type {
  OutputFile,
  Page,
  RenderError,
  RenderOptions,
  RenderResult,
  SearchEntry,
  SiteManifest,
  SiteName,
  IslandName,
  NavNode,
  CopyPageAction,
} from '@clean-jsdoc-theme/utils';

import { compileMdxToComponent, type MdxComponentMap, type ShikiThemes } from './mdx';
import { SsrLayout, renderIsland, type IslandRecord } from './layout';
import {
  renderHtmlDocument,
  htmlPathFor,
  mdPathFor,
  extractExcerpt,
  extractSearchText,
} from './html';
import { bundleIslands, ALL_ISLANDS } from './islands-bundle';
import { buildCss } from './css';

export const DWAR_PACKAGE_VERSION = '5.0.0-alpha.0';

function mergeMdxComponents(override?: Record<string, unknown>): MdxComponentMap {
  if (!override) return { ...defaultMdxComponents };
  // ComponentOverrides.mdxComponents is typed `ComponentType<any>`; the cast is safe.
  return { ...defaultMdxComponents, ...(override as MdxComponentMap) };
}

/** A page's adjacent pages in sidebar reading order, for the prev/next pager. */
interface PageNeighbors {
  prev?: PageNavLink;
  next?: PageNavLink;
}

/** Max length of a neighbor-card description before it's truncated. */
const PAGE_NAV_DESC_MAX = 100;

/**
 * Flatten the nav tree into the linear reading order the sidebar shows: a
 * depth-first walk collecting every real page leaf (a node with a `slug`),
 * skipping external links (`href`) and top-region menu entries.
 */
function flattenNavSlugs(nav: NavNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: NavNode[]): void => {
    for (const node of nodes) {
      if (node.slug !== undefined && !node.href && !node.menu) out.push(node.slug);
      if (node.children) walk(node.children);
    }
  };
  walk(nav);
  return out;
}

/** Truncate a card description to {@link PAGE_NAV_DESC_MAX}, on a word boundary. */
function truncateDesc(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const t = text.trim();
  if (t.length <= PAGE_NAV_DESC_MAX) return t || undefined;
  const slice = t.slice(0, PAGE_NAV_DESC_MAX);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

/**
 * Map each non-hidden page to its previous/next neighbors in reading order.
 * Returns an empty map when the pager is disabled.
 */
function computeNeighbors(manifest: SiteManifest, enabled: boolean): Map<string, PageNeighbors> {
  const map = new Map<string, PageNeighbors>();
  if (!enabled) return map;
  const pageBySlug = new Map(manifest.pages.map((p) => [p.slug, p]));
  const ordered = flattenNavSlugs(manifest.nav).filter((slug) => {
    const p = pageBySlug.get(slug);
    return !!p && !p.frontmatter.hidden;
  });
  const toLink = (slug: string): PageNavLink | undefined => {
    const p = pageBySlug.get(slug);
    if (!p) return undefined;
    return {
      slug,
      title: p.frontmatter.title,
      description: truncateDesc(p.frontmatter.description),
    };
  };
  ordered.forEach((slug, i) => {
    map.set(slug, {
      prev: i > 0 ? toLink(ordered[i - 1]) : undefined,
      next: i < ordered.length - 1 ? toLink(ordered[i + 1]) : undefined,
    });
  });
  return map;
}

async function renderPage(
  page: Page,
  manifest: SiteManifest,
  components: MdxComponentMap,
  basePath: string,
  cssHref: string,
  islandsBase: string,
  searchIndexUrl: string,
  siteName: SiteName | undefined,
  aiPrompt: string | undefined,
  copyPageEnabled: boolean,
  copyPageActions: CopyPageAction[] | undefined,
  fonts: { heading: string; body: string; mono: string },
  shiki: ShikiThemes,
  custom: { cssLinks?: string[]; css?: string; jsLinks?: string[]; js?: string },
  neighbors: PageNeighbors | undefined
): Promise<{ file: OutputFile; search: SearchEntry; islands: IslandRecord[] }> {
  const islands: IslandRecord[] = [];

  // `kind: 'source'` pages are whole-file viewers, not MDX. We skip the MDX
  // compile entirely and render the file as a `code-viewer` island so it gets a
  // real `data-island` marker. The SSR `<pre>` carries the file text (via
  // `ssrProps.code`), while the JSON payload deliberately omits `code` — the
  // hydration chunk reads it back from the DOM (see islands-loader.ts).
  let mainContent: ComponentChildren;
  if (page.frontmatter.kind === 'source' && page.source) {
    const { code, language, filename } = page.source;
    // No per-page highlight line for a whole-file view; the `#L42` deep-link is
    // a browser-hash concern handled client-side, so leave highlightLine unset.
    mainContent = renderIsland({
      name: 'code-viewer',
      islands,
      Component: CodeViewer,
      props: { language, filename, highlightLine: undefined },
      ssrProps: { code, language, filename, highlightLine: undefined },
    });
  } else {
    const { Component: MdxComponent } = await compileMdxToComponent(page.body, components, shiki);
    // The copy-page button is for documentation content only — never the source
    // section (its viewer pages are `kind: 'source'` and skip this branch; the
    // "Source Files" index lives at the `source` slug and is excluded here too).
    const inSourceSection = page.slug === 'source' || page.slug.startsWith('source/');
    if (copyPageEnabled && !inSourceSection) {
      // Copy-page split button: copies the page's companion .md, or opens it /
      // hands it to ChatGPT/Claude/Perplexity. It's handed to the MDX render via
      // HeaderSlotContext so the first heading places it in a row beside the title.
      const resolvedSiteName = siteNameText(siteName, manifest.pkg?.name);
      const copyPage = renderIsland({
        name: 'copy-page',
        islands,
        Component: CopyPageButton,
        props: {
          mdUrl: withBase(basePath, '/' + mdPathFor(page.slug)),
          ...(resolvedSiteName ? { siteName: resolvedSiteName } : {}),
          ...(aiPrompt ? { prompt: aiPrompt } : {}),
          ...(copyPageActions ? { actions: copyPageActions } : {}),
        },
      });
      mainContent = h(
        HeaderSlotContext.Provider,
        { value: { node: copyPage, placed: false } },
        h(MdxComponent, {})
      );
    } else {
      mainContent = h(MdxComponent, {});
    }
  }

  // Prev/next pager below the body (content pages only — never the source
  // viewer). Rendered nothing when the page has no neighbors.
  const pager =
    neighbors &&
    (neighbors.prev || neighbors.next) &&
    page.frontmatter.kind !== 'source'
      ? h(PageNav, { prev: neighbors.prev, next: neighbors.next, basePath })
      : null;
  const pageBody = pager ? h(Fragment, null, mainContent, pager) : mainContent;

  // In-content links (MdxA / SourceLink / MemberMeta) read the base-path from a
  // Preact context. This is SSR-only — the MDX body is rendered to a string and
  // never hydrated as a whole — so the context value is baked into the markup
  // with no hydration concern. Islands (Step 4) rely on PROPS, not this context.
  const layoutVNode = h(
    BasePathContext.Provider,
    { value: basePath },
    h(
      SsrLayout,
      {
        nav: manifest.nav,
        currentSlug: page.slug,
        headings: page.headings ?? [],
        pkg: manifest.pkg,
        siteName,
        basePath,
        searchIndexUrl,
        islands,
      },
      pageBody
    )
  );

  const bodyHtml = renderToString(layoutVNode);

  const html = renderHtmlDocument({
    page,
    bodyHtml,
    islands,
    cssHref,
    siteName: siteNameText(siteName, manifest.pkg?.name),
    islandsBase,
    fonts,
    customCssLinks: custom.cssLinks,
    customCss: custom.css,
    customJsLinks: custom.jsLinks,
    customJs: custom.js,
  });

  const file: OutputFile = {
    path: htmlPathFor(page.slug),
    contents: html,
  };

  // Source pages are `hidden` (render() skips search.push for them) and have
  // an empty body, so there is nothing meaningful to index.
  const isSource = page.frontmatter.kind === 'source';
  const search: SearchEntry = {
    slug: page.slug,
    title: page.frontmatter.title,
    excerpt: isSource ? '' : extractExcerpt(page.body),
    // `description` + `content` are matched (not just the title), so README
    // prose, member descriptions, and identifiers across the whole page are
    // findable — not only what fits in the 200-char excerpt.
    description: page.frontmatter.description,
    content: isSource ? undefined : extractSearchText(page.body),
  };

  return { file, search, islands };
}

/**
 * Deep-link search entries for a page's members. Members / fields / methods
 * render as H3+ headings (H2 is a section header like "Methods"), so each H3+
 * heading becomes its own entry pointing at `slug#anchor` — searching a member
 * name jumps straight to it. `title` is the member name; `context` is the parent
 * page title, shown beside the hit. Hidden pages and pages without pre-extracted
 * headings contribute nothing.
 */
function memberSearchEntries(page: Page): SearchEntry[] {
  if (page.frontmatter.hidden || !page.headings) return [];
  return page.headings
    .filter((heading) => heading.depth >= 3)
    .map((heading) => ({
      slug: `${page.slug}#${heading.id}`,
      title: heading.text,
      context: page.frontmatter.title,
    }));
}

/**
 * Render a SiteManifest to in-memory output files. Pure: dwar does not write
 * to disk. Callers persist `result.files` themselves, then optionally call
 * `runPagefindAgainstDir` against the destination.
 */
export async function render(manifest: SiteManifest, opts: RenderOptions): Promise<RenderResult> {
  const start = Date.now();
  const theme = opts.theme;
  const basePath = theme.basePath ?? '/';
  const siteName = theme.tokens.siteName;
  const components = mergeMdxComponents(
    theme.components?.mdxComponents as Record<string, unknown> | undefined
  );

  // Determine islands used across the build so we only bundle what's referenced.
  // Every page goes through SsrLayout, which emits the cmdk, theme-toggle, and
  // settings markers in the header plus sidebar and toc in the body. The
  // MDX-embedded islands (`code-tabs`, `copy-btn`) are still bundled so the
  // chunks are available if/when MDX content uses them.
  const islandSet = new Set<IslandName>(ALL_ISLANDS);

  // Copy-page button: on by default; `enabled: false` opts out entirely.
  // `actions` (undefined → all) controls which dropdown items appear.
  const copyPageEnabled = theme.copyPage?.enabled !== false;
  const copyPageActions = theme.copyPage?.actions;

  // Prev/next pager: on by default; `pageNav.enabled: false` opts out. Neighbors
  // are computed once from the nav reading order and looked up per page.
  const neighborsBySlug = computeNeighbors(manifest, theme.pageNav?.enabled !== false);

  const css = buildCss(theme.tokens, manifest.buildId);
  const cssHref = withBase(basePath, '/' + css.path);
  const islandsBase = withBase(basePath, '/_islands');

  // Custom CSS/JS (v4 parity). Inline strings are injected verbatim into every
  // page's shell. Custom *files* are copied to content-hashed assets by the
  // bridge (the I/O layer) and arrive here only as hrefs to link, so render()
  // stays pure. Empty/whitespace-only inline values are treated as absent.
  const custom = {
    cssLinks: theme.customCssLinks,
    css: theme.customCss?.trim() || undefined,
    jsLinks: theme.customJsLinks,
    js: theme.customJs?.trim() || undefined,
  };
  // The fuzzy-search index the cmdk island fetches. Build-id stamped so it
  // cache-busts alongside the stylesheet/chunks.
  const searchIndexPath = `_assets/search-index.${manifest.buildId}.json`;
  const searchIndexUrl = withBase(basePath, '/' + searchIndexPath);

  const files: OutputFile[] = [];
  const search: SearchEntry[] = [];
  // Deep-link entries for members/fields/methods, kept separate from `search`
  // (which stays one-per-page for RenderResult): both go into the JSON index.
  const memberEntries: SearchEntry[] = [];
  const errors: RenderError[] = [];
  // Count HTML pages explicitly: each page may also emit a companion .md, which
  // must NOT inflate the page count (it's a per-page asset, not a page).
  let renderedPageCount = 0;

  // Render pages. A single page that fails to compile (e.g. MDX that won't
  // parse) must NOT abort the whole build — collect the failure and carry on so
  // the rest of the site still renders. The caller surfaces `result.errors`.
  for (const page of manifest.pages) {
    try {
      const { file, search: entry } = await renderPage(
        page,
        manifest,
        components,
        basePath,
        cssHref,
        islandsBase,
        searchIndexUrl,
        siteName,
        theme.aiPrompt,
        copyPageEnabled,
        copyPageActions,
        theme.tokens.fonts,
        theme.tokens.shiki,
        custom,
        neighborsBySlug.get(page.slug)
      );
      files.push(file);
      renderedPageCount++;
      // Companion .md alongside the .html: the page's MDX body written verbatim
      // (no transform), so LLMs and a future "copy page" button can fetch the
      // markdown source for the current page. Source-viewer pages have no body.
      if (page.body) files.push({ path: mdPathFor(page.slug), contents: page.body });
      if (!page.frontmatter.hidden) {
        search.push(entry);
        memberEntries.push(...memberSearchEntries(page));
      }
    } catch (err) {
      errors.push({
        slug: page.slug,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // CSS file.
  files.push({ path: css.path, contents: css.contents });

  // Fuzzy-search index fetched by the cmdk island at runtime: page entries plus
  // member deep-links. (Pagefind's full-text bundle is a separate concern.)
  files.push({ path: searchIndexPath, contents: JSON.stringify([...search, ...memberEntries]) });

  // Island chunks.
  const chunks = await bundleIslands({
    outDir: '_islands',
    islands: [...islandSet],
  });
  let jsBytes = 0;
  for (const chunk of chunks) {
    files.push({ path: chunk.path, contents: chunk.contents });
    jsBytes += chunk.byteSize;
  }

  const cssBytes = Buffer.byteLength(css.contents, 'utf8');
  const durationMs = Date.now() - start;

  // assetCount counts non-HTML files (CSS + JS chunks today).
  const assetCount = files.length - renderedPageCount;

  return {
    files,
    search,
    ...(errors.length > 0 ? { errors } : {}),
    stats: {
      pageCount: renderedPageCount,
      assetCount,
      cssBytes,
      jsBytes,
      durationMs,
    },
  };
}

export { runPagefindAgainstDir } from './pagefind';

// Re-export boundary types so consumers (e.g. publish.ts) can pull them from
// dwar alone without also importing from utils.
export type {
  OutputFile,
  RenderOptions,
  RenderResult,
  SiteManifest,
  Page,
  PageKind,
  Frontmatter,
  Heading,
  NavNode,
  SearchEntry,
  ThemeConfig,
  ThemeTokens,
  CopyPageConfig,
  CopyPageAction,
  PageNavConfig,
  SiteName,
  SiteLogo,
  ComponentOverrides,
  Override,
  IslandName,
  IslandPropsMap,
} from '@clean-jsdoc-theme/utils';
