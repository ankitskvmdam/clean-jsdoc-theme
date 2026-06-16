---
name: migrate-v4-to-v5
description: >-
  Step-by-step procedure to migrate a project from clean-jsdoc-theme v4 to v5.
  Use when a user wants to upgrade, migrate, or port their JSDoc config from
  clean-jsdoc-theme v4 to v5 — moving options out of opts.theme_opts, renaming
  options (base_url→basePath, title→siteName, sections→sectionOrder, custom
  CSS/JS), handling removed options, reshaping the menu, and verifying the build.
---

# Migrate clean-jsdoc-theme v4 → v5

<!-- skill-revision: 2026-06-13 -->

This skill walks a project from **clean-jsdoc-theme v4 to v5**. v5 is a ground-up
rewrite: it server-renders every page, emits a companion `.md` per page, ships
built-in search, a source viewer, and an `opts.docs` prose pipeline. The config
surface changed significantly — this is the procedure to port it safely.

> **Skill revision:** `2026-06-13`. The canonical, exhaustive reference is the
> repo's [`MIGRATION.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/MIGRATION.md)
> and the machine-readable [`migration-map.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/migration-map.json).
> If you can fetch them, prefer their current contents over anything cached here.
> For broader theme knowledge, pair this with the umbrella `clean-jsdoc-theme`
> skill. See [§7 Staying current](#7-staying-current).

## The one thing to know

**v4 nested theme options under `opts.theme_opts.*`. v5 reads them directly from
`opts.*` — there is no `theme_opts` block in v5.** Most options were also renamed
or removed. So migration is: lift options out of `theme_opts`, rename the few that
carry over, drop the rest, then optionally adopt v5's new features.

## 0. Before you start — compatibility

- **JSDoc** `>=4` (v4 allowed 3.x). **Node** `>=20`.
- The `plugins/markdown` plugin is **no longer required** by the theme (v5 renders
  Markdown itself) — but it's harmless to keep, and you likely want it for other
  reasons. (Note: the umbrella skill says JSDoc *needs* it; that's for fresh v5
  setups where comment Markdown must be pre-rendered — verify against the user's
  pipeline. Keeping it is safe.)
- Check the user really wants to move: to **stay on v4**, pin
  `"clean-jsdoc-theme": "^4"`. v5 prereleases publish under the npm `next`
  dist-tag, so `^4`/`latest` won't pull them.

## 1. Migration procedure

Work through these in order. Make the edits, don't just describe them — then build
and verify (§5).

<steps>

<step label="Find the current setup">

Locate the JSDoc config (usually `jsdoc.json` or a `conf.json`; sometimes inline
in `package.json`). Confirm it's v4 by the presence of an `opts.theme_opts` block
and/or `"clean-jsdoc-theme": "^4"` in `package.json`. Note every key under
`theme_opts` — that's your migration work-list.

</step>

<step label="Bump the dependency">

```sh
npm i -D clean-jsdoc-theme@latest   # or @next while v5 is in prerelease
```

Keep `template` pointing at `node_modules/clean-jsdoc-theme` (in v5 you may point
at `node_modules/clean-jsdoc-theme/dist`; the package `main` resolves either way).

</step>

<step label="Lift options out of theme_opts">

Move every `opts.theme_opts.*` key up to `opts.*`, applying the rename/removal
table in [§2](#2-option-mapping). Then **delete the now-empty `theme_opts`
block**. Renames that carry over:

- `base_url` → `basePath`
- `title` → `siteName`
- `sections` → `sectionOrder`
- `create_style` → `customCss`, `include_css` / `add_style_path` → `customCssFile`
- `add_scripts` → `customJs`, `include_js` / `add_script_path` → `customJsFile`

</step>

<step label="Reshape the menu">

v4 entry `{ title, link, target, class, id }` → v5 entry
`{ id?, title?, link (or href)?, icon? }`. Drop `target` and `class`; add `icon`
(`lucide:<name>` or `simpleicons:<name>`) if you like. In v5, `id` also selects
built-ins (`{ id: "home" }`, `{ id: "source" }`), and a `menu` **takes precedence
over `sectionOrder`** and owns the whole top region of the sidebar.

</step>

<step label="Remove what's gone">

Delete options with no v5 equivalent and tell the user what replaced them
([§3](#3-removed-features)): `default_theme`, `homepageTitle`,
`includeFilesListInHomepage`, `search`, `static_dir`,
`exclude_inherited`, `displayModuleHeader`, `sort`, `shouldRemoveScrollbarStyle`.
(`footer`, `meta`, `codepen`, and `favicon` are **not** removed in v5 — map them, see
[§2](#2-option-mapping).) Most are now automatic (search is always on; light/dark
is a runtime toggle) or moved to JSDoc's own config (`static_dir`).

</step>

<step label="Optionally adopt v5 features">

Migration doesn't require these, but they're the reason to be on v5 — offer them
(see the umbrella skill for syntax): `docs` + `docGroups` (a prose-guides
directory beside the API), `fonts`, `siteName` logo sets, `copyPage` / `aiPrompt`
(LLM actions), `@category` / `@order` for sidebar structure, `@iframe` embeds, and
the source viewer (`templates.default.outputSourceFiles`).

</step>

</steps>

## 2. Option mapping

`opts.theme_opts.<v4>` → `opts.<v5>`. Status: `renamed | changed | removed`.

| v4 (`theme_opts.*`) | v5 (`opts.*`) | Status | Note |
| --- | --- | --- | --- |
| `default_theme` | — | removed | Light/dark token sets + runtime toggle; no picker. |
| `base_url` | `basePath` | renamed | Site root prefixed onto links. Default `/`. |
| `favicon` | `favicon` | kept | A file path; theme copies it + emits `<link rel="icon">` (needed for SVG). |
| `homepageTitle` | — | removed | Home `<title>` derives from README/`docs/index.md` + `siteName`. |
| `title` | `siteName` | changed | String **or** logo set `{ default, dark, light, alt }`. |
| `includeFilesListInHomepage` | — | removed | The Source Files section lists files instead. |
| `menu` | `menu` | changed | Reshaped (see step 4); `target`/`class` dropped, `icon` added. |
| `sections` | `sectionOrder` | renamed | Filter + order sidebar sections. |
| `meta` | `meta` | changed | Supported again — array of attribute maps → `<meta>` tags in `<head>` (same shape as v4). |
| `search` | — | removed | Always-on fuzzy search + optional Pagefind. |
| `codepen` | `playground` | changed | v4 prefilled a CodePen from `@example`; v5 generalizes it to `opts.playground` + the `@playground` tag (CodePen/JSFiddle/CodeSandbox). For an existing pen by URL, use `@iframe`. |
| `static_dir` | — | removed | Use JSDoc's own static-file config. |
| `create_style` | `customCss` | renamed | Inline CSS, injected after the theme stylesheet. |
| `include_css` | `customCssFile` | renamed | CSS file(s); copied to a content-hashed `_assets/` link. |
| `add_style_path` | `customCssFile` | changed | Was an external `<link>`; now read + emitted as a cached asset. |
| `add_scripts` | `customJs` | renamed | Inline JS, runs last (before `</body>`). |
| `include_js` | `customJsFile` | renamed | JS file(s); copied to a content-hashed `_assets/` reference. |
| `add_script_path` | `customJsFile` | changed | Was an external `<script>`; now read + emitted as a cached asset. |
| `footer` | `footer` | changed | Supported again — inline HTML string or `{ file: "./footer.html" }`; style via `customCss`/`customCssFile`. |
| `exclude_inherited` | — | removed | No equivalent. |
| `displayModuleHeader` | — | removed | No equivalent. |
| `sort` | — | removed | No equivalent. |
| `shouldRemoveScrollbarStyle` | — | removed | No equivalent. |

A machine-readable version of this exact map (for codemods) lives at
`migration-map.json` in the repo root and is mirrored in `MIGRATION.md` §11
(`v5: null` means removed).

## 3. Removed features → replacement

- `default_theme` / `fallback-*` → built-in light/dark + runtime toggle (no opt).
- `search` toggle → always on (fuzzy + optional Pagefind).
- `static_dir` → JSDoc's own static-file copying. (`favicon` is back as an opt.)
- `homepageTitle`, `includeFilesListInHomepage`, `exclude_inherited`,
  `displayModuleHeader`, `sort`, `shouldRemoveScrollbarStyle` → no replacement opt.

## 4. Before / after `jsdoc.json`

**v4:**

```json5
{
  source: { include: ["lib", "package.json", "README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    readme: "./README.md",
    destination: "docs/",
    recurse: true,
    template: "./node_modules/clean-jsdoc-theme",
    theme_opts: {
      default_theme: "dark",
      base_url: "https://example.com/docs/",
      title: "My Library",
      menu: [{ title: "GitHub", link: "https://github.com/me/lib", target: "_blank" }],
      sections: ["Classes", "Modules", "Global"],
      search: true,
      footer: "© My Library",
      include_css: ["./static/custom.css"],
    },
  },
  markdown: { idInHeadings: true },
}
```

**v5:**

```json5
{
  source: { include: ["lib", "package.json", "README.md"] },
  opts: {
    readme: "./README.md",
    destination: "docs/",
    recurse: true,
    template: "./node_modules/clean-jsdoc-theme",
    // lifted out of theme_opts + renamed:
    basePath: "https://example.com/docs/",
    siteName: "My Library",
    menu: [
      { id: "home", title: "Home" },
      { title: "GitHub", link: "https://github.com/me/lib", icon: "simpleicons:github" },
    ],
    sectionOrder: ["Classes", "Modules", "Global"],
    footer: "© My Library",
    // dropped: default_theme (auto), search (always on)
    customCssFile: "./static/custom.css",
    // optional v5 upside:
    docs: "./docs",
  },
}
```

Diff highlights: the `theme_opts` block is gone; `base_url`→`basePath`,
`title`→`siteName`, `sections`→`sectionOrder`; `menu` reshaped; `search`
dropped; `footer` stays (now also accepts `{ file }`); `include_css`→`customCssFile`.

## 5. Build & verify

```sh
npx jsdoc -c jsdoc.json
npx serve <destination>     # Pagefind full-text search needs HTTP
```

Check:

- The build completes. v5 **warns** on unknown/typo'd options (with a "did you
  mean?" hint) and continues — read the output and fix any flagged keys. Set
  `opts.strict: true` to make those warnings hard errors while migrating, then
  relax it.
- A leftover `theme_opts` block, or any v4 option name, will show up as an
  unknown-key warning — that's your signal something wasn't lifted/renamed.
- Output layout changed: pages are SSR HTML + a co-located `index.md`, assets live
  under `_assets/` (e.g. `_assets/styles.<buildId>.css`). Any hardcoded v4 asset
  paths or scripts that scraped v4 output will need re-linking.
- The site has light/dark, `Ctrl K` search, and (if `outputSourceFiles` is on) a
  Source Files section — all without config.

## 6. Common migration gotchas

- **Options silently ignored:** they're still under `theme_opts` (v5 doesn't read
  it) — lift them to `opts.*`.
- **A renamed option "doesn't work":** you kept the v4 name (`title`, `base_url`,
  `sections`, `create_style`, …) — apply the §2 rename. Watch the build's
  unknown-key warnings.
- **Custom CSS/JS vanished:** the four v4 spellings were consolidated — rename to
  `customCss` / `customCssFile` / `customJs` / `customJsFile`. (`static_dir` has no
  equivalent — use JSDoc's static-file config.)
- **`default_theme` removed:** there's no theme picker; customize via `fonts` and
  theme tokens (`colors` / `darkColors`), not an opt.
- **Build fails on a typo where v4 ignored it:** that's `strict` mode — by default
  v5 warns and continues; only `strict: true` fails.

## 7. Staying current

Do this with restraint — at most once per session, only when relevant, and never
nag. Compare the installed theme version to npm's latest and mention it if behind:

```sh
npm ls clean-jsdoc-theme 2>/dev/null
npm view clean-jsdoc-theme version
```

For the canonical, always-up-to-date mapping, fetch `MIGRATION.md` /
`migration-map.json` from the repo rather than trusting a stale cache:

```sh
curl -fsSL https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/migration-map.json
```

After migrating, hand the user the umbrella `clean-jsdoc-theme` skill so the
assistant can help them adopt the new v5 features (`docs`, callouts/steps/tabs,
`@category`/`@order`, …) they just unlocked.
