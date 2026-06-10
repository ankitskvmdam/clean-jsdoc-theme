/**
 * Next.js-style build report — given the emitted {@link OutputFile}s plus the
 * render {@link RenderResult.stats}, render a console summary: a header (where
 * + page/asset counts + optional duration), a per-route table sorted by route
 * (size + optional gzip), an assets section, and a totals footer.
 *
 * Pure + synchronous + node-free (rang imports utils in the browser): byte
 * sizes come from {@link byteLength} (`TextEncoder`, never `Buffer`); gzip is
 * never imported, only the optional `gzipSizer` injected by the caller. Output
 * is deterministic for a given input.
 */

import type { OutputFile, RenderResult } from '../site/render';
import { ansi, byteLength, humanFileSize, padColumn } from './format';

/** Input to {@link formatBuildReport}. */
export interface BuildReportInput {
  /** Files emitted by the render (plus any extra written files, e.g. logos). */
  files: OutputFile[];
  /** Render stats — supplies the `built in …` duration when present. */
  stats?: RenderResult['stats'];
  /** Absolute or display path the files were written to — the "where". */
  destination: string;
  /**
   * Optional gzip sizer (e.g. `(b) => zlib.gzipSync(b).length`). Injected by
   * the caller so utils stays node-free; the gzip column appears only when set.
   */
  gzipSizer?: (bytes: Uint8Array | string) => number;
  /** Whether to emit ANSI color. Default `false` (plain/testable). */
  color?: boolean;
  /**
   * Cap the per-route table at the N largest routes, adding a `+N more pages`
   * line for the remainder (never silently truncated). Omit to list every
   * route (the recommended default).
   */
  maxRoutes?: number;
}

/** A classified HTML page row. */
interface PageRow {
  /** Route the page serves, e.g. `/` or `/module/userservice`. */
  route: string;
  /** UTF-8 byte length of the page contents. */
  size: number;
  /** Gzipped byte length, when a `gzipSizer` was provided. */
  gzip?: number;
}

/** A classified asset row. */
interface AssetRow {
  /** Output path of the asset, e.g. `_assets/styles.<id>.css`. */
  path: string;
  size: number;
  gzip?: number;
}

/** Files split into the three reported buckets, with running byte totals. */
interface Classified {
  pages: PageRow[];
  /** Companion Markdown files (`*.md`). */
  markdownBytes: number;
  assets: AssetRow[];
  htmlBytes: number;
  assetBytes: number;
}

/**
 * Turn an HTML page path into its route: strip a trailing `index.html`, drop
 * the leading/trailing slashes, then re-add a single leading slash. The root
 * `index.html` (or empty) becomes `/`.
 */
function routeFor(path: string): string {
  const trimmed = path.replace(/\/?index\.html$/i, '').replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? '/' : `/${trimmed}`;
}

/** `true` for files under `_assets`/`_islands` or with an image extension. */
function isAsset(path: string): boolean {
  return (
    /(^|\/)_(assets|islands)\//.test(path) ||
    /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot)$/i.test(path)
  );
}

/**
 * Split the files into pages / markdown / assets, summing bytes per bucket.
 * Order: assets first (covers `_assets/*.html` etc.), then `*.html` pages,
 * then `*.md` companions; anything else falls through to assets so its bytes
 * are still accounted for in the total.
 */
function classify(input: BuildReportInput): Classified {
  const { files, gzipSizer } = input;
  const sizeGzip = (contents: string | Uint8Array): number | undefined =>
    gzipSizer ? gzipSizer(contents) : undefined;

  const pages: PageRow[] = [];
  const assets: AssetRow[] = [];
  let markdownBytes = 0;
  let htmlBytes = 0;
  let assetBytes = 0;

  for (const file of files) {
    const size = byteLength(file.contents);

    if (isAsset(file.path)) {
      assets.push({ path: file.path, size, gzip: sizeGzip(file.contents) });
      assetBytes += size;
    } else if (/\.html$/i.test(file.path)) {
      pages.push({ route: routeFor(file.path), size, gzip: sizeGzip(file.contents) });
      htmlBytes += size;
    } else if (/\.md$/i.test(file.path)) {
      markdownBytes += size;
    } else {
      assets.push({ path: file.path, size, gzip: sizeGzip(file.contents) });
      assetBytes += size;
    }
  }

  return { pages, markdownBytes, assets, htmlBytes, assetBytes };
}

