/**
 * The committable locale-artifact model + the in-memory shapes the merge works
 * on. See `packages/aadesh-bhasha-plan.md` §5 (artifact layout) and §4 (the
 * extract→translate→build flow).
 *
 * A locale file is human-edited JSON: clean translated strings under nested
 * `chrome.*` and a flat `api` map, plus three underscore-prefixed metadata
 * blocks — `_version` (schema migrations), `_hashes` (the source-hash each
 * translation was made against, for staleness), and `_obsolete` (soft-deleted
 * entries kept until `--prune`). The default-locale file is the *skeleton*: its
 * values ARE the source text.
 */

/** Current locale-file schema version. Bump + migrate when the shape changes. */
export const LOCALE_FILE_VERSION = 1;

/** A nested string tree mirroring bhasha's `EN_CHROME` (leaves are translations). */
export interface ChromeTree {
  [segment: string]: string | ChromeTree;
}

/** One soft-deleted entry, preserved so a rename doesn't drop a translator's work. */
export interface ObsoleteEntry {
  /** Last-known translated value. */
  value: string;
  /** Source-hash the value tracked when it was retired. */
  hash: string;
}

/**
 * The on-disk locale artifact (`clean-jsdoc-theme-artifacts/locales/<locale>.json`).
 * `chrome` is nested for readability; `api` is a flat map keyed by the slot key
 * **without** the `api.` namespace prefix (it's already under `api`). `_hashes`
 * and `_obsolete` are keyed by the FULL flat key (`chrome.*` / `api.*`).
 */
export interface LocaleFile {
  _version: number;
  /** Translated chrome strings, nested like `EN_CHROME`. */
  chrome: ChromeTree;
  /** Translated API slots: `<longname>#<field>` → translated string. */
  api: Record<string, string>;
  /** Full key → source-hash the translation tracks. Drives staleness detection. */
  _hashes: Record<string, string>;
  /** Full key → retired entry, kept until `--prune`. */
  _obsolete: Record<string, ObsoleteEntry>;
}

/**
 * One entry in the regenerated, locale-independent template: the current
 * default-locale source string for a key and its hash. Built fresh each run from
 * bhasha's `EN_CHROME` (chrome) + the `SiteManifest.slots` (api).
 */
export interface TemplateEntry {
  /** Full flat key — `chrome.*` or `api.*`. */
  key: string;
  /** Current default-locale source text. */
  source: string;
  /** `sourceHash(source)`. */
  hash: string;
}

/** The full template — chrome keys (EN order) followed by api slot keys. */
export type Template = TemplateEntry[];

/** A flat in-memory view of a locale's active entries: full key → value + hash. */
export interface FlatEntry {
  value: string;
  hash: string;
}
