---
title: Tabs
group: Authoring
order: 3
---

# Tabs

> [!NOTE]
> **Where this works — prose & source comments.** Write `<tabs>` markup in any
> prose (README, tutorials, the docs directory) **or** directly in a JSDoc /
> TypeDoc comment **description** — both flow through the same converter. There's
> no dedicated block tag; you write the same markup in either place.

`<tabs>` renders a tabbed view — a row of clickable tab buttons over a set of
panels, showing one panel at a time. You write lowercase `<tabs>` / `<tab>` tags
in your prose (or in a doc-comment description); the theme rewrites them into the
capitalized `<Tabs>` / `<Tab>` components rang renders.

The rewrite happens at the raw-string level in
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
(`splitContainers` / `parseItems`), before the HTML round-trip that would strip
these custom tags. The component is in
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx).

> [!TIP]
> Want to see tabs live? The whole [Configuration](/configuration) page is built
> out of them — every option's snippet is a synced JSDoc/TypeDoc tab group. The
> [JSDoc](/jsdoc-getting-started) and [TypeDoc](/typedoc-getting-started)
> getting-started pages use them too. View any of their page sources on GitHub
> for a real, copyable example.

## Syntax

A `<tabs>` container wraps one or more `<tab>` items, each with a `label`:

````markdown
<tabs>

<tab label="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

> [!IMPORTANT]
> Leave a **blank line around each tab's inner content** (fenced code, lists,
> paragraphs). Every item's body is re-parsed as Markdown, so those blank lines
> are what let the content render correctly.

## Attributes

| Tag      | Attribute | Effect |
| -------- | --------- | ------ |
| `<tab>`  | `label`   | The tab button text. Falls back to `Tab N` when omitted. |
| `<tab>`  | `value`   | The cross-block **sync key** (see below). Defaults to the normalized label (lower-cased, trimmed). |
| `<tabs>` | `group`   | Opts the whole block into cross-block syncing under a shared group name. |

`readAttr` accepts single or double quotes. A `<tab>` outside a `<tabs>` renders
nothing — `Tab` is a logical marker `Tabs` reads directly.

The tab bar is fully SSR-rendered (the first tab visible, the rest `hidden`),
with a real ARIA tablist + panels. A small `tabs` island only **enhances** that
markup — it toggles `aria-selected` / `tabIndex` / `hidden` on click and keyboard
nav. It does not re-render the panels through Preact, so panel content can be
arbitrary rendered MDX.

## Syncing tab groups across the page — `group`

Give multiple `<tabs>` blocks the same `group` and they sync: switching one
switches every other grouped block on the page (matched by each tab's `value`),
and the choice persists to the next visit.

`value` is the key tabs are matched on within a group. When you omit it, it
defaults to the normalized label (lower-cased and trimmed, per `tabValue` in
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx)),
so **identical labels sync for free**. Set an explicit `value` when labels differ
in casing or wording but should still sync.

````markdown
<tabs group="pm">

<tab label="npm" value="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm" value="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

Give another `<tabs>` block on the same page the same `group`, and the two stay
in lockstep — pick a tab in one and every other grouped block follows. This is
exactly the mechanism [Configuration](/configuration) uses to keep its
JSDoc-vs-TypeDoc snippets in sync: every option's tabs share `group="tool"`, so
choosing "TypeDoc" once switches the whole page.

## In a doc comment

`<tabs>` works in a JSDoc / TypeDoc **description** too. The install tabs on the
live demo's module page are authored right in its `@module` comment:

`````js
/**
 * Install it with your package manager of choice:
 *
 * <tabs>
 *
 * <tab label="npm">
 *
 * ```sh
 * npm install --save-dev jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * <tab label="pnpm">
 *
 * ```sh
 * pnpm add -D jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * </tabs>
 *
 * @module sample-api
 */
`````

> [!TIP]
> See these tabs rendered on the
> **[sample-api module page](https://ankdev.me/clean-jsdoc-theme/api-docs/module/sample-api)**
> of the live demo — source in
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js).

## See also

- [Steps](/authoring/steps) — the sibling stepper container (you can nest tabs
  inside a step).
- [Callouts](/authoring/callouts) for `[!NOTE]`-style notices.
- [Structure your sidebar](/guides/structure-your-sidebar) for how guide pages
  are grouped.