/** Render one `label  size  (gzip)` row, padded to the shared column widths. */
function renderRow(
  label: string,
  size: number,
  gzip: number | undefined,
  widths: { label: number; size: number; gzip: number },
  color: boolean,
): string {
  const sizeCell = padColumn(humanFileSize(size), widths.size, 'right');
  const cells = `${padColumn(label, widths.label)}  ${ansi.cyan(sizeCell, color)}`;
  if (gzip === undefined) return `  ${cells}`;
  const gzipCell = padColumn(humanFileSize(gzip), widths.gzip, 'right');
  return `  ${cells}  ${ansi.dim(gzipCell, color)}`;
}

/**
 * Render the Next.js-style build report as a single string. Routes are sorted
 * alphabetically by default; when `maxRoutes` is set, the N largest routes are
 * shown (sorted by route) followed by a `+N more pages` line.
 */
export function formatBuildReport(input: BuildReportInput): string {
  const { stats, destination, gzipSizer, maxRoutes } = input;
  const color = input.color ?? false;
  const withGzip = gzipSizer !== undefined;

  const { pages, markdownBytes, assets, htmlBytes, assetBytes } = classify(input);

  // Pick the rows shown: optionally the N largest, otherwise every page.
  let shownPages = [...pages];
  let hiddenCount = 0;
  if (maxRoutes !== undefined && pages.length > maxRoutes) {
    shownPages = [...pages].sort((a, b) => b.size - a.size).slice(0, maxRoutes);
    hiddenCount = pages.length - maxRoutes;
  }
  shownPages.sort((a, b) => a.route.localeCompare(b.route));

  // Column widths span both the route table and the assets section so the
  // size/gzip columns line up across the whole report.
  const labels = [
    'Route',
    ...shownPages.map((p) => p.route),
    ...assets.map((a) => a.path),
  ];
  const sizeStrings = [
    ...shownPages.map((p) => humanFileSize(p.size)),
    ...assets.map((a) => humanFileSize(a.size)),
  ];
  const gzipStrings = withGzip
    ? [
        ...shownPages.map((p) => humanFileSize(p.gzip ?? 0)),
        ...assets.map((a) => humanFileSize(a.gzip ?? 0)),
      ]
    : [];
  const widths = {
    label: Math.max(...labels.map((l) => l.length)),
    size: Math.max('Size'.length, ...sizeStrings.map((s) => s.length)),
    gzip: Math.max('(gzip)'.length, ...gzipStrings.map((s) => s.length), 0),
  };

  const ruleWidth =
    2 + widths.label + 2 + widths.size + (withGzip ? 2 + widths.gzip : 0);
  const rule = ansi.dim('─'.repeat(ruleWidth), color);

  const lines: string[] = [];

  // Header: title (+ duration), then the destination + counts.
  const pageCount = stats?.pageCount ?? pages.length;
  const assetCount = stats?.assetCount ?? assets.length;
  const duration =
    stats && Number.isFinite(stats.durationMs)
      ? ` in ${(stats.durationMs / 1000).toFixed(2)}s`
      : '';
  lines.push(ansi.green(`clean-jsdoc-theme — build complete${duration}`, color));
  lines.push(
    `Output: ${ansi.cyan(destination, color)}  (${pageCount} pages, ${assetCount} assets)`,
  );
  lines.push('');

  // Per-route table header.
  const headerLabel = padColumn('Route', widths.label);
  const headerSize = padColumn('Size', widths.size, 'right');
  const header = withGzip
    ? `  ${headerLabel}  ${headerSize}  ${padColumn('(gzip)', widths.gzip, 'right')}`
    : `  ${headerLabel}  ${headerSize}`;
  lines.push(ansi.dim(header, color));
  lines.push(rule);

  for (const page of shownPages) {
    lines.push(renderRow(page.route, page.size, page.gzip, widths, color));
  }
  if (hiddenCount > 0) {
    lines.push(`  ${ansi.dim(`+${hiddenCount} more pages`, color)}`);
  }

  // Assets section.
  lines.push(rule);
  lines.push(`  ${ansi.dim('Assets', color)}`);
  for (const asset of assets) {
    lines.push(renderRow(asset.path, asset.size, asset.gzip, widths, color));
  }

  // Totals footer.
  const total = htmlBytes + markdownBytes + assetBytes;
  lines.push(rule);
  lines.push(
    `  HTML ${humanFileSize(htmlBytes)} · Markdown ${humanFileSize(
      markdownBytes,
    )} · Assets ${humanFileSize(assetBytes)} · Total ${humanFileSize(total)}`,
  );

  return lines.join('\n');
}
