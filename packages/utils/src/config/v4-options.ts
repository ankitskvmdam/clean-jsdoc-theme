/**
 * v4 → v5 migration checks. v4 nested theme options under `opts.theme_opts`;
 * v5 reads them directly from `opts`, and most of them were renamed or removed.
 * A migrated config that still carries v4 keys would otherwise build silently
 * with those options ignored: the default `'suggest-typos'` unknown-key policy
 * only flags near-misses of v5 keys (JSDoc's `opts` namespace is shared with
 * other tools, so blanket unknown-key warnings would be noise), and v4 names
 * like `base_url` or `theme_opts` are nowhere near a v5 key.
 *
 * Two levels of certainty:
 * - `opts.theme_opts` (the block and every key in it) is unambiguously ours.
 *   It warns, and strict mode escalates it like any other option warning.
 * - A top-level v4 name (`opts.title`, `opts.search`, `opts.sort`, …) is most
 *   likely a half-finished migration, but it could belong to another JSDoc
 *   plugin sharing `opts`. It warns with the same hint, under its own code
 *   ({@link V4_TOP_LEVEL_CODE}) that strict mode never escalates — a strict
 *   build must not fail on someone else's option.
 *
 * Pure + node-free.
 */

import type { DiagnosticBag } from './diagnostics';

/** Migration status of a v4 option — the `status` enum of `migration-map.json`. */
export type V4OptionStatus = 'kept' | 'renamed' | 'changed' | 'removed';

/** One row of the v4 → v5 option mapping. */
export interface V4OptionMapping {
  /** The v5 option that replaces it, or `null` when it was removed. */
  v5: string | null;
  status: V4OptionStatus;
}

/**
 * Every option v4 read from `theme_opts` and what became of it. Mirrors
 * `v4ToV5` in the repo-root `migration-map.json` (the source of truth, also
 * embedded in MIGRATION.md) — copied here because utils can't read the repo
 * root at runtime. A utils test fails when the two drift apart.
 */
export const V4_OPTION_MAP: Readonly<Record<string, V4OptionMapping>> = {
  default_theme: { v5: null, status: 'removed' },
  base_url: { v5: 'basePath', status: 'renamed' },
  favicon: { v5: 'favicon', status: 'kept' },
  homepageTitle: { v5: null, status: 'removed' },
  title: { v5: 'siteName', status: 'changed' },
  includeFilesListInHomepage: { v5: null, status: 'removed' },
  menu: { v5: 'menu', status: 'changed' },
  sections: { v5: 'sectionOrder', status: 'changed' },
  meta: { v5: 'meta', status: 'changed' },
  search: { v5: null, status: 'removed' },
  codepen: { v5: 'playground', status: 'changed' },
  static_dir: { v5: null, status: 'removed' },
  create_style: { v5: 'customCss', status: 'renamed' },
  add_style_path: { v5: 'customCssFile', status: 'changed' },
  include_css: { v5: 'customCssFile', status: 'renamed' },
  add_scripts: { v5: 'customJs', status: 'renamed' },
  add_script_path: { v5: 'customJsFile', status: 'changed' },
  include_js: { v5: 'customJsFile', status: 'renamed' },
  footer: { v5: 'footer', status: 'changed' },
  exclude_inherited: { v5: null, status: 'removed' },
  displayModuleHeader: { v5: null, status: 'removed' },
  sort: { v5: null, status: 'removed' },
  shouldRemoveScrollbarStyle: { v5: 'scrollbar', status: 'changed' },
  resizeable: { v5: null, status: 'removed' },
  prefixModuleToSidebarItems_experimental: { v5: null, status: 'removed' },
};

/** The v4 → v5 migration guide, linked from every migration hint. */
export const MIGRATION_GUIDE_URL = 'https://ankdev.me/clean-jsdoc-theme/theme/migrate-v4-to-v5';

/**
 * Diagnostic code for a top-level v4 option name. Kept apart from
 * `opts/v4-option` (keys inside `theme_opts`) so strict mode can leave it a
 * warning — see the module comment.
 */
export const V4_TOP_LEVEL_CODE = 'opts/v4-name';

/**
 * Short "what changed" notes for the options whose replacement isn't a plain
 * rename, so the hint is actionable without opening the guide.
 */
