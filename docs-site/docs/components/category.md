---
title: "@category"
group: Components
order: 8
---

# `@category` — group a symbol in the sidebar

`@category` puts a symbol's generated page into an explicit sidebar group instead
of its default **kind section** (Classes, Modules, Namespaces, …):

```ts
/**
 * @category Core
 */
export class Parser {}
```

`Parser` now lives under a **Core** group rather than under **Classes**.

> [!IMPORTANT]
> `@category` is an unknown tag — set `tags.allowUnknownTags: true` in your
> `jsdoc.json` or JSDoc strips it before the theme runs. See the
> [overview](/components/overview). (TypeDoc needs no flag.)

> [!NOTE]
> This grouping behavior is for the **JSDoc** sidebar. Under the **TypeDoc**
> flavor, `@category` is still parsed but does **not** affect the API sidebar —
> that sidebar is a module/folder hierarchy instead. See
> [The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar).

## `@group` — TypeDoc's equivalent tag

`@group` is recognized as a sibling to `@category` (TypeDoc's own grouping tag).
The same caveat applies: it's parsed, but it does not shape the TypeDoc API
sidebar either — see
[The TypeDoc sidebar](/theme/typedoc-getting-started#the-typedoc-sidebar). There
is no opt-in today to make `@category` / `@group` drive the TypeDoc sidebar.

## The path grammar

`parseCategory` (in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))
splits the tag text on whitespace, then:

- The **leading run** of plain tokens is the **group path**, **joined with a
  single space**.
- Parsing switches to **options** at the first token containing `=`. Everything
  from there on is `key=value`.
- A literal **`/`** is what **nests** a group. Spaces do **not** nest.

### Spaces stay in the name; `/` nests

This is the subtle part. A space is just part of the group name — only `/`
creates a parent ▸ child relationship.

```ts
/** @category Getting Started */
export class Intro {}
```

→ one flat group literally named **Getting Started** (the space is kept).

```ts
/** @category Core/Parsing */
export class Lexer {}
```

→ nests the page under **Core ▸ Parsing**.

You can nest as deep as you like — `@category Core/Parsing/Internals` →
**Core ▸ Parsing ▸ Internals**.

### First `@category` wins

If a symbol carries more than one `@category`, the **first** one is used; the
rest are ignored.

## Inline `order=`

The only `@category` option today is `order` — the within-group **sort key**:

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}

/** @category Core/Parsing order=2 */
export class Token {}
```

`Lexer` sorts before `Token` inside **Core ▸ Parsing**. The path is the leading
tokens; options follow the first `=`, so `Getting Started order=1` is the group
**Getting Started** with `order=1`.

> [!NOTE]
> A **missing or non-numeric** `order` is left undefined — the page then sorts
> **last**, alphabetically, like an untagged one.

## Worked examples

```ts
/** @category Core */
export class A {}                 // → Core

/** @category Core/Schema order=1 */
export class Point {}             // → Core ▸ Schema, first

/** @category Data Pipeline */
export class Stage {}             // → "Data Pipeline" (one group; space kept)

/** @category Advanced/Internals order=10 */
export class Cache {}             // → Advanced ▸ Internals, order 10
```

## Combining with `@order`

`order=` inline on `@category` and the standalone [`@order`](/components/order)
tag both feed the same sort key. When a symbol has **both**, the inline
`@category … order=` **wins** — see
[the precedence rule on the `@order` page](/components/order#precedence-category--order-wins).

## How it shapes the sidebar

`@category` is one lever in the theme's single sidebar-ordering engine — every
entry carries a `group` path and an optional `order`. The prose counterpart is a
guide page's **`group` frontmatter** (same `/`-nesting rules). The full model —
nested paths, leaf-vs-branch ordering, `clubSidebarItems`, `sectionOrder`,
`docGroups`, and `menu` — is in
[Structure your sidebar](/guides/structure-your-sidebar).

## See also

- [Components overview](/components/overview) — the full tag list +
  `allowUnknownTags`.
- [`@order`](/components/order) — ordering symbols without a category.
- [Structure your sidebar](/guides/structure-your-sidebar) — how groups + order combine.
