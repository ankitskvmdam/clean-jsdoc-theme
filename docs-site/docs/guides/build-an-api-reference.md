---
title: Build an API reference
group: Guides
order: 1
---

# Build an API reference

This is the **pure-API** workflow: point the tool at your source code and let it
generate a reference site from your doc comments — one page per class, module,
namespace, and so on, plus an optional source-file viewer. It's what the
[API demo](/api-docs/) is built from, using
[`docs-site/jsdoc.api.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.api.json).

> [!TIP]
> Already have hand-written guides too? You don't have to choose — see
> [Combine guides + API](/guides/combine-guides-and-api) to ship both in one
> site.

## Set it up

The full toolchain setup lives in the getting-started guides; this page focuses
on what becomes a page and how the source viewer works. Pick your tool:

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

Point `source.include` at your code. See
[JSDoc Getting Started](/theme/jsdoc-getting-started) for the install + build steps.

```json5
{
  source: { include: ["./src", "./README.md"] },
  // Required: pre-renders Markdown in your doc comments to HTML.
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> The **`plugins/markdown`** plugin is required. Without it the build fails fast
> — the theme expects your doc-comment Markdown already rendered to HTML.

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

Point `entryPoints` at your code and load the theme plugin. See
[TypeDoc Getting Started](/theme/typedoc-getting-started) for the full setup.

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</tab>
</tabs>

## What becomes a page

> [!NOTE]
> The kind-section sidebar described below is the **JSDoc** flavor. TypeDoc
> builds each of these same pages too, but presents them in a module/folder
> hierarchy rather than kind sections — see
> [The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar).

setu enumerates your documented symbols and turns each into a page. The kinds
that get their **own** page are the **container kinds**, built in this order (see
`CONTAINER_KINDS` in
[`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)):

| Kind        | Sidebar section |
| ----------- | --------------- |
| `module`    | Modules         |
| `namespace` | Namespaces      |
| `class`     | Classes         |
| `interface` | Interfaces      |
| `mixin`     | Mixins          |
| `typedef`   | Typedefs        |

Each gets one page rendered through the same container path, with its members
bucketed into sections. **Typedefs are first-class** — they go through the
identical `buildContainerPage` path, so a typedef's `@type`, `@property` list,
and (for function-signature typedefs) `@param`/`@returns` all render on its page.

> [!NOTE]
> The order above is also the **slug-collision precedence**: when two symbols
> would claim the same slug, the earlier kind wins (so a `module` beats a later
> `class`). Verified in `CONTAINER_KINDS` ordering plus the dedup pass in
> [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts).

### The Globals page

Every **global-scope** symbol that does *not* already get its own page —
functions, members, constants, enums, events — is collected onto a single
synthetic **Globals** page (slug `global`). The excluded kinds are exactly the
container kinds above plus `typedef`, since those already render standalone. If
there are no qualifying globals, no Globals page is emitted. See
`buildGlobalsView` in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts).

A symbol kind with no section mapping falls into a catch-all **Other** section,
appended last — a safety net that's empty in practice.

## The source-file viewer

When source viewing is on, the theme renders each project source file as a
read-only, syntax-highlighted viewer page, builds a **Source Files** index, and
links each documented member to its declaration with a `Source: file:line` link.

This is gated by JSDoc's [`outputSourceFiles`](/theme/configuration#outputsourcefiles)
(default **on**). It's a JSDoc-only option living under `templates.default`:

```json5
// jsdoc.json — turn the source viewer OFF
templates: { default: { outputSourceFiles: false } }
```

How the links resolve (see
[`packages/setu/src/source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)):

- Each file becomes a hidden `kind: 'source'` page at `source/<slugified-path>`;
  the language is detected from the extension (Monaco ids — `js`/`mjs`/`jsx` →
  `javascript`, `ts`/`mts`/`tsx` → `typescript`, etc.).
- A member's `Source:` link points at the file page anchored to a line
  (`#L<n>`). By **default** it lands on the first line of the actual
  **declaration**, skipping past the leading doc-comment block. Set
  [`sourceLinkToComment`](/theme/configuration#sourcelinktocomment) (`true`) to land on
  the comment's opening line instead (the pre-v5 behavior).
- The "Source Files" index is always last in the sidebar. You can also surface
  it as a menu item with `{ id: "source" }` (see
  [`examples/basic/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json)).

> [!CAUTION]
> The `outputSourceFiles` and `sourceLinkToComment` options are **JSDoc-only** —
> they live under `templates.default`, not under `opts`/`cleanJsdocTheme`. TypeDoc
> projects don't have them.

## Ordering the API sidebar

By default the kind sections render in a fixed order (Classes, Modules,
Namespaces, Mixins, Interfaces, Typedefs, Globals, …). Override it with
[`sectionOrder`](/theme/configuration#sectionorder), and use `@category` / `@order`
tags on your symbols for finer control. That's its own topic —
[Structure your sidebar](/guides/structure-your-sidebar) covers every lever.

> [!NOTE]
> The levers above (`sectionOrder`, `@category`, `@order`) shape the **JSDoc**
> API sidebar. The TypeDoc API sidebar is a module/folder hierarchy and isn't
> ordered by these — see
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor).

## Where to go next

- Add hand-written guides alongside the reference:
  [Combine guides + API](/guides/combine-guides-and-api).
- Custom source tags (`@category`, `@order`): [Custom tags](/components/overview).
- Every option in detail: [Configuration](/theme/configuration).
- The package internals: [Packages](/#the-packages).
