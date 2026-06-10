/**
 * zod schemas for the theme option surface — the recognized `siteName`,
 * `fonts`, `menu`, `copyPage`, `sectionOrder`, `docGroups`, `defaultDocGroup`,
 * `clubSidebarItems`, `aiPrompt`, and `basePath` opts the JSDoc bridge accepts.
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
 * Font overrides — only `heading`/`body`/`mono` are recognized. `heading` and
 * `body` are Google Fonts family names (existence-checked later); `mono` is a
 * CSS stack. Extras are stripped; the explicit policy flags them.
 */
export const FontsSchema = z
  .object({
    heading: z.string().optional(),
    body: z.string().optional(),
    mono: z.string().optional(),
  })
  .strip();
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
  'sectionOrder',
  'docGroups',
  'defaultDocGroup',
  'clubSidebarItems',
  'aiPrompt',
  'basePath',
  'customCss',
  'customCssFile',
  'customJs',
  'customJsFile',
  'hashCustomAssets',
] as const;

/** Union of the recognized theme option key names. */
export type ThemeOptKey = (typeof THEME_OPT_KEYS)[number];
