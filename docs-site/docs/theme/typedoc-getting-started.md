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
| [`sectionOrder`](/theme/configuration#sectionorder) | Order the top-level sidebar sections. |
| [`clubSidebarItems`](/theme/configuration#clubsidebaritems) | Collapse related entries under a shared, collapsible parent. |
| [`menu`](/theme/configuration#menu) | Custom links pinned above the sidebar, each with a `lucide:` / `simpleicons:` icon. |
| [`copyPage`](/theme/configuration#copypage) | The per-page "copy page" / "open in LLM" button (on by default). |

> [!NOTE]
> Because `cleanJsdocTheme` is a dedicated namespace, unknown keys inside it only
> ever **warn** (with a "did you mean?" hint) — see
> [`strict`](/theme/configuration#strict) to escalate that to an error.

## Next steps

- **[Build an API reference](/guides/build-an-api-reference)** — what becomes a
  page and how the source-file viewer works.
- **[Build a guides site](/guides/build-a-guides-site)** and
  **[Combine guides + API](/guides/combine-guides-and-api)** — add hand-written
  Markdown to the same site.
- **[Structure your sidebar](/guides/structure-your-sidebar)** — grouping and
  ordering levers.
- **[Authoring](/authoring/callouts)** — callouts, steps, tabs, and embeds.
- **[Packages](/#the-packages)** — how the shared `setu → dwar` pipeline (and the
  [`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)
  plugin) work under the hood.
