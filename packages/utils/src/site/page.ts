/**
 * Page-level types — one `Page` per top-level symbol (class, module, namespace,
 * mixin, interface, typedef) plus index/guide pages. See architecture Q2.
 */

/** Kind of page; drives URL grouping, layout choice, and sidebar bucketing. */
export type PageKind =
  | 'class'
  | 'module'
  | 'namespace'
  | 'mixin'
  | 'interface'
  | 'typedef'
  | 'global'
  | 'index'
  | 'guide';

/**
 * YAML-style frontmatter for an MDX page. Open-ended via the index signature so
 * authors can attach arbitrary metadata (e.g. SEO hints) without losing types.
 */
export interface Frontmatter {
  title: string;
  kind: PageKind;
  /** JSDoc longname (e.g. `module:foo~Bar#method`). */
  longname?: string;
  description?: string;
  /** Sort order within `group`. */
  order?: number;
  /** Sidebar group label. */
  group?: string;
  /** If true, omit from nav + search but still render. */
  hidden?: boolean;
  [key: string]: unknown;
}

/** A rendered heading within a page; used by the TOC island. */
export interface Heading {
  depth: 2 | 3 | 4 | 5 | 6;
  text: string;
  /** Slug computed via `slugifyHeading` so anchors match sidebar links. */
  id: string;
}

/** One emitted page. `body` is always an MDX string; `mdast` is optional. */
export interface Page {
  /** Slug relative to site root — no leading slash, no `.html`. */
  slug: string;
  frontmatter: Frontmatter;
  /** MDX source string (compiled by dwar at render time). */
  body: string;
  /** Optional mdast tree; useful for in-process passes that want structured data. */
  mdast?: import('mdast').Root;
  /** Pre-extracted headings so dwar can render a TOC without re-parsing. */
  headings?: Heading[];
}
