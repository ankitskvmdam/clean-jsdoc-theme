/**
 * zod schemas for the theme option surface — the recognized `siteName`,
 * `fonts`, `menu`, `copyPage`, `pageNav`, `playground`, `sectionOrder`,
 * `docs`, `docGroups`, `defaultDocGroup`, `clubSidebarItems`, `aiPrompt`, and
 * `basePath` opts the JSDoc bridge accepts.
 *
 * These mirror the theme-relevant subset of `clean-jsdoc-theme`'s `JSDocOpts`
 * and the lenient `normalize*` / `prepareSiteName` helpers in `publish.ts`, but
 * expressed as zod so failures carry a structured `path` + `message`. Object
 * schemas are `.strip()`-style (extra keys are dropped, not rejected) — the
 * unknown-key policy is handled explicitly elsewhere so we control the
 * messaging. Pure + node-free.
 */

import { z } from 'zod';

// ── siteName ─────────────────────────────────────────────────────────────────

/**
 * A logo image set — mirrors `SiteLogo`. Only `default`/`dark`/`light`/`alt`
 * are recognized; extras are stripped. Each value is a string (URL, `data:`
 * URI, or a local path the bridge copies).
 */
export const SiteLogoSchema = z
  .object({
    default: z.string().optional(),
    dark: z.string().optional(),
    light: z.string().optional(),
    alt: z.string().optional(),
  })
  .strip();
export type TSiteLogoOpt = z.infer<typeof SiteLogoSchema>;

/** Recognized sub-keys of a `siteName` logo set, for typo suggestions. */
export const SITE_LOGO_KEYS = ['default', 'dark', 'light', 'alt'] as const;

/** `siteName` is plain text OR a logo set (mirrors `SiteName`). */
export const SiteNameSchema = z.union([z.string(), SiteLogoSchema]);
export type TSiteNameOpt = z.infer<typeof SiteNameSchema>;

// ── fonts ────────────────────────────────────────────────────────────────────

/**
 * Font overrides — `heading`/`body`/`mono`, each optionally prefixed with a
 * locale code (`ja:heading`) to override that locale only. `heading`/`body` are
 * Google Fonts family names (existence-checked later); `mono` is a CSS stack.
 * The `catchall` admits the `<locale>:slot` keys; `validateFonts` does the real
 * shape/slot validation (this schema is declarative — the runtime path uses it
 * for documentation/typing, not parsing).
 */
export const FontsSchema = z
  .object({
    heading: z.string().optional(),
    body: z.string().optional(),
    mono: z.string().optional(),
  })
  .catchall(z.string());
export type TFontsOpt = z.infer<typeof FontsSchema>;

/** Recognized `fonts` sub-keys, for typo suggestions. */
export const FONT_KEYS = ['heading', 'body', 'mono'] as const;

// ── menu ─────────────────────────────────────────────────────────────────────

/**
 * A sidebar menu entry — mirrors setu's `MenuItem` plus the `href` alias the
 * bridge accepts. All fields optional; the bridge keeps only entries with an
 * `id` (built-in) or a link.
 */
export const MenuItemSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    link: z.string().optional(),
    href: z.string().optional(),
    icon: z.string().optional(),
    /** Link `target` attribute (e.g. `_blank`, `_self`). */
    target: z.string().optional(),
    /** Extra CSS class(es) merged onto the rendered menu link. */
    class: z.string().optional(),
  })
  .strip();
export type TMenuItemOpt = z.infer<typeof MenuItemSchema>;

/** `menu` is an ordered list of {@link MenuItemSchema} entries. */
export const MenuSchema = z.array(MenuItemSchema);

// ── copyPage ───────────────────────────────────────────────────────────────

/** Valid copy-page dropdown actions (mirrors `CopyPageAction`). */
export const COPY_PAGE_ACTIONS = ['copy', 'view', 'claude', 'chatgpt', 'perplexity'] as const;

/** Copy-page config object — mirrors `CopyPageConfig`. */
export const CopyPageConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    actions: z.array(z.enum(COPY_PAGE_ACTIONS)).optional(),
  })
  .strip();
export type TCopyPageConfigOpt = z.infer<typeof CopyPageConfigSchema>;

/** `copyPage` is a boolean shorthand OR a config object. */
export const CopyPageSchema = z.union([z.boolean(), CopyPageConfigSchema]);

// ── pageNav ──────────────────────────────────────────────────────────────────

