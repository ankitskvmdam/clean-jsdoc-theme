---
title: Custom tags
group: Authoring
order: 5
---

# Custom tags

> [!NOTE]
> **Where this works — source comments.** These are JSDoc/TypeDoc doc-comment
> tags, written in your source. Prose pages have equivalents: `group` / `order`
> frontmatter mirror `@category` / `@order`, and the ` ```iframe ` fence mirrors
> `@iframe` (see [Embeds](/authoring/embeds)).

The theme reads a few doc-comment block tags that base JSDoc and TypeDoc don't
give you. They shape the sidebar and let source comments embed live demos:

- **`@category <path> [order=N]`** — put a symbol's page in an explicit sidebar
  group (and optionally order it).
- **`@order N`** — a standalone within-group sort key for any symbol.
- **`@iframe <url> key=value`** — embed a live demo from a source comment.

Category/order parsing lives in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
(`parseCategory` / `readOrder`); `@iframe` is handled in
[`doclet.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/doclet.ts).

> [!IMPORTANT]
> All three are **unknown tags** — base JSDoc doesn't define them. Your config
> must set `tags.allowUnknownTags: true` in `jsdoc.json` (this site's
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> does). Without it JSDoc strips these tags before the theme runs.

## `@category` — group a symbol

`@category` puts a symbol's generated page into an explicit sidebar group instead
of its default kind section (Classes, Modules, …):

```ts
/**
 * @category Core
 */
export class Parser {}
```

### Path tokens are space-joined; only `/` nests

This is the subtle part, and it's worth getting right. `parseCategory` splits the
tag text on whitespace, then:

- The **leading run** of plain tokens is the **group path**, **joined with a
  single space**. So `@category Getting Started` is one flat group literally named
  `Getting Started` — the space stays part of the name.
- Parsing switches to **options** at the first token containing `=`. Everything
  from there on is `key=value`.
- A literal **`/`** is what **nests** a group — `Core/Parsing` nests the page
  under **Core ▸ Parsing**. Spaces do not nest.

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

This places `Lexer` under **Core ▸ Parsing**, sorted first in that subgroup. The
first `@category` on a symbol wins.

### Inline `order=`

Today the only `@category` option is `order` — the within-group sort key. A
missing or non-numeric `order` is left undefined (the page sorts last,
alphabetically, like an untagged one).

## `@order` — order any symbol

The inline `order=` option only applies to a symbol that **has** a `@category`.
To position a symbol that lives in its **kind section** — a plain `@module`,
`@class`, `@namespace` with no category — use the standalone `@order` tag:

```ts
/**
 * @module config
 * @order 1
 */
```

A missing or non-numeric value is left undefined (sorts last). See `readOrder` in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts).

### Precedence: `@category … order=` wins over `@order`

When a symbol carries **both** a `@category … order=` option and a standalone
`@order`, the inline `@category` order **wins** — it's the more specific,
co-located declaration. The resolved order is computed as
`category?.order ?? readOrder(doclet)` in `renderContainerPage`. Both feed the
same `frontmatter.order` the sidebar reads.

```ts
/**
 * `order=1` (from @category) wins; the @order 9 below is ignored here.
 * @category Core order=1
 * @order 9
 */
export class Parser {}
```

## `@iframe` — embed a live demo from source

`@iframe` embeds a sandboxed iframe directly from a doc comment, using the same
grammar as the prose ` ```iframe ` fence:

```js
/**
 * @iframe https://example.com/embed/demo title="Live demo" height=420
 */
export function render() {}
```

Each valid `@iframe` renders an `<Embed>` after the symbol's `@example` section;
invalid configs (non-`https`, no URL) are dropped. The full config grammar —
accepted URL schemes, every option, and the `themed` / `{theme}` behavior — is
documented on [Embeds & live demos](/authoring/embeds).

## How `@category` and `@order` shape the sidebar

These tags are two of the levers that feed the theme's single sidebar ordering
engine — every entry carries a `group` path and an optional `order`.
[Structure your sidebar](/guides/structure-your-sidebar) covers the full model:
nested `/`-paths, leaf-vs-branch ordering, `clubSidebarItems`, `sectionOrder`,
`docGroups`, and `menu`. This page is just the tag syntax; that page is how the
pieces combine.

## See also

- [Structure your sidebar](/guides/structure-your-sidebar) — the full sidebar
  ordering model.
- [Embeds & live demos](/authoring/embeds) — the `@iframe` config grammar in
  full.
- [Configuration](/theme/configuration) — `sectionOrder`, `docGroups`, and friends.
- [Build a guides site](/guides/build-a-guides-site) — guide-page frontmatter
  (`group` / `order`), the prose counterpart to these tags.
