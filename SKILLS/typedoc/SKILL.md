---
name: typedoc
description: >-
  Expert guidance for the @clean-jsdoc-theme/typedoc plugin — using
  clean-jsdoc-theme v5 with TypeDoc / TypeScript. Use when setting up the
  TypeDoc plugin, writing typedoc.json / the cleanJsdocTheme option block,
  understanding the TypeDoc sidebar (module hierarchy) and document model
  (standalone enum/function/variable pages, overloads, declaration blocks),
  TypeDoc-specific rendering (inheritance sections, @group, @inheritDoc,
  projectDocuments, object-literal expansion), or knowing which theme options
  are (and aren't) wired for TypeDoc. For shared topics — authoring
  callouts/steps/tabs/embeds, images, the full option reference — this skill
  defers to the umbrella `clean-jsdoc-theme` skill.
---

# @clean-jsdoc-theme/typedoc — working skill

<!-- skill-revision: 2026-07-02 -->

This skill makes you an expert at using **`clean-jsdoc-theme` v5 with TypeDoc**,
via the `@clean-jsdoc-theme/typedoc` plugin. Everything here is verified against
the plugin source (`packages/typedoc/`). It is **focused**: it owns the
TypeDoc-only material and **defers to the umbrella skill** for everything JSDoc
and TypeDoc share.

> **Read the umbrella skill for shared topics.** Authoring (callouts, steps,
> tabs, embeds, custom tags), images / static assets, the full option table, and
> theming behave the **same** on both toolchains. Don't duplicate that knowledge
> here — read it from the sibling **`clean-jsdoc-theme`** skill:
>
> | Shared topic | File |
> | --- | --- |
> | The full option reference (all options, both namespaces) | [`../clean-jsdoc-theme/reference/configuration.md`](../clean-jsdoc-theme/reference/configuration.md) |
> | Authoring: callouts, steps, tabs, embeds, `@iframe`, playground | [`../clean-jsdoc-theme/reference/authoring.md`](../clean-jsdoc-theme/reference/authoring.md) |
> | Images / local assets / sitemap | [`../clean-jsdoc-theme/reference/images.md`](../clean-jsdoc-theme/reference/images.md) |
> | Docs directory, frontmatter, cross-links | [`../clean-jsdoc-theme/reference/content-and-sidebar.md`](../clean-jsdoc-theme/reference/content-and-sidebar.md) |
> | The package architecture | [`../clean-jsdoc-theme/reference/architecture.md`](../clean-jsdoc-theme/reference/architecture.md) |

The **TypeDoc-only deep dive** — the sidebar model, the document model, and the
rendering TypeDoc adds — lives in the sibling reference:

| Read this when… | File |
| --- | --- |
| Explaining the TypeDoc sidebar, page model, or TypeDoc-specific rendering | [`reference/document-model.md`](reference/document-model.md) |

> Project: <https://github.com/ankitskvmdam/clean-jsdoc-theme> ·
> npm: `@clean-jsdoc-theme/typedoc` · verified against **TypeDoc 0.28.x**.

---

## 1. What it actually is

The TypeDoc integration is **not** a CSS theme extending TypeDoc's
`DefaultTheme`. It is a **plugin that registers a custom output**. It feeds
TypeDoc's reflection tree through the *same* `setu → dwar` pipeline as the JSDoc
bridge, so a TypeScript project gets an **identical site** — SSR HTML,
lazy-hydrated Preact islands, fuzzy + Pagefind search, and a companion `.md` per
page for LLMs.

```
TypeDoc reflections ──▶ reflection-to-doclets ──▶ setu.generateSite('typedoc')
                                                    ──▶ dwar.render() ──▶ static site
```

You select it **two ways**, and you need **both**:

- **`plugin`** loads the plugin (its `load(app)` declares the option block and
  calls `app.outputs.addOutput('clean-jsdoc-theme', …)`).
- **`outputs`** turns it on (the entry whose `name` is `"clean-jsdoc-theme"`
  runs the writer, rendering to that entry's `path`).

Loading the plugin alone renders nothing — a common first mistake (see §5).

The plugin is **ESM**, and `typedoc` is a **peer dependency** — you bring your
own TypeDoc.

---

## 2. Setup

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

```json5
// typedoc.json
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",                                     // ← TypeDoc's OWN option (see below)

  plugin: ["@clean-jsdoc-theme/typedoc"],                  // loads it
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],  // turns it on

  cleanJsdocTheme: {                                       // ← theme options live here
    siteName: "My Library",
  },
}
```

Build, then serve over HTTP (Pagefind's full-text index needs HTTP to load):

```sh
npx typedoc
npx serve dist
```

Runnable reference: **`examples/typedoc-basic`** in the repo — its `typedoc.json`
is the canonical setup.

> **`readme` is TypeDoc's own top-level option, not a theme option.** The home
> page comes from TypeDoc's `readme` (rendered from `project.readme`), or a root
> `docs/index.md` in the theme's `docs` directory overrides it. Both `readme`
> and `cleanJsdocTheme` sit at the top level of `typedoc.json`.

---

## 3. Options: same names, one namespace, a few gaps

Theme options use the **same names and values** as JSDoc's `opts` — just nested
under **`cleanJsdocTheme`** instead of `opts`. The full table (both namespaces
side by side) is in the umbrella skill's
[`configuration.md`](../clean-jsdoc-theme/reference/configuration.md).

Because `cleanJsdocTheme` is a **dedicated namespace**, unknown keys inside it
always **warn** (with a "did you mean?" hint) and the build continues; set
`strict: true` to escalate to a hard error.

### What the TypeDoc writer actually wires (verified)

The blanket "every option works the same" is *almost* true — but a few options
are validated yet **not yet applied** by the TypeDoc writer. Be precise here;
this is the skill's whole value.

**Fully wired for TypeDoc:**

- Identity/fonts: `siteName` (text or logo set), `fonts` (incl. per-locale keys), `favicon`
- Content: `docs`, `docGroups`, `defaultDocGroup` (+ native `projectDocuments`, see the deep dive)
- Sidebar: `menu`, `sectionOrder`, `clubSidebarItems` (accepted/validated — but the module hierarchy owns the API sidebar; see the deep dive for what these actually affect), `collapsibleSidebarSections` (this one **does** apply — collapsible top-level section headers; both flavors)
- LLM/pager: `copyPage`, `pageNav`, `aiPrompt`, `playground`
- Chrome/meta: `footer` (string or `{ file }`), `meta`
- Deploy: `basePath` (sub-directory hosting — every asset href is prefixed), `siteUrl` (emits `sitemap.xml`)
- Build: `strict`

**NOT wired through the TypeDoc writer today** (they validate but have no effect —
don't promise them):

- **`colors` / `darkColors`** — the palette is the built-in OKLCH default. Only
  `fonts` and `siteName` affect appearance; custom colors are a known gap.
- **`customCss` / `customJs` / `customCssFile` / `customJsFile` / `hashCustomAssets`** — not threaded.
- **`locales` / `defaultLocale`** — the localized *build* is JSDoc-only (see §4).
- **`tutorials`** — a JSDoc `--tutorials` concept; use `docs` or `projectDocuments` for prose.

> **`templates.default.*` does not exist for TypeDoc.** The JSDoc-only options
> `outputSourceFiles`, `sourceLinkToComment`, and `staticFiles` live under
> JSDoc's `templates.default` — there is no equivalent in `typedoc.json`.
> **Source-file viewer pages and `Source: file:line` links still work** for
> TypeDoc (they're generated unconditionally from reflection source metadata) —
> they're just not toggleable, and always land on the declaration.

---

## 4. The TypeDoc sidebar & document model

This is the biggest way a TypeDoc site differs from a JSDoc one, and it's
**automatic** (no config). Read the deep dive for the full breakdown:
[`reference/document-model.md`](reference/document-model.md). The headlines:

- **Sidebar = a module/folder hierarchy**, mirroring TypeDoc's own default theme
  — *not* the JSDoc template's top-level kind buckets (Classes / Interfaces / …).
  Modules are clickable + expandable; members nest under them ordered by kind.
- **Standalone pages** for enums, top-level functions, and variables (not member
  sections); type aliases are labelled **"Type Aliases"**; class sections use
  TypeDoc labels (**Constructors / Properties / Accessors / Methods**);
  module/namespace pages are a kind-grouped **index of links**.
- **Overloaded** functions/methods stack one signature per call signature;
  standalone pages lead with a full **declaration block**; generics get a **Type
  Parameters** section.
- **`@category` / `@order` / `sectionOrder` / `clubSidebarItems` do NOT reshape
  the TypeDoc API sidebar** — the module hierarchy owns it (matching TypeDoc's
  defaults). What still works: prose **doc groups** (`docGroups` + a doc page's
  frontmatter `group`/`order`) render before the API hierarchy, and the **`menu`**
  top region.
- **TypeDoc-specific rendering**: inheritance sections (Hierarchy / Implements /
  Implemented By + per-member "Inherited from / Overrides / Implementation of"),
  `@group`, `@inheritDoc`, an **async** modifier badge, and **object-literal type
  expansion** into property tables.

---

## 5. Localization

Declare `locales` + `defaultLocale` in the same `cleanJsdocTheme` block; the
workflow runs through the `clean-jsdoc` CLI (umbrella skill's
[`localization.md`](../clean-jsdoc-theme/reference/localization.md)).

> **TypeDoc caveat:** the TypeDoc bridge supports string **extraction**
> (`clean-jsdoc i18n extract` harvests the same slots) but **not the localized
> build** yet — per-locale rendering is **JSDoc-only** today. A single-language
> TypeDoc site is fully supported.

---

## 6. Troubleshooting (TypeDoc-specific)

| Symptom | Cause / fix |
| --- | --- |
| Build runs but **nothing is written** / default HTML appears | You loaded the plugin but didn't select it. Add `outputs: [{ name: "clean-jsdoc-theme", path: "dist" }]`. **Both** `plugin` and `outputs` are required. |
| A **re-exported** symbol / `export … from` is missing a page | `Reference`/re-export reflections are deferred in v1 and logged, not rendered. Document the original symbol. |
| Custom **`colors`/`darkColors` have no effect** | Not wired for TypeDoc yet (§3). The palette is the OKLCH default; only `fonts`/`siteName` change appearance. |
| A `@category`/`@order` doesn't reorder the sidebar | Expected — the module hierarchy owns the TypeDoc API sidebar (§4). Use `docGroups`/`menu` for the levers that do apply. |
| Types render as plain strings, not linked | Type rendering is v1 (`type.toString()`); documented references still link, but complex type structure is not fully modeled yet. |
| An option "isn't working" | Confirm it's in the **wired** list (§3), and that it's inside `cleanJsdocTheme`, not at the top level (only `readme`/`plugin`/`outputs`/TypeDoc's own options go there). |

For anything not TypeDoc-specific (a page won't compile, an image won't resolve,
an authoring construct misbehaves), see the umbrella skill's
[`troubleshooting.md`](../clean-jsdoc-theme/reference/troubleshooting.md).

---

## 7. Staying current

This file carries a `skill-revision: <date>` marker and is versioned with the
theme. When relevant (starting work, or the user asks about upgrading), check —
**at most once per session**, and only surface something actionable:

```sh
# is this skill out of date?
curl -fsSL https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/SKILLS/typedoc/SKILL.md | grep -m1 skill-revision
# installed vs latest plugin
npm ls @clean-jsdoc-theme/typedoc 2>/dev/null
npm view @clean-jsdoc-theme/typedoc version
```

If the published skill revision is newer, offer to update the whole `typedoc/`
skill folder (it has a `reference/` file, not just `SKILL.md`). Don't overwrite
without asking. As the plugin matures, some §3 gaps (colors, custom CSS/JS,
localized build) are expected to close — re-verify against the installed version
rather than trusting this list blindly.
