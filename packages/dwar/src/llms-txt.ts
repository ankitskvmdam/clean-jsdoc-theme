/**
 * `llms.txt` + `llms-full.txt` generation (llmstxt.org). Pure string building —
 * a projection of the `SiteManifest` onto the two files, in the same spirit as
 * `sitemap.ts`.
 *
 * `llms.txt` is a machine-readable index: one h1, an optional blockquote
 * summary, a prose line, then one `##` section per top-level sidebar group whose
 * entries link each page's COMPANION MARKDOWN (`<slug>/index.md`, which
 * `render()` already emits) rather than its HTML. `llms-full.txt` concatenates
 * those same bodies for one-shot ingestion.
 *
 * Absolute links are mandatory (the file is fetched standalone), so this needs
 * the site's public URL. Like the sitemap, only the ORIGIN is used and the deploy
 * sub-path comes from `basePath` — so a localized build's per-locale `basePath`
 * yields that locale's URLs, and each locale dir gets its own `llms.txt`.
 */
import { API_PAGE_KINDS, httpOrigin, siteNameText, withBase } from '@clean-jsdoc-theme/utils';
import type {
  LlmsTxtConfig,
  NavNode,
  Page,
  SiteManifest,
  SiteName,
} from '@clean-jsdoc-theme/utils';
import { mdPathFor } from './html';
import { pageUrl } from './sitemap';

const API_KINDS = new Set<string>(API_PAGE_KINDS);

/** Slug prefix setu reserves for the source-file section (`source-view.ts`). */
const SOURCE_PREFIX = 'source';

/** Max length of a one-line entry description. */
const DESC_MAX = 150;

/** Section label for includable pages that no nav entry reaches. */
const FALLBACK_SECTION = 'Other';

/**
 * `true` for the source section — the hidden `kind: 'source'` viewers AND the
 * non-hidden "Source Files" index page (slug `source`, `kind: 'guide'`), which
 * would otherwise slip through every other filter.
 */
export function isSourceSlug(slug: string): boolean {
  return slug === SOURCE_PREFIX || slug.startsWith(`${SOURCE_PREFIX}/`);
}

/**
 * Flatten the sidebar into `##` sections, in sidebar order.
 *
 * `manifest.nav` is FLAT at the top level — a section header is not a node, it's
 * the `group` label the sibling entries share (that's what rang's sidebar renders
 * as a bold title). So we bucket top-level entries by `node.group`, keeping the
 * first-seen group order (which already reflects `sectionOrder`), and flatten each
 * entry's descendants (nested `@category` branches, clubbed parents) into its
 * bucket — llms.txt sections are flat link lists.
 *
 * `menu: true` entries (the top menu region: Home, GitHub, npm, Source files) and
 * external `href` links are skipped — they're chrome, not documentation pages.
 */
export function navSections(nav: readonly NavNode[]): Array<{ label: string; slugs: string[] }> {
  const collect = (node: NavNode, out: string[]): void => {
    if (node.external || node.href) return;
    if (typeof node.slug === 'string') out.push(node.slug);
    for (const child of node.children ?? []) collect(child, out);
  };

  const order: string[] = [];
  const bySection = new Map<string, string[]>();
  for (const node of nav) {
    if (node.menu || node.external || node.href) continue;
    const slugs: string[] = [];
    collect(node, slugs);
    if (slugs.length === 0) continue;
    const label = node.group ?? node.label;
    let bucket = bySection.get(label);
    if (!bucket) {
      bucket = [];
      bySection.set(label, bucket);
      order.push(label);
    }
    bucket.push(...slugs);
  }
  return order.map((label) => ({ label, slugs: bySection.get(label) as string[] }));
}

/** Strip a leading `---\n…\n---` YAML block (page bodies carry frontmatter). */
export function stripFrontmatter(body: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(body);
  return match ? body.slice(match[0].length).replace(/^\s+/, '') : body;
}

