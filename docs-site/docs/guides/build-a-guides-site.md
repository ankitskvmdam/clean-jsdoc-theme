---
title: Build a guides site
group: Guides
order: 2
---

# Build a guides site

This is the **prose-first** workflow: you point the theme at a folder of
hand-written Markdown (or HTML), and it becomes a full documentation site —
sidebar, search, theme toggle, the works. No API reference required. It's
exactly how the site you're reading is built.

> [!TIP]
> This very site is the worked example. Its config is
> [`docs-site/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> and its pages live in
> [`docs-site/docs/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site/docs).
> Everything below is verified against the bridge in
> [`packages/setu/src/guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts).

## The mental model

Point [`opts.docs`](/configuration#docs) at a directory. The theme walks it
recursively, and **each `.md` / `.markdown` / `.html` file becomes one page**.
The file's location in the folder drives two things automatically:

- its **URL slug** — the relative path, slugified;
- its **sidebar group** — the directory it sits in, humanized.

Per-file YAML **frontmatter** overrides either of those (and a few more). A root
`index.md` becomes the home page. That's the whole system.

The directory walk happens in the bridge
([`collectDocs`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)),
which reads the files and hands them to setu; setu itself does no disk I/O. Only
`.md`, `.markdown`, `.html`, and `.htm` files are picked up — `node_modules`,
`.git`, and dotfiles/dot-dirs are skipped.

## Set it up

<steps>

<step label="Create a docs folder">

Drop some Markdown into a directory. The layout is up to you:

```sh
docs/
  index.md            # → home page (slug "")
  getting-started.md  # → /getting-started, ungrouped
  guides/
    advanced.md       # → /guides/advanced, group "Guides"
```

</step>

<step label="Point the config at it">

Add [`docs`](/configuration#docs) to your config. Tutorials and the API are
optional — a docs folder alone is a complete site.

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    template: "node_modules/clean-jsdoc-theme/dist",
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
</tabs>

</step>

<step label="Build">

Build as usual — see [JSDoc Getting Started](/jsdoc-getting-started) or
[TypeDoc Getting Started](/typedoc-getting-started) for the full toolchain
setup.

```sh
npx jsdoc -c jsdoc.json
```

</step>

</steps>

## How a file becomes a page

For each file, setu derives the page metadata in
[`deriveDocMeta`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts).
The rules, exactly as the code resolves them:

| Field   | Derivation (first match wins)                                              |
| ------- | -------------------------------------------------------------------------- |
| `slug`  | frontmatter `slug` → slugified relative path (no prefix); `index` → `""`   |
| `title` | frontmatter `title` → humanized basename of the path                       |
| `group` | frontmatter `group` → humanized **directory** path → `defaultDocGroup`     |
| `order` | frontmatter `order`                                                        |
| `hidden`| frontmatter `hidden` (default `false`)                                     |

### Slugs come from the path

The slug is the relative path with the extension stripped, run through
`slugifyPath` per segment: lowercased, runs of non-alphanumerics collapsed to
`-`, joined with `/`. So `guides/Advanced Setup.md` → `/guides/advanced-setup`.
The slug carries **no prefix** — docs live at clean, top-level URLs (unlike
tutorials, which are forced under `tutorials/`).

### Groups come from the directory

A file's sidebar group defaults to its **directory path**, humanized per
segment: `guides/advanced.md` lands in group **Guides**;
`guides/setup/install.md` lands in the nested group **Guides/Setup** (a `/` in a
group path nests it — see [Structure your sidebar](/guides/structure-your-sidebar)).
A file at the docs root with no frontmatter group falls back to
[`defaultDocGroup`](/configuration#defaultdocgroup); if that's unset too, the
page is ungrouped (it lands in the catch-all "Docs" section).

### `index.md` → home page

A file whose path is exactly `index` (the docs-root `index.md`) becomes the
home page: slug `""`, rendered at `index.html`. It **overrides** the
[`readme`](/configuration#readme) home page when both exist.

## Frontmatter overrides

Frontmatter is a leading `---` block. The parser is deliberately small — simple
`key: value` scalars (string / number / boolean), which is all the pipeline
needs. The recognized keys:

```markdown
---
title: Advanced Setup
group: Guides
order: 2
slug: guides/advanced
hidden: false
---

# Advanced Setup
...
```

- **`title`** — the sidebar label and page `<title>`.
- **`group`** — the sidebar group (overrides the directory). May be a `/`-path
  to nest.
- **`order`** — the within-group sort key (ascending; unset sorts last, then
  alphabetical). See [Structure your sidebar](/guides/structure-your-sidebar).
- **`slug`** — a custom URL, replacing the path-derived one.
- **`hidden`** — when `true`, the page is **rendered but kept out of the
  sidebar** (still reachable by direct link / cross-reference).

> [!NOTE]
> The frontmatter parser is intentionally minimal: nested YAML, lists, and
> multi-line values are **not** supported — only flat `key: value` scalars. A
> malformed or unterminated block is treated as no frontmatter and left in the
> body. See `parseFrontmatter` in
> [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts).

## Ordering the groups

Two levers, working at different scopes:

- [`docGroups`](/configuration#docgroups) orders the **top-level group sections**
  in the sidebar (e.g. `["Getting Started", "Guides"]`). Groups you don't list
  are appended after, alphabetically.
- A page's frontmatter **`order`** positions it **within** its group.

This site sets both — see its
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json):
`docGroups` (and `sectionOrder`) pin the group order, while each page's `order`
frontmatter sequences the pages inside.

> [!IMPORTANT]
> `docGroups` only orders **doc** groups, and it appends them **after** the API
> kind sections. If you're mixing guides with an API reference and want full
> control over the entire sidebar — guides interleaved with Classes, Modules,
> etc. — reach for [`sectionOrder`](/configuration#sectionorder) instead. See
> [Combine guides + API](/guides/combine-guides-and-api).

## Where to go next

- Add a generated reference: [Build an API reference](/guides/build-an-api-reference).
- Ship both in one site: [Combine guides + API](/guides/combine-guides-and-api).
- Master every sidebar lever: [Structure your sidebar](/guides/structure-your-sidebar).
- Every option in detail: [Configuration](/configuration).