const V4_NOTES: Readonly<Record<string, string>> = {
  default_theme: 'light/dark come built in, with a runtime toggle',
  homepageTitle: 'the home `<title>` comes from the README or `docs/index.md` + `siteName`',
  includeFilesListInHomepage: 'the Source Files section lists files',
  search: 'search is always on',
  static_dir: "use JSDoc's `templates.default.staticFiles`",
  resizeable: 'the sidebar has no resize options',
  title: 'a string or a logo set `{ default, dark, light, alt }`',
  sections: 'the `Global` section is now `Globals`',
  menu: 'entries are `{ id?, title?, link?, icon?, target?, class? }`',
  meta: 'an array of attribute maps, as in v4',
  footer: 'an HTML string or `{ file }`',
  codepen: 'plus the `@playground` tag; CodePen, JSFiddle or CodeSandbox',
  // v4 took `{ href, integrity, crossorigin }` CDN entries here; v5's file
  // options only copy local files, so a remote URL needs a different route.
  add_style_path:
    'local files only — download a remote stylesheet, or `@import url(…)` it from `customCss`',
  add_script_path:
    'local files only — download a remote script, or load it from `customJs` with a small loader',
  shouldRemoveScrollbarStyle: '`shouldRemoveScrollbarStyle: true` → `scrollbar: "native"`',
};

/** What to do about v4 option `key` in v5 — `undefined` for a non-v4 key. */
export function v4OptionHint(key: string): string | undefined {
  const row = Object.hasOwn(V4_OPTION_MAP, key) ? V4_OPTION_MAP[key] : undefined;
  if (!row) return undefined;
  const note = V4_NOTES[key];
  if (row.v5 === null) return `removed in v5${note ? ` (${note})` : ''} — delete it.`;
  if (row.status === 'renamed') return `renamed in v5 — use \`${row.v5}\`.`;
  if (row.v5 === key) {
    // Still a v5 option (only reachable from inside `theme_opts`): it just moves.
    return `move it up to \`opts.${key}\`${row.status === 'changed' && note ? ` (now ${note})` : ''}.`;
  }
  return `use \`${row.v5}\` in v5${note ? ` (${note})` : ''}.`;
}

/**
 * The keys {@link checkV4Options} reports on, given the v5 keys of this
 * namespace: `theme_opts` plus every v4 option name that isn't also a v5 key
 * (`menu`, `favicon`, `meta`, `footer` carried over and must not be flagged).
 * The unknown-key check skips these so a key never gets two diagnostics.
 */
export function v4OptionKeys(themeKeys: ReadonlySet<string>): Set<string> {
  const keys = new Set<string>(['theme_opts']);
  for (const key of Object.keys(V4_OPTION_MAP)) {
    if (!themeKeys.has(key)) keys.add(key);
  }
  return keys;
}

/**
 * Flag leftover v4 options as warnings: an `opts.theme_opts` block (v5 ignores
 * it — one diagnostic for the block, then one per key inside it with that key's
 * hint) and top-level v4 option names that aren't v5 keys
 * ({@link V4_TOP_LEVEL_CODE}).
 */
export function checkV4Options(
  opts: Record<string, unknown>,
  bag: DiagnosticBag,
  themeKeys: ReadonlySet<string>
): void {
  if (Object.hasOwn(opts, 'theme_opts')) {
    bag.warning(
      'opts/v4-theme-opts',
      'v5 ignores the v4 `theme_opts` block — its options now live directly under `opts`.',
      {
        hint: `move each option up to \`opts\` (renaming or dropping it as noted) and delete \`theme_opts\`. See ${MIGRATION_GUIDE_URL}`,
        path: 'theme_opts',
      }
    );
    const nested = opts.theme_opts;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      for (const key of Object.keys(nested)) {
        bag.warning('opts/v4-option', `v4 option "theme_opts.${key}" is ignored.`, {
          hint:
            v4OptionHint(key) ??
            (themeKeys.has(key)
              ? `move it up to \`opts.${key}\`.`
              : `not a v5 option — see ${MIGRATION_GUIDE_URL}`),
          path: `theme_opts.${key}`,
        });
      }
    }
  }

  for (const key of Object.keys(opts)) {
    if (key === 'theme_opts' || themeKeys.has(key)) continue;
    const hint = v4OptionHint(key);
    if (hint) {
      bag.warning(V4_TOP_LEVEL_CODE, `"${key}" is a v4 option and is ignored.`, {
        hint,
        path: key,
      });
    }
  }
}
