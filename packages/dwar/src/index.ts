/**
 * @clean-jsdoc-theme/dwar
 *
 * Renders a SiteManifest into HTML/CSS/JS files (Preact + MDX + utility CSS +
 * esbuild islands), and provides a separate post-write hook for Pagefind.
 *
 * `render()` is pure: it returns an in-memory RenderResult. Callers write the
 * files themselves and then optionally call `runPagefindAgainstDir`.
 */

import { h } from 'preact';
import { render as renderToString } from 'preact-render-to-string';
import { defaultMdxComponents, CodeViewer } from '@clean-jsdoc-theme/rang';
import { siteNameText } from '@clean-jsdoc-theme/utils';
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
} from '@clean-jsdoc-theme/utils';

import { compileMdxToComponent, type MdxComponentMap, type ShikiThemes } from './mdx';
import { SsrLayout, renderIsland, type IslandRecord } from './layout';
import { renderHtmlDocument, htmlPathFor, extractExcerpt } from './html';
import { bundleIslands, ALL_ISLANDS } from './islands-bundle';
import { buildCss } from './css';

export const DWAR_PACKAGE_VERSION = '5.0.0-alpha.0';

function mergeMdxComponents(
  override?: Record<string, unknown>,
): MdxComponentMap {
  if (!override) return { ...defaultMdxComponents };
  // ComponentOverrides.mdxComponents is typed `ComponentType<any>`; the cast is safe.
  return { ...defaultMdxComponents, ...(override as MdxComponentMap) };
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
  fonts: { heading: string; body: string },
  shiki: ShikiThemes,
): Promise<{ file: OutputFile; search: SearchEntry; islands: IslandRecord[] }> {
  const islands: IslandRecord[] = [];

  // `kind: 'source'` pages are whole-file viewers, not MDX. We skip the MDX
  // compile entirely and render the file as a `code-viewer` island so it gets a
  // real `data-island` marker. The SSR `<pre>` carries the file text (via
  // `ssrProps.code`), while the JSON payload deliberately omits `code` — the
  // hydration chunk reads it back from the DOM (see islands-loader.ts).
  let mainContent: ReturnType<typeof h>;
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
    mainContent = h(MdxComponent, {});
  }

  const layoutVNode = h(
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
    mainContent,
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
  });

  const file: OutputFile = {
    path: htmlPathFor(page.slug),
    contents: html,
  };

  const search: SearchEntry = {
    slug: page.slug,
    title: page.frontmatter.title,
    // Source pages are `hidden` (render() skips search.push for them) and have
    // an empty body, so there is nothing meaningful to excerpt.
    excerpt: page.frontmatter.kind === 'source' ? '' : extractExcerpt(page.body),
  };

  return { file, search, islands };
}

/**
 * Render a SiteManifest to in-memory output files. Pure: dwar does not write
 * to disk. Callers persist `result.files` themselves, then optionally call
 * `runPagefindAgainstDir` against the destination.
 */
export async function render(
  manifest: SiteManifest,
  opts: RenderOptions,
): Promise<RenderResult> {
  const start = Date.now();
  const theme = opts.theme;
  const basePath = theme.basePath ?? '/';
  const siteName = theme.tokens.siteName;
  const components = mergeMdxComponents(
    theme.components?.mdxComponents as Record<string, unknown> | undefined,
  );

  // Determine islands used across the build so we only bundle what's referenced.
  // Every page goes through SsrLayout, which emits the cmdk, theme-toggle, and
  // settings markers in the header plus sidebar and toc in the body. The
  // MDX-embedded islands (`code-tabs`, `copy-btn`) are still bundled so the
  // chunks are available if/when MDX content uses them.
  const islandSet = new Set<IslandName>(ALL_ISLANDS);

  const css = buildCss(theme.tokens, manifest.buildId);
  const cssHref = `/${css.path}`;
  const islandsBase = `/_islands`;
  // The fuzzy-search index the cmdk island fetches. Build-id stamped so it
  // cache-busts alongside the stylesheet/chunks.
  const searchIndexPath = `_assets/search-index.${manifest.buildId}.json`;
  const searchIndexUrl = `/${searchIndexPath}`;

  const files: OutputFile[] = [];
  const search: SearchEntry[] = [];
  const errors: RenderError[] = [];

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
        theme.tokens.fonts,
        theme.tokens.shiki,
      );
      files.push(file);
      if (!page.frontmatter.hidden) search.push(entry);
    } catch (err) {
      errors.push({
        slug: page.slug,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Number of HTML pages actually rendered (before assets are appended).
  const renderedPageCount = files.length;

  // CSS file.
  files.push({ path: css.path, contents: css.contents });

  // Fuzzy-search index: the non-hidden pages' SearchEntry list, fetched by the
  // cmdk island at runtime. (Pagefind's full-text bundle is a separate concern.)
  files.push({ path: searchIndexPath, contents: JSON.stringify(search) });

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
  SiteName,
  SiteLogo,
  ComponentOverrides,
  Override,
  IslandName,
  IslandPropsMap,
} from '@clean-jsdoc-theme/utils';
