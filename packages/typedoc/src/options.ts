/**
 * The `cleanJsdocTheme` TypeDoc option block — declaration + typed reader.
 *
 * The plugin declares ONE namespaced option (`cleanJsdocTheme`, a
 * `ParameterType.Object`) so users configure the theme from a single block in
 * `typedoc.json`, mirroring the JSDoc bridge's flat `opts`:
 *
 * ```jsonc
 * {
 *   "plugin": ["@clean-jsdoc-theme/typedoc"],
 *   "outputs": [{ "name": "clean-jsdoc-theme", "path": "docs" }],
 *   "cleanJsdocTheme": {
 *     "siteName": "My Library",
 *     "fonts": { "heading": "Fraunces", "body": "Spline Sans" },
 *     "sectionOrder": ["Classes", "Interfaces", "Enums", "Typedefs"],
 *     "docs": "docs",
 *     "docGroups": ["Guides"],
 *     "menu": [{ "id": "home", "title": "Home", "link": "/" }],
 *     "clubSidebarItems": true,
 *     "copyPage": true,
 *     "strict": false
 *   }
 * }
 * ```
 *
 * Because the block is a dedicated namespace (not JSDoc's shared flat `opts`),
 * the writer validates it with `unknownKeyPolicy: 'warn-all'` — every
 * unrecognized key is flagged (with a "did you mean" hint when close).
 */
import { ParameterType } from 'typedoc';
import type { Application, DeclarationOption } from 'typedoc';

/** The TypeDoc option name carrying the whole theme block. */
export const OPTION_NAME = 'cleanJsdocTheme';

/**
 * The raw `cleanJsdocTheme` block as read from `typedoc.json`. Every field is
 * `unknown` because TypeDoc does not type-check Object options — the writer runs
 * it through `validateThemeOpts` + the `normalize*` helpers, exactly like the
 * JSDoc bridge does with `env.opts`.
 */
export interface CleanJsdocThemeBlock {
  /** Header/footer site identity — a string or a `{ default, dark, light, alt }` logo set. */
  siteName?: unknown;
  /** Font overrides `{ heading, body, mono }` (Google Fonts for heading/body). */
  fonts?: unknown;
  /** Ordered sidebar section labels (filters + orders the API sections). */
  sectionOrder?: unknown;
  /** Prose-docs directory (Markdown/HTML) rendered into pages alongside the API. */
  docs?: unknown;
  /** Top-level doc-group display order (the sidebar sections built from docs). */
  docGroups?: unknown;
  /** Fallback group label for a doc with no group of its own. */
  defaultDocGroup?: unknown;
  /** Full sidebar menu (takes precedence over `sectionOrder`). */
  menu?: unknown;
  /** Club prefix-grouped sidebar entries into subtrees. */
  clubSidebarItems?: unknown;
  /** Which top-level sidebar sections collapse (`boolean` or array of labels). */
  collapsibleSidebarSections?: unknown;
  /** Copy-page button config (boolean or `{ enabled?, actions? }`). */
  copyPage?: unknown;
  /** Prev/next page pager config (boolean or `{ enabled? }`). */
  pageNav?: unknown;
  /** Scrollbar mode: `"styled"` (default) | `"visible"` | `"native"`. See #281. */
  scrollbar?: unknown;
  /** Code-playground config (boolean or `{ enableForAllExamples?, providers?, codepen?, jsfiddle?, codesandbox? }`). */
  playground?: unknown;
  /** Custom AI prompt for the copy-page button. */
  aiPrompt?: unknown;
  /** Custom footer — inline HTML string OR `{ file }` (read from disk by the bridge). */
  footer?: unknown;
  /** Favicon — a path to an image file the bridge copies + links as `<link rel="icon">`. */
  favicon?: unknown;
  /** Site-wide custom `<meta>` tags — an array of attribute maps. */
  meta?: unknown;
  /**
   * Site root path the renderer prefixes onto every emitted URL, so the output
   * can be served from a sub-directory (e.g. `"/my-lib/api"`). A bare path or a
   * full URL (its pathname is used); defaults to `"/"`.
   */
  basePath?: unknown;
  /**
   * Site public base URL (e.g. `"https://example.com"`). When set, the build
   * emits a `sitemap.xml` listing every non-hidden page's canonical URL. Only the
   * origin is used; the deploy sub-path comes from `basePath`.
   */
  siteUrl?: unknown;
  /** Escalate validation errors (bad font / unknown key) to a hard failure. */
  strict?: unknown;
  [key: string]: unknown;
}

/**
 * Declare the `cleanJsdocTheme` option on the app. Called from `load(app)`
 * before convert. Verified against typedoc 0.28.19:
 * `app.options.addDeclaration(decl)` accepts a `ParameterType.Object` with a
 * `defaultValue`; `app.options.getValue('cleanJsdocTheme')` then returns the
 * user's merged block (or the default `{}`).
 */
export function declareThemeOption(app: Application): void {
  const declaration: DeclarationOption = {
    name: OPTION_NAME,
    help:
      'clean-jsdoc-theme options (siteName, fonts, sectionOrder, docs, docGroups, ' +
      'defaultDocGroup, menu, clubSidebarItems, collapsibleSidebarSections, copyPage, ' +
      'pageNav, scrollbar, playground, aiPrompt, footer, favicon, meta, basePath, siteUrl, strict).',
    type: ParameterType.Object,
    defaultValue: {},
  };
  app.options.addDeclaration(declaration);
}

/**
 * Read the `cleanJsdocTheme` block from the app's options. Returns `{}` when the
 * option is unset or not an object, so callers never have to null-check.
 */
export function readThemeOption(app: Pick<Application, 'options'>): CleanJsdocThemeBlock {
  const raw = app.options.getValue(OPTION_NAME);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as CleanJsdocThemeBlock;
  }
  return {};
}

/** Keys of the `cleanJsdocTheme` block that are NOT theme opts validated by utils. */
export const KNOWN_NON_THEME_KEYS: ReadonlySet<string> = new Set(['strict']);
