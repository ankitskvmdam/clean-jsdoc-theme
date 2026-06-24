/**
 * Page-level types — one `Page` per top-level symbol (class, module, namespace,
 * mixin, interface, typedef) plus index/guide pages. See architecture Q2.
 */

/**
 * Kind of page; drives URL grouping, layout choice, and sidebar bucketing.
 *
 * `enum` / `function` / `variable` are standalone-page kinds the TypeDoc bridge
 * produces under the `'typedoc'` flavor (to match default TypeDoc, where these
 * are first-class entities with their own pages). The JSDoc bridge never emits
 * them — it keeps demoting enums/functions/variables to members — so JSDoc
 * output is unchanged.
 */
export type PageKind =
  | 'class'
  | 'module'
  | 'namespace'
  | 'mixin'
  | 'interface'
  | 'typedef'
  | 'enum'
  | 'function'
  | 'variable'
  | 'global'
  | 'index'
  | 'guide'
  | 'source'; // read-only source-file viewer page

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
  /**
   * Sort order within `group`. For API pages this originates from a standalone
   * `@order N` tag or the `@category … order=` option; for docs/tutorials from
   * frontmatter `order`. Unset sorts last (alphabetically).
   */
  order?: number;
  /**
   * Sidebar group label. May be a `/`-path to nest the page in the sidebar
   * (`"Core/Parsing"` → group `Core` ▸ subgroup `Parsing`); the first segment is
   * the top-level group. Populated from an API `@category` tag or a doc/tutorial
   * page's frontmatter group.
   */
  group?: string;
  /** If true, omit from nav + search but still render. */
  hidden?: boolean;
  [key: string]: unknown;
}

/**
 * A rendered heading within a page; used by the TOC island. `depth` is normally
 * h2..h6 — a page's single h1 is its title, kept out of the TOC. `depth: 1` only
 * appears when a page has *multiple* h1s (the author is using h1 as section
 * structure, not as a title), in which case they're surfaced like any other.
 */
export interface Heading {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
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
  /**
   * Raw source for a `kind: 'source'` viewer page. When present, dwar renders
   * this file in a read-only editor island instead of compiling `body` as MDX
   * (so `body` is `''` for these pages).
   */
  source?: { code: string; language: string; filename: string };
}
