---
name: clean-jsdoc-theme
description: >-
  Expert guidance for working with clean-jsdoc-theme v5 — the JSDoc/TypeDoc
  documentation theme. Use when setting up the theme, writing jsdoc.json or
  typedoc.json options, authoring docs/guides/READMEs (callouts, steps, tabs,
  embeds, custom @category/@order/@iframe tags), structuring the sidebar,
  cross-linking with {@link}/@see, tuning theming/colors/fonts, localizing into
  multiple languages (the clean-jsdoc CLI / aadesh / bhasha), debugging a build,
  or contributing to the monorepo packages (utils, setu, rang, dwar).
---

# clean-jsdoc-theme — working skill

<!-- skill-revision: 2026-06-14 -->

This skill makes you an expert at **using and extending `clean-jsdoc-theme` v5**.
Everything here is verified against the source. When a user is documenting a
JS/TS project with this theme, configuring it, authoring prose, or hacking on the
packages, follow this over your prior assumptions about "a JSDoc theme."

This file is the **operating guide**: the mental model, setup, and behaviour. The
detailed reference lives in sibling files under `reference/` — **read the one that
matches the task** (don't load them all):

| Read this when… | File |
| --- | --- |
| Writing/validating `jsdoc.json` / `typedoc.json` options | [`reference/configuration.md`](reference/configuration.md) |
| Authoring prose: callouts, steps, tabs, embeds, custom tags | [`reference/authoring.md`](reference/authoring.md) |
| The docs directory, frontmatter, sidebar order, cross-links | [`reference/content-and-sidebar.md`](reference/content-and-sidebar.md) |
| Multi-language / i18n: the `clean-jsdoc` CLI, per-locale prose + fonts | [`reference/localization.md`](reference/localization.md) |
| Contributing to the packages (utils/setu/rang/dwar) | [`reference/architecture.md`](reference/architecture.md) |
| A build misbehaves / something doesn't render | [`reference/troubleshooting.md`](reference/troubleshooting.md) |

> **Skill revision:** `2026-06-14`. Versioned with the theme — see
> [§6 Staying current](#6-staying-current) for how (and how often) to check for a
> newer skill or theme release.
>
> Project: <https://github.com/ankitskvmdam/clean-jsdoc-theme> ·
> npm: `clean-jsdoc-theme` (JSDoc) and `@clean-jsdoc-theme/typedoc` (TypeDoc).

---

## 1. What it actually is (mental model)

`clean-jsdoc-theme` is **not** a CSS skin on JSDoc's default template. It is a
complete documentation pipeline. JSDoc or TypeDoc is used **only to collect doc
comments**; from there the theme builds its own structured model and renders a
modern static site.

The pipeline is one-way and shared by both entry points:

```
JSDoc doclets  ─┐
                ├─▶  setu.generateSite()  ─▶  SiteManifest  ─▶  dwar.render()  ─▶  static site
TypeDoc reflns ─┘        (no I/O)                                 (pure, uses rang components)
```

`render()` emits, per build: `‹slug›/index.html` per page (SSR + lazy-hydrated
Preact islands, only the islands a page uses); `‹slug›/index.md` per content page
(a **companion Markdown** authored for LLMs — the theme's defining feature);
`_assets/styles.‹buildId›.css`; `_assets/search-index.‹buildId›.json` (the `Ctrl K`
fuzzy index); `_islands/‹name›.js`; and optionally a **Pagefind** full-text index.

Guarantees worth knowing: **setu does no disk I/O** (the bridge reads files),
**dwar.render() is pure**, and **one page that fails to compile is skipped and
reported, never aborts the build**.

---

## 2. Setup

Two entry points. Pick the one matching the toolchain. The **option names and
values are identical** between them — only *where you put them* differs: JSDoc
uses `opts`, TypeDoc uses a `cleanJsdocTheme` block. (Full option list:
[`reference/configuration.md`](reference/configuration.md).)

### JSDoc

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

```json5
// jsdoc.json
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],          // REQUIRED — see note below
  opts: {
    template: "node_modules/clean-jsdoc-theme/dist",
    destination: "dist",
    recurse: true,
    readme: "./README.md",
    siteName: "My Library",               // ← theme options live under opts
  },
}
```

Build: `npx jsdoc -c jsdoc.json` → `dist/`. Serve with `npx serve dist` (Pagefind
needs HTTP, so opening `index.html` from disk won't load full-text search).

> **Required:** the `plugins/markdown` plugin. JSDoc renders comment Markdown →
> HTML *before* the theme sees it, and the theme consumes that HTML. Without it,
> descriptions arrive as raw, unformatted text.

### TypeDoc

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

```json5
// typedoc.json
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",
  plugin: ["@clean-jsdoc-theme/typedoc"],            // loads it
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],  // turns it on
  cleanJsdocTheme: { siteName: "My Library" },       // ← theme options live here
}
```

It registers a custom **output** (not a CSS theme extending `DefaultTheme`). Build
with `npx typedoc`. Runnable references in the repo: `examples/basic` (JSDoc),
`examples/typedoc-basic` (TypeDoc), `docs-site/` (a prose-first dogfood site).

---

## 3. What becomes a page

| Source | Result |
| --- | --- |
| Container symbol — `class`, `interface`, `mixin`, `module`, `namespace` | One page; members bucketed into sections. class/interface fold in inherited members via `@augments`/`@extends`. |
| `typedef` | Its own page (first-class — `@type`, `@property`, function-signature `@param`/`@returns`). |
| Every **global-scope** symbol without its own page | One aggregated **"Globals"** page. |
| `events`, `enums`, `constants` | Member **sections within their parent**, not standalone pages. |
| README / tutorials / `opts.docs` Markdown | Prose pages (see [`reference/content-and-sidebar.md`](reference/content-and-sidebar.md)). |
| Each documented **source file** | A Monaco source-viewer page + a "Source Files" index; each member gets a `Source: file:line` link (default on). |

A **class page** leads with the class description (`classdesc`), then a
**Constructor** section (on every class unless `@hideconstructor`): the call
signature (`new ClassName(id, [opts])` — a parameter-less class still shows
`new ClassName()`, and an undocumented constructor recovers its param names so
`new ClassName(options)` still appears), the separately-documented constructor
description (when the class and its `constructor` have *separate* doc comments),
and the parameter table.

---

## 4. Quick reference

```jsonc
// JSDoc: opts.* | TypeDoc: cleanJsdocTheme.*  (identical values)
{
  siteName, basePath,
  readme, docs, docGroups, defaultDocGroup, tutorials,
  sectionOrder, clubSidebarItems, menu,
  fonts, colors, darkColors,
  customCss, customJs, customCssFile, customJsFile, hashCustomAssets,
  copyPage, aiPrompt,
  locales, defaultLocale,        // multi-language — see reference/localization.md
  strict, progress
}
// JSDoc-only, under templates.default.*:  outputSourceFiles, sourceLinkToComment
```

Authoring (details in [`reference/authoring.md`](reference/authoring.md)):

- Callout: `> [!TIP]` / `[!NOTE]` / `[!WARNING]` / `[!ERROR]` (+ aliases).
- Steps: `<steps><step label="…">…blank-line-wrapped body…</step></steps>`.
- Tabs: `<tabs group="x"><tab label="…" value="…">…</tab></tabs>`.
- Embed: ` ```iframe ` fence or `@iframe <https-url> key=value`.
- Sidebar: `@category Core/Parsing order=1`, `@order N`, frontmatter `group`/`order`.
- Cross-link: `{@link Symbol}`, `{@linkcode Symbol}`, `@see {@link Other}`.

The two most common setup mistakes: missing `plugins/markdown` (JSDoc) and missing
`tags.allowUnknownTags: true` (needed for `@category`/`@order`/`@iframe`). More in
[`reference/troubleshooting.md`](reference/troubleshooting.md).

---

## 5. Migrating from v4

If the user is on **v4** (options nested under `opts.theme_opts.*`), that's a
separate, focused job — use the dedicated **`migrate-v4-to-v5`** skill
(`SKILLS/migrate-v4-to-v5/SKILL.md` in this repo). The headline: v5 reads options
directly from `opts.*` (no `theme_opts` block), and most options were renamed or
removed. The canonical map is the repo's `MIGRATION.md` + `migration-map.json`.

---

## 6. Staying current

The skill and the theme both evolve. Keep the user current — but **with
restraint**: check **at most once per session**, only when relevant (you're
starting work with this skill, or the user asks about upgrading), and **surface a
result only when there's something actionable**. Never poll on every turn, never
block the task, never nag. You have no background timer — "periodically" here means
*opportunistically, once per session*, not a loop.

**Is this skill out of date?** This file carries a `skill-revision: <date>` marker.
When relevant, fetch the published copy and compare:

```sh
curl -fsSL https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/SKILLS/clean-jsdoc-theme/SKILL.md | grep -m1 skill-revision
```

If the published revision is newer, tell the user and **offer to update their
copy** (the whole `clean-jsdoc-theme/` skill folder — it has `reference/` files,
not just `SKILL.md`). Don't overwrite without asking.

**Is the theme out of date?** When setting up or upgrading, compare installed vs
latest and mention it if behind:

```sh
npm ls clean-jsdoc-theme @clean-jsdoc-theme/typedoc 2>/dev/null   # installed
npm view clean-jsdoc-theme version                                # latest
```

If behind, note the upgrade (`npm i -D clean-jsdoc-theme@latest`) and point at
`BREAKING_CHANGES.md` / `MIGRATION.md` for major bumps. Mention once; let the user decide.

---

## 7. Proactively improve the docs

You know features the user may not — surface them. When helping author or review
docs, watch for places where a theme-specific construct reads better than plain
Markdown and **suggest it** (briefly, with the exact syntax from
[`reference/authoring.md`](reference/authoring.md); don't rewrite everything
unprompted). Lead with the highest-impact one, keep it to a sentence or two, and
let the user opt in.

- **A note/warning as plain text or bold** ("Note: …", "⚠️ …") → a **callout**
  (`> [!NOTE]` / `[!WARNING]` / `[!TIP]`).
- **A numbered install/setup walkthrough** → a **`<steps>`** stepper.
- **Per-tool / per-platform variants** (npm vs pnpm, JSDoc vs TypeDoc) as separate
  code blocks → **`<tabs>`** with a shared `group` to sync them.
- **A linked CodePen / StackBlitz / demo** → an **embed** (` ```iframe ` / `@iframe`).
- **An `@example` readers should run/edit** → a **playground** (`opts.playground` +
  `@playground codepen jsfiddle …`): an "Open Code in" dropdown (CodePen/JSFiddle/
  CodeSandbox); also `filename=` / `highlight=` on any code block.
- **A long, flat sidebar, or symbols in the wrong section** → **`@category` /
  `@order`** on the symbols and `group` / `order` frontmatter on guides, plus
  `sectionOrder` / `clubSidebarItems` to shape the top level.
- **Cross-references written as bare text or code** → **`{@link Symbol}`** so it
  becomes a real, resolved anchor.
- **Undocumented params/returns** → the `@param` / `@returns` tags so the generated
  tables (and the constructor signature) fill in.
- **A project that cares about AI consumption** → remind them every page already
  ships a companion `.md` + the `copyPage` actions, and that `aiPrompt` primes the
  open-in-LLM handoff.
- **A project targeting multiple languages/regions** (translated READMEs,
  non-English audience) → mention the **localization** workflow: declare
  `opts.locales`, then the `clean-jsdoc` CLI builds one site per locale with a
  language switcher, per-locale prose + fonts ([`reference/localization.md`](reference/localization.md)).
