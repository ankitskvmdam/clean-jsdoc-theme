---
title: Migrating v4 → v5
group: Using the Theme
order: 6
---

# Migrating v4 → v5

v5 is a ground-up rewrite: it server-renders every page, emits a companion `.md`
for each, ships built-in search and a source viewer, and adds an `opts.docs` prose
pipeline. The configuration surface changed a lot — but the move is mechanical, and
this page (plus the migration skill below) walks you through it.

> [!TIP]
> **You can hand this whole job to your AI assistant.** There's a dedicated
> [**migration skill**](#let-an-agent-do-it) — point your agent at it and it will
> lift your options, rename what carries over, drop what's gone, and verify the
> build. See [Let an agent do it](#let-an-agent-do-it) at the bottom.

## The one thing to know

v4 nested theme options under **`opts.theme_opts.*`**. v5 reads them **directly
from `opts.*`** — there is no `theme_opts` block in v5. So migration is, in
essence: lift your options up out of `theme_opts`, rename the few that carry over,
drop the rest, then optionally adopt v5's new features.

```json5
// v4 — nested under opts.theme_opts
{ opts: { template: "node_modules/clean-jsdoc-theme",
          theme_opts: { default_theme: "dark", title: "My Library" } } }

// v5 — directly under opts (no theme_opts)
{ opts: { template: "node_modules/clean-jsdoc-theme",
          siteName: "My Library" } }
```

## Steps

<steps>

<step label="Check compatibility">

v5 needs **JSDoc ≥ 4** and **Node ≥ 20**. The `plugins/markdown` plugin is no
longer required by the theme (v5 renders Markdown itself), though keeping it is
harmless. Prefer to stay on v4 for now? Pin `"clean-jsdoc-theme": "^4"` — v5
prereleases publish under the npm `next` tag, so `^4` won't pull them.

</step>

<step label="Upgrade the package">

```sh
npm i -D clean-jsdoc-theme@latest   # or @next during the v5 prerelease
```

</step>

<step label="Lift and rename options">

Move every key out of `theme_opts` up to `opts`, applying the
[mapping table](#option-mapping), then delete the empty `theme_opts` block. The
options that carry over (everything else is removed):

- `base_url` → [`basePath`](/theme/configuration#basepath)
- `title` → [`siteName`](/theme/configuration#sitename)
- `sections` → [`sectionOrder`](/theme/configuration#sectionorder)
- `create_style` → `customCss`, `include_css` / `add_style_path` →
  [`customCssFile`](/theme/configuration#customcssfile-and-customjsfile)
- `add_scripts` → `customJs`, `include_js` / `add_script_path` → `customJsFile`
- `menu` → [`menu`](/theme/configuration#menu) (reshaped — see below)

</step>

<step label="Build and verify">

```sh
npx jsdoc -c jsdoc.json
npx serve <destination>   # Pagefind full-text search needs HTTP
```

v5 **warns** (with a "did you mean?" hint) on any leftover `theme_opts` key or v4
option name and keeps building — read the output and fix what it flags. Set
[`strict: true`](/theme/configuration#strict) to turn those warnings into hard
errors while you migrate, then relax it.

</step>

</steps>

## Option mapping

`opts.theme_opts.<v4>` → `opts.<v5>`.

| v4 (`theme_opts.*`) | v5 (`opts.*`) | Status | Note |
| --- | --- | --- | --- |
| `default_theme` | — | removed | Light/dark token sets + runtime toggle; no picker. |
| `base_url` | `basePath` | renamed | Site root prefixed onto links. |
| `title` | `siteName` | changed | String **or** a logo set `{ default, dark, light, alt }`. |
| `menu` | `menu` | changed | Reshaped: `{ id?, title?, link/href?, icon?, target?, class? }` — adds `icon` + `id` built-ins. |
| `sections` | `sectionOrder` | renamed | Filter + order sidebar sections. |
| `create_style` | `customCss` | renamed | Inline CSS (loads after the theme stylesheet). |
| `include_css` / `add_style_path` | `customCssFile` | renamed/changed | CSS file → content-hashed asset link. |
| `add_scripts` | `customJs` | renamed | Inline JS (runs last). |
| `include_js` / `add_script_path` | `customJsFile` | renamed/changed | JS file → content-hashed asset. |
| `homepageTitle` | — | removed | Home `<title>` derives from README / `docs/index.md` + `siteName`. |
| `includeFilesListInHomepage` | — | removed | The Source Files section lists files. |
| `meta` | `meta` | changed | Supported again — an array of attribute maps → `<meta>` tags in `<head>`. See [`meta`](/theme/configuration#meta). |
| `search` | — | removed | Always-on fuzzy search + optional Pagefind. |
| `codepen` | `playground` | changed | v4 prefilled a CodePen from `@example`; v5 generalizes it to [`playground`](/components/playground) — open an example in CodePen, JSFiddle, or CodeSandbox via `opts.playground` + the `@playground` tag. (To embed an existing pen by URL, use [`@iframe`](/components/embeds).) |
| `static_dir` | — | removed | Use JSDoc's own static-file config. |
| `footer` | `footer` | changed | Supported again — an inline HTML string or `{ file: "./footer.html" }`. Style it with `customCss` / `customCssFile`. See [`footer`](/theme/configuration#footer). |
| `exclude_inherited`, `displayModuleHeader`, `sort`, `shouldRemoveScrollbarStyle` | — | removed | No equivalent. |

> [!NOTE]
> The **menu** reshaped: a v4 entry `{ title, link, target, class, id }` becomes a
> v5 `{ id?, title?, link (or href)?, icon?, target?, class? }` — you add an
> `icon` (`lucide:<name>` / `simpleicons:<name>`). In v5, `id` also selects
> built-ins (`{ id: "home" }`, `{ id: "source" }`), and a `menu` takes precedence
> over `sectionOrder`. See [`menu`](/theme/configuration#menu) and
> [Structure your sidebar](/guides/structure-your-sidebar).

## Before / after

<tabs group="version">

<tab label="v4 (theme_opts)">

```json5
{
  plugins: ["plugins/markdown"],
  opts: {
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
}
```

</tab>

<tab label="v5 (opts)">

```json5
{
  opts: {
    template: "./node_modules/clean-jsdoc-theme",
    basePath: "https://example.com/docs/",
    siteName: "My Library",
    menu: [
      { id: "home", title: "Home" },
      { title: "GitHub", link: "https://github.com/me/lib", icon: "simpleicons:github" },
    ],
    sectionOrder: ["Classes", "Modules", "Global"],
    footer: "© My Library",
    customCssFile: "./static/custom.css",
    // dropped: default_theme (auto), search (always on)
    docs: "./docs", // optional v5 upside
  },
}
```

</tab>

</tabs>

## What you unlock in v5

Migration is also an upgrade. Once you're on v5, reach for:

- [**Prose guides beside your API**](/guides/combine-guides-and-api) — `docs` +
  `docGroups`, the same pipeline this site uses.
- [**Authoring primitives**](/components/callouts) — callouts, steps, tabs, and
  live embeds in comments and prose.
- [**Sidebar structure**](/guides/structure-your-sidebar) — `@category` / `@order`
  tags, `clubSidebarItems`, `menu`.
- [**LLM features**](/theme/llm-skill) — a companion `.md` per page, the copy-page
  button, and `aiPrompt`.

## Let an agent do it

Don't want to do this by hand? **Point your AI assistant at the migration skill.**
It's a focused, source-verified procedure that detects your v4 config, applies the
mapping above, reshapes the menu, removes what's gone, and verifies the build —
then hands you the umbrella skill so the assistant can help you adopt the new v5
features.

- **Migration skill:**
  [`SKILLS/migrate-v4-to-v5/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/migrate-v4-to-v5/SKILL.md)
  — download it the same way as the [umbrella skill](/theme/llm-skill):

  ```sh
  curl -O https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/SKILLS/migrate-v4-to-v5/SKILL.md
  ```

  Then attach it to your assistant (or drop it into `.claude/skills/`) and say
  *"migrate my project from clean-jsdoc-theme v4 to v5."*

- **Canonical reference:** the exhaustive
  [`MIGRATION.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/MIGRATION.md)
  and the machine-readable
  [`migration-map.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/migration-map.json)
  back the skill — useful for codemods.

## See also

- [Use with an LLM](/theme/llm-skill) — the umbrella skill and how to feed it to
  your assistant.
- [Configuration](/theme/configuration) — every v5 option in detail.
- [JSDoc Getting Started](/theme/jsdoc-getting-started) — a fresh v5 setup from
  scratch.
