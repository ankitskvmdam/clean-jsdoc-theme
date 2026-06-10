# Migration Guide — clean-jsdoc-theme v4 → v5

This document is written to be consumed by both humans and LLMs/codemods:
predictable section order, exhaustive option tables, and a machine-readable
companion (`migration-map.json` at the repo root, plus the fenced JSON block in
[§11](#11-machine-readable-companion)).

## 1. TL;DR

- **v5 is a ground-up rewrite.** It server-renders every page, emits a
  co-located `.md` for each page (LLM-friendly), lazy-hydrates Preact islands,
  ships a built-in fuzzy search + optional Pagefind full-text index, a source
  viewer, and an `opts.docs` prose-docs pipeline.
- **Options moved namespaces.** v4 nested theme options under
  `opts.theme_opts.*` in `jsdoc.json`. **v5 reads them directly from `opts.*`**
  (there is no `theme_opts` block in v5).
- **Custom CSS/JS injection is back, under new names.** v5 supports `customCss`
  / `customCssFile` (inline string + file path(s)) and `customJs` /
  `customJsFile`. Custom CSS loads after the theme stylesheet so it overrides;
  custom JS runs last. The v4 spellings (`create_style`, `include_css`,
  `add_style_path`, `add_scripts`, `add_script_path`, `include_js`) are gone —
  rename to the four `custom*` options. `static_dir` has no equivalent (use
  JSDoc's own static-file config); Tailwind is still compiled at the theme's
  build time so `render()` stays pure.
- **Most v4 options are gone; v5 has a new, smaller surface.** Only `base_url`
  (→ `basePath`), `sections` (→ `sectionOrder`), `title` (→ `siteName`), and
  `menu` (reshaped) carry over. Everything else was removed or replaced by new
  v5 features (`docs`, `fonts`, `copyPage`, `aiPrompt`, …).
- **To stay on v4:** pin `"clean-jsdoc-theme": "^4"` — see [§10](#10-staying-on-v4).

## 2. Compatibility matrix

| Requirement      | v4 (`4.3.2`)            | v5 (`5.0.0`)                          |
| ---------------- | ----------------------- | ------------------------------------- |
| JSDoc (peer dep) | `>=3.x <=4.x`           | `>=4.x`                               |
| Node             | not pinned              | `>=20` (repo `engines.node`)          |
| Package manager  | npm/yarn                | any (theme is published to npm)       |
| Markdown plugin  | `plugins/markdown` recommended (`idInHeadings: true`) | not required (built-in markdown rendering) |
| Custom CSS/JS    | supported (injection options) | not supported (see [§6](#6-removed-features)) |

Source: v4 peer dep from `git show v4.3.2:package.json`
(`"jsdoc": ">=3.x <=4.x"`); v5 peer dep from
`packages/clean-jsdoc-theme/package.json` (`"jsdoc": ">=4.x"`); Node from the
root `package.json` `engines`.

## 3. Where options live

```jsonc
// v4 — options nested under opts.theme_opts
{ "opts": { "template": "node_modules/clean-jsdoc-theme",
            "theme_opts": { "default_theme": "dark" } } }

// v5 — options live directly under opts (NO theme_opts block)
{ "opts": { "template": "node_modules/clean-jsdoc-theme",
            "siteName": "My Library" } }
```

## 4. Option mapping table

One row per v4 `opts.theme_opts.*` option, exhaustive against the v4.3.2 README
cheat sheet + prose. Status enum: `unchanged | renamed | moved | changed |
removed | new`.

| v4 option (`opts.theme_opts.*`) | v5 equivalent (`opts.*`) | Status  | Notes |
| ------------------------------- | ------------------------ | ------- | ----- |
| `default_theme`                 | — (auto light/dark)      | removed | No theme-name picker. v5 ships light + dark token sets and a runtime toggle; no `fallback-*`/forced-default option. Customize via theme tokens, not an opt. |
| `base_url`                      | `basePath`               | renamed | Same intent (site root prefixed onto links). v5 key is `basePath`; renderer default is `/`. |
| `favicon`                       | —                        | removed | No `favicon` option. (Use JSDoc's own static-file copying if you need to ship one.) |
| `homepageTitle`                 | —                        | removed | No dedicated homepage-title option; the home page derives its `<title>` from the README/`docs/index.md` + `siteName` suffix. |
| `title`                         | `siteName`               | changed | v4 `title` set the sidebar title (HTML or string). v5 `siteName` is a string **or** a logo set `{ default, dark, light, alt }`; local image paths are copied to the output. Shown in header/footer + appended to each page `<title>`. |
| `includeFilesListInHomepage`    | —                        | removed | No file-list-on-homepage toggle. The Source Files section (when source viewing is on) lists files instead. |
| `menu`                          | `menu`                   | changed | Still an array, but reshaped. v4 entry: `{ title, link, target, class, id }`. v5 entry: `{ id, title, link (or href), icon }` (`MenuItem`); `target`/`class` dropped, `icon` added, `id` now also selects built-in sections. v5 `menu` takes precedence over `sectionOrder` and controls the whole sidebar. |
| `sections`                      | `sectionOrder`           | renamed | Same idea (filter + order sidebar sections). v5 key is `sectionOrder`; "Home" and "Source Files" are always shown regardless. |
| `meta`                          | —                        | removed | No custom `<meta>` injection option. |
| `search`                        | —                        | removed | Search is always on in v5 (built-in fuzzy index + optional Pagefind); there is no enable/disable opt. |
| `codepen`                       | —                        | removed | No CodePen prefill option. v5 has sandboxed embeds via the `@iframe` tag / `iframe` prose fence instead. |
| `static_dir`                    | —                        | removed | No theme-level static-dir copying. Use JSDoc's own static-file config. |
| `create_style`                  | `customCss`              | renamed | Inline custom CSS string. Injected as a `<style>` after the theme stylesheet (so it overrides). |
| `include_css`                   | `customCssFile`          | renamed | Custom CSS file(s) (path or array). Read by the bridge, emitted once as `_assets/custom.<buildId>.css`, linked after the theme stylesheet. |
| `add_style_path`                | `customCssFile`          | changed | Was an external-CSS `<link>`; now the file is read and emitted as a cached asset link. Use a `customCssFile` path. |
| `add_scripts`                   | `customJs`               | renamed | Inline custom JS string. Injected as a classic `<script>` before `</body>`, after the theme's own scripts. |
| `include_js`                    | `customJsFile`           | renamed | Custom JS file(s) (path or array). Emitted once as `_assets/custom.<buildId>.js` and referenced before `</body>`. |
| `add_script_path`               | `customJsFile`           | changed | Was an external-JS `<script>`; now the file is read and emitted as a cached asset. Use a `customJsFile` path. |
| `footer`                        | —                        | removed | No `footer` HTML/string option. Footer content derives from `siteName`/`pkg`. |
| `exclude_inherited`             | —                        | removed | No exclude-inherited-symbols option. |
| `displayModuleHeader`           | —                        | removed | No module-header toggle. |
| `sort`                          | —                        | removed | No members/methods sort toggle. |
| `shouldRemoveScrollbarStyle`    | —                        | removed | No scrollbar-style toggle. |

### v5-only NEW options

These have no v4 counterpart. Sourced from the `JSDocOpts` interface in
`packages/clean-jsdoc-theme/src/publish.ts` and cross-checked against
`THEME_OPT_KEYS` in `packages/utils/src/config/opts-schema.ts`.

| v5 option (`opts.*`)                       | Type                                              | Purpose |
| ------------------------------------------ | ------------------------------------------------- | ------- |
| `siteName`                                 | `string` \| `{ default?, dark?, light?, alt? }`   | Site identity (text or logo set); appended to `<title>`. |
| `fonts`                                    | `{ heading?, body?, mono? }`                      | `heading`/`body` are Google Fonts family names; `mono` is a CSS stack. |
| `basePath`                                 | `string`                                          | Site root path prefixed onto links (default `/`). |
| `docs`                                     | `string` (directory path)                         | Prose-docs directory; layout drives slug + sidebar group. |
| `docGroups`                                | `string[]`                                        | Order of doc-group sidebar sections. |
| `defaultDocGroup`                          | `string`                                          | Group label for ungrouped docs. |
| `sectionOrder`                             | `string[]`                                        | Filter + order API sidebar sections. |
| `menu`                                     | `Array<{ id?, title?, link?/href?, icon? }>`      | Full sidebar control; precedes `sectionOrder`. |
| `clubSidebarItems`                         | `boolean`                                         | Group sidebar entries into prefix subtrees. |
| `aiPrompt`                                 | `string`                                          | Custom prompt for the copy-page "Open in ChatGPT/Claude/Perplexity" actions (`{siteName}`/`{url}`/`{mdUrl}` placeholders). |
| `copyPage`                                 | `boolean` \| `{ enabled?, actions? }`             | Copy-page button; `actions` ⊆ `["copy","view","claude","chatgpt","perplexity"]`. |
| `strict`                                   | `boolean`                                         | Fail the build on opts-validation errors (default: warn + continue). |
| `templates.default.outputSourceFiles`      | `boolean` (JSDoc-standard)                        | Default `true`; `false` suppresses source-viewer pages + `Source:` links. |
| `templates.default.sourceLinkToComment`    | `boolean` (JSDoc-standard)                        | Default `false`; `true` points `Source:` links at the doc-comment line. |

## 5. Before / after `jsdoc.json`

### v4

```json
{
  "source": {
    "include": ["lib", "package.json", "README.md"],
    "includePattern": ".js$",
    "excludePattern": "(node_modules/|docs)"
  },
  "plugins": ["plugins/markdown"],
  "opts": {
    "encoding": "utf8",
    "readme": "./README.md",
    "destination": "docs/",
    "recurse": true,
    "template": "./node_modules/clean-jsdoc-theme",
    "theme_opts": {
      "default_theme": "dark",
      "base_url": "https://example.com/docs/",
      "title": "My Library",
      "menu": [
        { "title": "GitHub", "link": "https://github.com/me/lib", "target": "_blank" }
      ],
      "sections": ["Classes", "Modules", "Global"],
      "search": true,
      "footer": "© My Library",
      "include_css": ["./static/custom.css"]
    }
  },
  "markdown": { "idInHeadings": true }
}
```

### v5

```json
{
  "source": {
    "include": ["lib", "package.json", "README.md"],
    "includePattern": ".js$",
    "excludePattern": "(node_modules/|docs)"
  },
  "opts": {
    "encoding": "utf8",
    "readme": "./README.md",
    "destination": "docs/",
    "recurse": true,
    "template": "./node_modules/clean-jsdoc-theme",
    "basePath": "https://example.com/docs/",
    "siteName": "My Library",
    "menu": [
      { "id": "home", "title": "Home" },
      { "title": "GitHub", "link": "https://github.com/me/lib", "icon": "github" }
    ],
    "sectionOrder": ["Classes", "Modules", "Global"],
    "docs": "./docs",
    "customCssFile": "./static/custom.css"
  }
}
```

Notes on the diff:

- `theme_opts` block is gone; options moved up to `opts`.
- `base_url` → `basePath`, `title` → `siteName`, `sections` → `sectionOrder`.
- `menu` entries reshaped (`target`/`class` dropped, `icon` added; `id` selects
  built-ins).
- `search: true` dropped (always on). `footer` dropped (derived). `include_css`
  → `customCssFile` (and `create_style` → `customCss` for inline CSS).
- `plugins: ["plugins/markdown"]` no longer required for the theme.

## 6. Behavioral / breaking changes

Each entry: **what changed → why → migration action.**

- **Options moved `opts.theme_opts.*` → `opts.*`.** Why: v5 dropped the nested
  block; opts are validated against a known set with typo suggestions (utils
  `validateThemeOpts`). Action: lift every option out of `theme_opts` and rename
  per [§4](#4-option-mapping-table). Remove the now-empty `theme_opts` block.
- **Output layout changed (SSR + per-page `.md`).** Why: every page is
  server-rendered and emits a co-located `.md` plus lazy-hydrated islands;
  assets live under `_assets/` (e.g. `_assets/styles.<buildId>.css`). Action:
  none required, but any v4-era hardcoded asset paths / scraping of v4 output
  will break — regenerate and re-link.
- **Custom CSS/JS injection renamed (not removed).** Why: the four v4 CSS/JS
  options were consolidated into `customCss`/`customCssFile`/`customJs`/
  `customJsFile`; the bridge reads files (so `render()` stays pure) and emits
  them as cached `_assets/custom.<buildId>.{css,js}` assets. Custom CSS loads
  after the theme stylesheet (overrides it); custom JS runs last. Action: rename
  `create_style`→`customCss`, `include_css`/`add_style_path`→`customCssFile`,
  `add_scripts`→`customJs`, `include_js`/`add_script_path`→`customJsFile`. Only
  `static_dir` has no equivalent (use JSDoc's own static-file config); deeper
  restyling is still best done via theme tokens.
- **Theme system replaced.** Why: no `default_theme`/`fallback-*` picker; v5
  ships light + dark token palettes and a runtime toggle. Action: drop
  `default_theme`; use `fonts` (and theme tokens) for customization.
- **Search is always on.** Why: built-in dependency-free fuzzy index + optional
  Pagefind full-text index, loaded lazily. Action: remove `search` and
  `base_url`-for-search workarounds; nothing to enable.
- **Minimum versions raised.** Why: v5 targets modern JSDoc + Node. Action:
  ensure JSDoc `>=4` and Node `>=20`.
- **Strict vs resilient validation.** Why: v5 validates opts and prints
  diagnostics; by default it warns and continues so a bad font/typo never breaks
  a build. Action: set `opts.strict: true` if you want validation errors to fail
  the build.

## 7. Removed features

For each: the v5 replacement, or "no replacement."

| Removed v4 feature                | v5 replacement |
| --------------------------------- | -------------- |
| `default_theme` / `fallback-*`    | Built-in light/dark token sets + runtime toggle (no opt). |
| `favicon`                         | No replacement opt (use JSDoc's static-file copy). |
| `homepageTitle`                   | Home `<title>` derived from README/`docs/index.md` + `siteName`. |
| `meta` (custom `<meta>` tags)     | No replacement. |
| `search` toggle                   | Always-on fuzzy search + optional Pagefind (no opt). |
| `codepen`                         | `@iframe` block tag / `iframe` prose fence (sandboxed embeds). |
| `static_dir`                      | JSDoc's own static-file copying. |
| `create_style` / `include_css` / `add_style_path` | Renamed → `customCss` (inline) / `customCssFile` (file path or array). |
| `add_scripts` / `include_js` / `add_script_path`   | Renamed → `customJs` (inline) / `customJsFile` (file path or array). |
| `footer`                          | Footer derived from `siteName`/`pkg`. |
| `exclude_inherited`               | No replacement opt. |
| `displayModuleHeader`             | No replacement opt. |
| `sort`                            | No replacement opt. |
| `shouldRemoveScrollbarStyle`      | No replacement opt. |

## 8. New in v5

Short overview; see `ARCHITECTURE.md` for the authoritative detail.

- **Prose-docs pipeline** (`opts.docs`, `docGroups`, `defaultDocGroup`) — a
  directory of Markdown/HTML where the filesystem layout drives the URL + sidebar
  group; frontmatter (`title`/`group`/`order`/`slug`/`hidden`) overrides
  defaults; `docs/index.md` becomes the home page. See ARCHITECTURE
  "`@clean-jsdoc-theme/setu`".
- **Per-page `.md` + copy-page button** (`copyPage`, `aiPrompt`) — each page
  emits a co-located Markdown file; the copy-page button can open it in
  ChatGPT/Claude/Perplexity. See ARCHITECTURE "`@clean-jsdoc-theme/rang`".
- **Fuzzy search + optional Pagefind** — dependency-free fuzzy matcher over
  weighted fields, plus an optional full-text index written post-build
  (`runPagefindAgainstDir`). See ARCHITECTURE "The pipeline" and
  "`@clean-jsdoc-theme/dwar`".
- **Source viewer** (`templates.default.outputSourceFiles`,
  `sourceLinkToComment`) — per-file read-only viewer pages + `Source: file:line`
  links. See ARCHITECTURE "`@clean-jsdoc-theme/dwar`".
- **`@category` / `@order` sidebar** — group + order API pages by doclet tags
  (`@category Core/Parsing order=1`, standalone `@order N`). See ARCHITECTURE
  "`@clean-jsdoc-theme/setu`".
- **`@iframe` embeds** — sandboxed iframes via the `@iframe` block tag (needs
  `tags.allowUnknownTags: true`) or an `iframe` prose fence. See ARCHITECTURE
  "`@clean-jsdoc-theme/setu`".
- **`siteName` logo sets + `fonts`** — text or `{ default, dark, light, alt }`
  logos (local paths copied to output); Google-Fonts `heading`/`body` + a CSS
  `mono` stack.
- **`menu` / `sectionOrder` / `clubSidebarItems`** — full sidebar control.
- **opts validation + build report** (`strict`) — typo-suggesting validation and
  a Next.js-style per-route size/gzip build report.

## 10. Staying on v4

Pin the v4 major version in your `package.json`:

```json
{
  "devDependencies": {
    "clean-jsdoc-theme": "^4"
  }
}
```

v4 will continue to receive security patches for 12 months after v5 ships.
v5 alpha/beta releases publish under the npm `next` dist-tag, so `^4` (or a plain
`clean-jsdoc-theme` install resolving to `latest`) will not pull a prerelease.

## 11. Machine-readable companion

The same mapping as [§4](#4-option-mapping-table), for codemods/LLMs. The
canonical copy is `migration-map.json` at the repo root; it is mirrored here.
`v5: null` means removed.

```json
{
  "v4ToV5": {
    "default_theme": { "v5": null, "status": "removed" },
    "base_url": { "v5": "basePath", "status": "renamed" },
    "favicon": { "v5": null, "status": "removed" },
    "homepageTitle": { "v5": null, "status": "removed" },
    "title": { "v5": "siteName", "status": "changed" },
    "includeFilesListInHomepage": { "v5": null, "status": "removed" },
    "menu": { "v5": "menu", "status": "changed" },
    "sections": { "v5": "sectionOrder", "status": "renamed" },
    "meta": { "v5": null, "status": "removed" },
    "search": { "v5": null, "status": "removed" },
    "codepen": { "v5": null, "status": "removed" },
    "static_dir": { "v5": null, "status": "removed" },
    "create_style": { "v5": "customCss", "status": "renamed" },
    "add_style_path": { "v5": "customCssFile", "status": "changed" },
    "include_css": { "v5": "customCssFile", "status": "renamed" },
    "add_scripts": { "v5": "customJs", "status": "renamed" },
    "add_script_path": { "v5": "customJsFile", "status": "changed" },
    "include_js": { "v5": "customJsFile", "status": "renamed" },
    "footer": { "v5": null, "status": "removed" },
    "exclude_inherited": { "v5": null, "status": "removed" },
    "displayModuleHeader": { "v5": null, "status": "removed" },
    "sort": { "v5": null, "status": "removed" },
    "shouldRemoveScrollbarStyle": { "v5": null, "status": "removed" }
  },
  "v5New": [
    "siteName", "fonts", "basePath", "docs", "docGroups", "defaultDocGroup",
    "sectionOrder", "menu", "clubSidebarItems", "aiPrompt", "copyPage", "strict",
    "templates.default.outputSourceFiles", "templates.default.sourceLinkToComment"
  ]
}
```
