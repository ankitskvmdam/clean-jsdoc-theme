---
title: JSDoc Getting Started
group: Using the Theme
order: 2
---

# JSDoc Getting Started

`clean-jsdoc-theme` is a **JSDoc template**. JSDoc does what it always does —
parse your source and collect your doc comments — and then hands off to the
template's `publish` function, which is where this theme takes over and builds
the static site. You point JSDoc at the theme, and you're done.

> [!NOTE]
> **How it plugs in.** JSDoc loads a template by calling its exported `publish`
> function — here that's
> [`publish(data, opts, tutorials)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
> (the package's `main`, `dist/publish.js`). It receives your doclet collection
> and feeds it through the `setu → dwar` pipeline. See
> [Packages](/packages) for what each stage does.

## Install and build

<steps>

<step label="Install">

Install JSDoc and the theme as dev dependencies:

<tabs>

<tab label="npm">

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D jsdoc clean-jsdoc-theme
```

</tab>

</tabs>

</step>

<step label="Configure">

Add a `jsdoc.json` to your project root. A small but real-world starting point:

```json5
{
  source: { include: ["./src", "./README.md"] },

  // Required — see the warning below.
  plugins: ["plugins/markdown"],

  opts: {
    // Point JSDoc at the theme. Equivalent to `jsdoc -t <path>` on the CLI.
    template: "node_modules/clean-jsdoc-theme/dist",
    destination: "dist",
    recurse: true,
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> The **`plugins/markdown`** plugin is required. JSDoc renders the Markdown in
> your doc comments to **HTML** before the theme ever sees it, and the theme
> consumes that HTML (see
> [`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)).
> Without it, descriptions arrive as raw, unformatted text.

</step>

<step label="Build">

Run JSDoc against the config:

```sh
npx jsdoc -c jsdoc.json
```

</step>

<step label="Serve">

The site is written to `dist/`. Open `dist/index.html`, or serve the folder
(Pagefind's full-text index needs HTTP to load):

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> A complete, runnable JSDoc setup lives in the repo at
> [`examples/basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/basic) —
> its [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json)
> and source comments are the reference for everything on this page.

## Where the options go

Theme options live under **`opts`** in `jsdoc.json`, alongside JSDoc's own
options. A few you'll reach for first — the full list, with the TypeDoc form
shown side by side, is on the [Configuration](/configuration) page.

| Option | What it does |
| ------ | ------------ |
| [`siteName`](/configuration#sitename) | Header title — plain text, or a `light`/`dark` logo set with `alt` fallback text. |
| [`fonts`](/configuration#fonts) | Override `heading` / `body` (Google Fonts, loaded for you) and `mono`. |
| [`colors`](/configuration#colors-and-darkcolors) / [`darkColors`](/configuration#colors-and-darkcolors) | Recolor the light / dark palettes — override just `bg`, `accent`, …, keep the rest. |
| [`sectionOrder`](/configuration#sectionorder) | Order the top-level sidebar sections. |
| [`clubSidebarItems`](/configuration#clubsidebaritems) | Collapse related entries under a shared, collapsible parent. |
| [`menu`](/configuration#menu) | Custom links pinned above the sidebar, each with a `lucide:` / `simpleicons:` icon. |
| [`tutorials`](/configuration#tutorials) / [`docs`](/configuration#docs) | Render hand-written Markdown guides beside the generated reference. |
| [`copyPage`](/configuration#copypage) | The per-page "copy page" / "open in LLM" button (on by default). |

> [!NOTE]
> A couple of options — [`outputSourceFiles`](/configuration#outputsourcefiles)
> and [`sourceLinkToComment`](/configuration#sourcelinktocomment) — are JSDoc-only
> and sit under `templates.default`, not `opts` (the theme reads them from
> `jsdoc/env`). They're flagged on the Configuration page.

## Next steps

- **[Build an API reference](/guides/build-an-api-reference)** — what becomes a
  page, the source-file viewer, and `Source: file:line` links.
- **[Build a guides site](/guides/build-a-guides-site)** and
  **[Combine guides + API](/guides/combine-guides-and-api)** — add hand-written
  Markdown to the same site.
- **[Structure your sidebar](/guides/structure-your-sidebar)** — `@category`,
  `@order`, and the sidebar options.
- **[Authoring](/authoring/callouts)** — callouts, steps, tabs, and embeds you
  can use in comments and prose.
- Prefer TypeScript? See **[TypeDoc Getting Started](/typedoc-getting-started)** —
  same output, different toolchain.
