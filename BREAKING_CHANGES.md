# Breaking Changes

This is the canonical short list. Full detail, option tables, and before/after
config live in [MIGRATION.md](./MIGRATION.md); each item below links to the
relevant section.

## v5.0.0 (upcoming)

v5 is a ground-up rewrite. Breaking changes, by category:

### Options namespace

- **Options moved `opts.theme_opts.*` → `opts.*`.** The `theme_opts` block no
  longer exists; theme options are read directly from `opts` and validated.
  → [MIGRATION §3](./MIGRATION.md#3-where-options-live),
  [§4](./MIGRATION.md#4-option-mapping-table).
- **Renamed:** `base_url` → `basePath`; `sections` → `sectionOrder`.
  → [MIGRATION §4](./MIGRATION.md#4-option-mapping-table).
- **Changed shape:** `title` → `siteName` (string or logo set);
  `menu` entries reshaped to `{ id, title, link/href, icon }` (`target`/`class`
  dropped). → [MIGRATION §4](./MIGRATION.md#4-option-mapping-table).

### Removed features

- **Custom CSS/JS injection removed:** `create_style`, `include_css`,
  `add_style_path`, `add_scripts`, `add_script_path`, `include_js`, `static_dir`.
  Tailwind is compiled at the theme's build time; `render()` is pure.
  → [MIGRATION §7](./MIGRATION.md#7-removed-features).
- **Other removed options:** `default_theme`/`fallback-*`, `favicon`,
  `homepageTitle`, `meta`, `search` (always on now), `codepen`, `footer`,
  `exclude_inherited`, `displayModuleHeader`, `sort`, `shouldRemoveScrollbarStyle`.
  → [MIGRATION §7](./MIGRATION.md#7-removed-features).

### Output layout

- **SSR + per-page `.md` + lazy islands.** Every page is server-rendered and
  emits a co-located Markdown file; assets move under `_assets/`
  (`styles.<buildId>.css`, etc.). v4-era hardcoded asset paths break.
  → [MIGRATION §6](./MIGRATION.md#6-behavioral--breaking-changes).

### Theme system

- **No theme picker.** `default_theme`/`fallback-*` are gone; v5 ships
  light + dark token palettes and a runtime toggle.
  → [MIGRATION §6](./MIGRATION.md#6-behavioral--breaking-changes).

### Search

- **Search is always on** (built-in fuzzy index + optional Pagefind full-text);
  the `search` enable/disable opt is removed.
  → [MIGRATION §6](./MIGRATION.md#6-behavioral--breaking-changes).

### Minimum versions

- **JSDoc `>=4`** (v4 supported `>=3.x <=4.x`) and **Node `>=20`**.
  → [MIGRATION §2](./MIGRATION.md#2-compatibility-matrix).

See [MIGRATION.md](./MIGRATION.md) for the full guide and for staying on v4.

## v4.x

v4 is in maintenance. See CHANGELOG.md on the `v4-maintenance` branch.