/** Prev/next pager config object — mirrors `PageNavConfig`. */
export const PageNavConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .strip();
export type TPageNavConfigOpt = z.infer<typeof PageNavConfigSchema>;

/** `pageNav` is a boolean shorthand OR a config object. */
export const PageNavSchema = z.union([z.boolean(), PageNavConfigSchema]);

// ── playground ───────────────────────────────────────────────────────────────

/** Valid code-playground providers (mirrors `PlaygroundProvider`). */
export const PLAYGROUND_PROVIDERS = ['codepen', 'jsfiddle', 'codesandbox'] as const;

/**
 * `playground` config — mirrors `PlaygroundConfig`. `enableForAllExamples` opts
 * every `@example` in; `providers` is the default provider set + order; the
 * per-provider records hold site-wide runtime options. The records are lenient
 * (`z.unknown()` values) so each provider's API can grow without schema churn.
 */
export const PlaygroundSchema = z
  .object({
    enableForAllExamples: z.boolean().optional(),
    providers: z.array(z.enum(PLAYGROUND_PROVIDERS)).optional(),
    codepen: z.record(z.string(), z.unknown()).optional(),
    jsfiddle: z.record(z.string(), z.unknown()).optional(),
    codesandbox: z.record(z.string(), z.unknown()).optional(),
  })
  .strip();
export type TPlaygroundOpt = z.infer<typeof PlaygroundSchema>;

// ── footer ───────────────────────────────────────────────────────────────────

/**
 * Footer file form — `{ file: "./footer.html" }`. Modeled as its own object so
 * a later reusable-partial shape (`{ file, css, js }`) is a non-breaking
 * extension; only `file` is recognized today (extras stripped).
 */
export const FooterFileSchema = z.object({ file: z.string() }).strip();
export type TFooterFileOpt = z.infer<typeof FooterFileSchema>;

/**
 * `footer` is a discriminated union: an inline HTML string (the common case,
 * v4 parity) OR a `{ file }` object the bridge reads from disk. The boundary
 * (`ThemeConfig.footer`) is always the resolved string — the union lives only
 * at the opts/bridge layer.
 */
export const FooterSchema = z.union([z.string(), FooterFileSchema]);
export type TFooterOpt = z.infer<typeof FooterSchema>;

// ── meta ─────────────────────────────────────────────────────────────────────

/**
 * `meta` is an array of attribute maps — each object's key/value pairs become
 * the attributes of one `<meta>` tag (`{ name, content }`, `{ property, content }`,
 * `{ "http-equiv", content }`, `{ charset }`, …). Maximally flexible (v4 parity);
 * dwar escapes the values, validates attribute names, and de-dupes against its
 * own head defaults.
 */
export const MetaSchema = z.array(z.record(z.string(), z.string()));
export type TMetaOpt = z.infer<typeof MetaSchema>;

// ── simple list / scalar opts ────────────────────────────────────────────────

/** `sectionOrder` / `docGroups` — an ordered list of label strings. */
export const StringListSchema = z.array(z.string());

/** `defaultDocGroup` — a single group label. */
export const DefaultDocGroupSchema = z.string();

/** `clubSidebarItems` — toggles prefix-grouped sidebar subtrees. */
export const ClubSidebarItemsSchema = z.boolean();

/** `aiPrompt` — a custom copy-page LLM prompt. */
export const AiPromptSchema = z.string();

/** `basePath` — site root path the renderer prefixes onto links. */
export const BasePathSchema = z.string();

// ── the recognized theme-option surface ──────────────────────────────────────

/**
 * The set of recognized top-level theme option names. The unknown-key policy
 * compares each incoming opt against this set (via Levenshtein) for typo
 * suggestions — keys NOT here and NOT a JSDoc-own opt may earn a "did you mean"
 * hint. Mirrors the theme-relevant `JSDocOpts` subset.
 */
export const THEME_OPT_KEYS = [
  'siteName',
  'fonts',
  'menu',
  'copyPage',
  'pageNav',
  'playground',
  'sectionOrder',
  'docs',
  'docGroups',
  'defaultDocGroup',
  'clubSidebarItems',
  'aiPrompt',
  'basePath',
  'siteUrl',
  'favicon',
  'footer',
  'meta',
  'locales',
  'defaultLocale',
  'customCss',
  'customCssFile',
  'customJs',
  'customJsFile',
  'hashCustomAssets',
  'progress',
] as const;

/** Union of the recognized theme option key names. */
export type ThemeOptKey = (typeof THEME_OPT_KEYS)[number];
