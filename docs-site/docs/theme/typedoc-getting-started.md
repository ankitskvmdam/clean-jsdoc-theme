---
title: TypeDoc Getting Started
group: Using the Theme
order: 3
---

# TypeDoc Getting Started

For TypeScript projects, the theme ships as a **TypeDoc plugin** —
`@clean-jsdoc-theme/typedoc`. It isn't a CSS theme extending TypeDoc's default;
it registers a custom **output** that feeds TypeDoc's reflections through the
*same* `setu → dwar` pipeline as the JSDoc bridge. The result is an identical
site — SSR HTML, islands, fuzzy + full-text search, companion `.md` — generated
from your TypeScript sources.

> [!NOTE]
> **How it plugs in.** The plugin's
> [`load(app)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/index.ts)
> declares one option block (`cleanJsdocTheme`, see
> [`options.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/options.ts))
> and registers an output named `clean-jsdoc-theme` via
> `app.outputs.addOutput(...)`. The writer
> ([`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts))
> adapts reflections → doclets → the shared pipeline. So you select it two ways:
> `plugin` loads it, `outputs` turns it on.

## Install and build

<steps>

<step label="Install">

Install TypeDoc and the theme's TypeDoc plugin as dev dependencies:

<tabs>

<tab label="npm">

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D typedoc @clean-jsdoc-theme/typedoc
```

</tab>

</tabs>

</step>

<step label="Configure">

Add a `typedoc.json`. Load the plugin, select it as an **output**, and put theme
options under the **`cleanJsdocTheme`** key (TypeDoc's counterpart to JSDoc's
`opts`):

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",

  // Load the plugin, then select its output to render.
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],

  // Theme options live here.
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</step>

<step label="Build">

Run TypeDoc — it renders the registered output to `outputs[].path`:

```sh
npx typedoc
```

</step>

<step label="Serve">

Open `dist/index.html`, or serve the folder (Pagefind's full-text index needs
HTTP to load):

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> A complete, runnable TypeDoc setup lives in the repo at
> [`examples/typedoc-basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/typedoc-basic) —
> its [`typedoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/typedoc-basic/typedoc.json)
> is the reference for the setup above.

## Where the options go

Every theme option is the same as for JSDoc — only the location differs: under
**`cleanJsdocTheme`** instead of `opts`. The full list, with both forms side by
side, is on the [Configuration](/theme/configuration) page. A few to start with:

| Option | What it does |
| ------ | ------------ |
| [`siteName`](/theme/configuration#sitename) | Header title — plain text, or a `light`/`dark` logo set with `alt` fallback text. |
| [`fonts`](/theme/configuration#fonts) | Override `heading` / `body` (Google Fonts, loaded for you) and `mono`. |
| [`colors`](/theme/configuration#colors-and-darkcolors) / [`darkColors`](/theme/configuration#colors-and-darkcolors) | Recolor the light / dark palettes — override just `bg`, `accent`, …, keep the rest. |
| [`menu`](/theme/configuration#menu) | Custom links pinned above the sidebar, each with a `lucide:` / `simpleicons:` icon. |
| [`docGroups`](/theme/configuration#docgroups) | Order the prose **doc groups** in the sidebar (the API section is the module hierarchy). |
| [`copyPage`](/theme/configuration#copypage) | The per-page "copy page" / "open in LLM" button (on by default). |

> [!NOTE]
> Because `cleanJsdocTheme` is a dedicated namespace, unknown keys inside it only
> ever **warn** (with a "did you mean?" hint) — see
> [`strict`](/theme/configuration#strict) to escalate that to an error.

## The TypeDoc sidebar

The TypeDoc output's sidebar does **not** use the JSDoc template's kind-bucket
layout (top-level "Classes", "Interfaces", "Enumerations", … sections). Instead
it mirrors **TypeDoc's own default theme** — a module/folder hierarchy:

- **Top level = your documents first, then folders and modules**, alphabetically.
  There are no top-level kind sections.
- **Folders** come from your source's directory structure. A folder with a
  single child is **merged** into that child (`compactFolders`) — e.g. a lone
  `Component` under `base/` shows as `base/Component` instead of two nested
  levels.
- **Each module is a clickable, expandable node**: clicking its label opens the
  module's own page; the chevron expands it to reveal its members.
- **Members nest under their module**, ordered by **kind** — Enumerations →
  Classes → Interfaces → Type Aliases → Variables → Functions — then
  alphabetically by name. There are no per-kind sub-headings in the sidebar
  itself (kind grouping still shows up on the module's own page body).
- **Namespaces** nested inside a module appear as nested nodes the same way.

> [!IMPORTANT]
> This is a different sidebar model from the JSDoc template's. The ordering
> levers documented in [Structure your sidebar](/guides/structure-your-sidebar) —
> `@category`, `@order`, `sectionOrder`, `clubSidebarItems` — **do not shape the
> TypeDoc API sidebar**. The module hierarchy above owns it, matching TypeDoc's
> own defaults (where category/group-driven navigation is opt-in). Restoring a
> category/group-driven TypeDoc nav is **not currently configurable**.
>
> What still works for TypeDoc: prose **doc groups** (`docGroups` + a doc page's
> frontmatter `group` / `order`) still render — before the API hierarchy — and
> order via `docGroups`; the **`menu`** top region still works; tutorials still
> render. See [Structure your sidebar](/guides/structure-your-sidebar#typedoc-flavor)
> for the full breakdown.

## TypeDoc-specific rendering

Beyond the sidebar, the TypeDoc output renders a few things the JSDoc template
doesn't, because they come from TypeDoc's own analysis:

- **Inheritance & relationships.** Class and interface pages get a
  **Hierarchy** list (the ancestor chain), an **Implements** section, and an
  **Implemented By** section. Individual members get captions —
  **Inherited from …**, **Overrides …**, **Implementation of …** — pointing at
  the related symbol.
- **`@group`.** Recognized as a sibling to `@category`. It's parsed, but — like
  `@category` — it does **not** drive the default TypeDoc sidebar (see above).
- **Native TypeDoc `projectDocuments`.** Markdown files attached via TypeDoc's
  own [`projectDocuments`](https://typedoc.org/options/input/#projectdocuments)
  option render as pages. This is **distinct** from the theme's own
  [`docs`](/theme/configuration#docs) option:
  - [`docs`](/theme/configuration#docs) is the theme's prose-docs directory — it
    works the same way for both JSDoc and TypeDoc.
  - `projectDocuments` is a TypeDoc-native input, only available to the TypeDoc
    output.

  Both end up as ordinary pages in the site, so pick based on which tool you
  want owning the file list: use `docs` for a shared, tool-agnostic guides
  folder; use `projectDocuments` if you're already organizing docs the
  TypeDoc-native way.
- **`@inheritDoc`.** A member documented with `{@inheritDoc Target}` (or a bare
  `@inheritDoc` on an overriding/implementing member) shows the target's
  description and parameter/return docs in its place. TypeDoc resolves the
  reference; the theme renders the resulting content — matching default
  TypeDoc semantics.
- **Async modifier badge.** Methods that are `async` (or return a `Promise`)
  show an **async** modifier badge next to their signature.
- **Object-literal type expansion.** An inline object-literal type — on a
  parameter, a return type, or a type alias/variable — expands into a
  **property table**: one row per member, with name, type, optional flag, and
  description. Type references inside the table stay **linked** to their
  documented pages.

## Multiple languages

The localization workflow declares its locales in the same `cleanJsdocTheme`
block (`locales` + `defaultLocale`) and runs through the `clean-jsdoc` CLI — see
**[Localize your docs](/guides/localize-your-docs)** and the
[`locales` / `defaultLocale`](/theme/configuration#localization) reference.

> [!INFO]
> Today the TypeDoc bridge can **extract** translation catalogs but does not yet
> render the per-locale sites — localized *builds* are JSDoc-only for now. A
> single-language TypeDoc site is fully supported.

## Next steps

- **[Build an API reference](/guides/build-an-api-reference)** — what becomes a
  page and how the source-file viewer works.
- **[Build a guides site](/guides/build-a-guides-site)** and
  **[Combine guides + API](/guides/combine-guides-and-api)** — add hand-written
  Markdown to the same site.
- **[Structure your sidebar](/guides/structure-your-sidebar)** — grouping and
  ordering levers (see its **TypeDoc flavor** section for how this differs from
  JSDoc).
- **[Authoring](/components/callouts)** — callouts, steps, tabs, and embeds.
- **[Localize your docs](/guides/localize-your-docs)** — the multi-language
  workflow (extract works on TypeDoc; localized builds are JSDoc-only today).
- **[Packages](/#the-packages)** — how the shared `setu → dwar` pipeline (and the
  [`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)
  plugin) work under the hood.
