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
import { defaultMdxComponents } from '@clean-jsdoc-theme/rang';
import type {
  OutputFile,
  Page,
  RenderOptions,
  RenderResult,
  SearchEntry,
  SiteManifest,
  IslandName,
} from '@clean-jsdoc-theme/utils';

import { compileMdxToComponent, type MdxComponentMap } from './mdx';
import { SsrLayout, type IslandRecord } from './layout';
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
  siteName: string | undefined,
  fonts: { heading: string; body: string },
): Promise<{ file: OutputFile; search: SearchEntry; islands: IslandRecord[] }> {
  const { Component: MdxComponent } = await compileMdxToComponent(page.body, components);

  const islands: IslandRecord[] = [];
  const layoutVNode = h(
    SsrLayout,
    {
      nav: manifest.nav,
      currentSlug: page.slug,
      headings: page.headings ?? [],
      pkg: manifest.pkg,
      siteName,
      basePath,
      islands,
    },
    h(MdxComponent, {}),
  );

  const bodyHtml = renderToString(layoutVNode);

  const html = renderHtmlDocument({
    page,
    bodyHtml,
    islands,
    cssHref,
    siteName: siteName ?? manifest.pkg?.name,
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
    excerpt: extractExcerpt(page.body),
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

  const files: OutputFile[] = [];
  const search: SearchEntry[] = [];

  // Render pages.
  for (const page of manifest.pages) {
    const { file, search: entry } = await renderPage(
      page,
      manifest,
      components,
      basePath,
      cssHref,
      islandsBase,
      siteName,
      theme.tokens.fonts,
    );
    files.push(file);
    if (!page.frontmatter.hidden) search.push(entry);
  }

  // CSS file.
  files.push({ path: css.path, contents: css.contents });

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
  const assetCount = files.length - manifest.pages.length;

  return {
    files,
    search,
    stats: {
      pageCount: manifest.pages.length,
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
  ComponentOverrides,
  Override,
  IslandName,
  IslandPropsMap,
} from '@clean-jsdoc-theme/utils';