/** Strip a leading `# Heading` line (the title is already the section header). */
export function stripLeadingHeading(body: string): string {
  return body.replace(/^#\s+[^\n]*\r?\n+/, '');
}

/** The named HTML entities a doclet description realistically carries. */
const ENTITIES: Record<string, string> = {
  quot: '"',
  apos: "'",
  amp: '&',
  lt: '<',
  gt: '>',
  nbsp: ' ',
};

/**
 * Flatten a doclet description to plain prose for a one-line index entry.
 *
 * Frontmatter descriptions come from JSDoc/TypeDoc comments, so they can still
 * carry unresolved `{@link}`-family inline tags (setu only rewrites them inside
 * page bodies) and HTML entities from the comment's HTML round-trip. Neither
 * belongs in a machine-read index: `{@link Foo}` → `Foo`, `{@link Foo|Bar}` and
 * `{@link Foo Bar}` → `Bar` (the authored label wins, as in rendered output).
 */
export function plainText(text: string): string {
  return text
    .replace(/\{@(?:link|linkcode|linkplain|tutorial)\s+([^}]+)\}/g, (_all, body: string) => {
      const [target, ...rest] = body.trim().split(/[|\s]+/);
      return rest.length > 0 ? rest.join(' ') : target;
    })
    .replace(/&#(\d+);/g, (_all, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-zA-Z]+);/g, (all, name: string) => ENTITIES[name.toLowerCase()] ?? all);
}

/** Clean, collapse whitespace, and clip to {@link DESC_MAX} on a word boundary. */
function oneLine(text: string): string {
  const flat = plainText(text).replace(/\s+/g, ' ').trim();
  if (flat.length <= DESC_MAX) return flat;
  return `${flat.slice(0, DESC_MAX - 1).replace(/\s+\S*$/, '')}…`;
}

/** Input to {@link buildLlmsTxt}. */
export interface LlmsTxtInput {
  manifest: SiteManifest;
  /** Public site URL — only its origin is used. */
  siteUrl: string;
  /** Normalized deploy sub-path (`theme.basePath`). */
  basePath: string;
  config: LlmsTxtConfig;
  /** Fallback title source when `manifest.pkg.name` is absent. */
  siteName?: SiteName;
}

/** The generated files. `full` is absent when `config.full` is `false`. */
export interface LlmsTxtOutput {
  llms: string;
  full?: string;
}

/**
 * Build `llms.txt` (and `llms-full.txt`), or `null` when `siteUrl` can't be
 * parsed — so the caller emits nothing rather than a file full of broken links.
 */
export function buildLlmsTxt(input: LlmsTxtInput): LlmsTxtOutput | null {
  const { manifest, siteUrl, basePath, config, siteName } = input;
  const origin = httpOrigin(siteUrl);
  if (!origin) return null;

  const siteRoot = origin + withBase(basePath, '/');
  const rootFileUrl = (name: string): string => origin + withBase(basePath, `/${name}`);
  const mdUrl = (slug: string): string => origin + withBase(basePath, `/${mdPathFor(slug)}`);

  const isApi = (page: Page): boolean => API_KINDS.has(page.frontmatter.kind);

  /** A page belongs in llms.txt when it has a companion `.md` and isn't chrome. */
  const includable = (page: Page | undefined): page is Page => {
    if (!page) return false;
    if (page.frontmatter.hidden) return false;
    if (isSourceSlug(page.slug)) return false;
    if (!page.body) return false; // no companion .md exists to link
    if (page.slug === '') return false; // the home page IS the header
    if (isApi(page) && config.api === false) return false;
    return true;
  };

  const bySlug = new Map<string, Page>();
  for (const page of manifest.pages) bySlug.set(page.slug, page);

  // Sections in sidebar order; a page is claimed by the first section reaching it.
  const seen = new Set<string>();
  const sections: Array<{ label: string; pages: Page[] }> = [];
  for (const section of navSections(manifest.nav)) {
    const pages: Page[] = [];
    for (const slug of section.slugs) {
      if (seen.has(slug)) continue;
      const page = bySlug.get(slug);
      if (!includable(page)) continue;
      seen.add(slug);
      pages.push(page);
    }
    if (pages.length > 0) sections.push({ label: section.label, pages });
  }

  // Anything includable the nav never reached (defensive — keeps the index whole).
  const orphans = manifest.pages.filter((page) => !seen.has(page.slug) && includable(page));
  if (orphans.length > 0) sections.push({ label: FALLBACK_SECTION, pages: orphans });

  const title = manifest.pkg?.name || siteNameText(siteName) || 'Documentation';
  const summary = manifest.pkg?.description;

  // ---- llms.txt ----
  const out: string[] = [`# ${title}`, ''];
  if (summary) out.push(`> ${oneLine(summary)}`, '');
  out.push(
    config.full
      ? `Documentation for ${title}. Every page below links to its Markdown source; the whole site as a single file is at ${rootFileUrl('llms-full.txt')}`
      : `Documentation for ${title}. Every page below links to its Markdown source.`,
    ''
  );

  for (const section of sections) {
    out.push(`## ${section.label}`);
    for (const page of section.pages) {
      const description = page.frontmatter.description;
      const describe = description && !(isApi(page) && config.api === 'index');
      const suffix = describe ? `: ${oneLine(description)}` : '';
      out.push(`- [${page.frontmatter.title}](${mdUrl(page.slug)})${suffix}`);
    }
    out.push('');
  }

  out.push('## Optional');
  if (config.full) {
    out.push(
      `- [Full documentation, single file](${rootFileUrl('llms-full.txt')}): every page concatenated for one-shot ingestion`
    );
  }
  out.push(`- [Site home](${siteRoot}): the rendered documentation site`);

  const llms = `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
  if (!config.full) return { llms };

  // ---- llms-full.txt ----
  const home = bySlug.get('');
  const bodyPages: Page[] = [
    ...(home && !home.frontmatter.hidden && home.body ? [home] : []),
    ...sections.flatMap((section) => section.pages),
  ].filter((page) => !(isApi(page) && config.api === 'index'));

  const fullOut: string[] = [`# ${title} — full documentation`, ''];
  if (summary) fullOut.push(`> ${oneLine(summary)}`, '');
  fullOut.push(`Generated from ${siteRoot} . This file concatenates every documentation page.`, '');
  for (const page of bodyPages) {
    fullOut.push(
      '---',
      '',
      `# ${page.frontmatter.title}`,
      `Source: ${pageUrl(origin, basePath, page.slug)}`,
      '',
      stripLeadingHeading(stripFrontmatter(page.body)).trimEnd(),
      ''
    );
  }

  return { llms, full: `${fullOut.join('\n').replace(/\n{4,}/g, '\n\n\n').trimEnd()}\n` };
}
