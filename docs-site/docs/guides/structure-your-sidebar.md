---
title: Structure your sidebar
group: Guides
order: 4
---

# Structure your sidebar

The sidebar is assembled from several levers that all feed one ordering engine
([`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)).
This page ties them together: where groups come from, how nesting works, and the
exact rules that decide the order. Once you see that **every entry carries a
`group` path and an optional `order`**, the rest follows.

> [!NOTE]
> The two source tags below — `@category` and `@order` — are documented in depth
> on [Custom tags](/authoring/custom-tags). This page covers how they (and the
> config options) feed the sidebar; it doesn't re-document the tag syntax in full.

## The unified model

Every navigable entry — API symbol, guide page, or tutorial — carries:

- a **`group` path** (the bold top-level title, optionally a `/`-nested branch),
  and
- an optional **`order`** (the within-group sort key).

Where they come from:

| Source        | `group` from                                        | `order` from                       |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| API symbol    | `@category`, else its kind label (Classes, …)       | `@category … order=`, else `@order`|
| Guide page    | frontmatter `group`, else directory, else default   | frontmatter `order`                |
| Tutorial      | the tutorial hierarchy (`Tutorials/<parent>/…`)     | resolved tree order                |

That single abstraction is why a guide and a class can share a sidebar group: if
both resolve to the group `Core`, they bucket together.

## Lever 1 — group a symbol with `@category`

Tag a source symbol to put its page in an explicit group instead of its kind
section:

```ts
/**
 * @category Core
 */
export class Parser {}
```

`@category` accepts a `/`-path to **nest**, plus an inline `order=` option:

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

This places `Lexer` under **Core ▸ Parsing**, sorted first in its subgroup. Two
parsing subtleties, verified in `parseCategory`
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)):

- The **group path** is the leading run of whitespace-separated tokens; parsing
  switches to options at the first token containing `=`. So
  `@category Getting Started order=1` groups under the literal name
  **"Getting Started"** (the space stays part of the name) with `order` 1.
- **`/` is what nests** a group, not spaces. `Core/Parsing` nests; `Getting
  Started` is a single flat group whose label contains a space.

## Lever 2 — order any symbol with `@order`

The inline `order=` option only works on a symbol that *has* a `@category`. To
position a symbol that lives in its **kind section** (a plain `@class`,
`@module`, …), use the standalone `@order` tag:

```ts
/**
 * @module config
 * @order 1
 */
```

When both are present, `@category … order=` wins over `@order` (the more
specific, co-located declaration). See `readOrder` in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts).

> [!NOTE]
> Both `@category` and `@order` are **unknown tags** — your config must set
> `tags.allowUnknownTags: true` (every example config in this repo does). Full
> syntax on [Custom tags](/authoring/custom-tags).

## Lever 3 — nested groups (`/`-paths)

Any group path — from an `@category` tag, a guide's frontmatter `group`, or a
guide's directory — can use `/` to nest. The first segment is the bold top-level
title; deeper segments become **collapsible branch nodes**. The nesting is built
by `buildGroupTree`
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)).

So `@category Core/Parsing`, a guide in `docs/core/parsing/`, and frontmatter
`group: Core/Parsing` all nest a page under **Core ▸ Parsing**.

### Leaf-vs-branch ordering (the exact rule)

Within one group level, `buildGroupTree` sorts siblings — which can be **leaves**
(actual page links) and **branches** (subgroups) — like this:

1. By **effective order** ascending. A leaf's effective order is its own
   `order`; a **branch's** is the **minimum `order` of any page inside it**. So
   `order=1` on a single nested page floats its whole subgroup up.
2. On a tie, **leaves before branches**.
3. Then first-seen / bucket order (so an unordered group is unchanged).

Pages with no `order` sort last (effectively `+∞`), then alphabetically. This is
the same rule a guide group uses for its frontmatter `order`.

## Lever 4 — `clubSidebarItems`

[`clubSidebarItems`](/configuration#clubsidebaritems) collapses related entries
under a shared parent by the path segment **before the first `/` in their
label** — e.g. `queue`, `queue/Queue`, `queue/types` club under a `queue`
parent. A prefix shared by only one entry is left flat. Done by `clubNavTree`
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)).

> [!IMPORTANT]
> Clubbing applies **only** to buckets whose entries carry **no explicit
> `@category` / frontmatter group** — i.e. kind-label fallback sections. A group
> built from `@category` paths is *already* nested by `buildGroupTree` and is
> **not** additionally clubbed. Verified by the `groupEntries.every(e =>
> !e.explicit)` guard in `assembleNav`. In short: `@category` nesting and
> label-clubbing are mutually exclusive per group.

Clubbing is also order-aware: a clubbed parent sorts by the min `order` of its
members, and the bare-prefix entry (e.g. the `queue` module itself) becomes an
`index` child sorted first unless an explicit `@order` pulls a sibling ahead.

## Lever 5 — `sectionOrder`

[`sectionOrder`](/configuration#sectionorder) orders the **top-level** groups —
one unified list mixing kind labels, `@category` names, and doc-group names.

- Listed labels render first, in your order.
- For **kind labels** it's a filter too: a kind label you omit is **dropped**.
- **Category / doc groups are never dropped** by omission — they're appended
  after the listed sections (doc groups in [`docGroups`](/configuration#docgroups)
  order, then the rest alphabetically).

See [Combine guides + API](/guides/combine-guides-and-api) for how this
interleaves prose and API sections.

## Lever 6 — `docGroups` / `defaultDocGroup`

- [`docGroups`](/configuration#docgroups) orders the **doc-group** sections,
  which are appended **after** the API sections (unless a doc group is also named
  in `sectionOrder`, which then takes authority for its position).
- [`defaultDocGroup`](/configuration#defaultdocgroup) is the group a guide lands
  in when it declares none — no frontmatter `group` and no directory to derive
  one from.

Covered end-to-end in [Build a guides site](/guides/build-a-guides-site).

## Lever 7 — `menu`

[`menu`](/configuration#menu) replaces the auto Home / Source Files links with a
**top region** above the sections, each entry with an icon
(`lucide:<name>` or `simpleicons:<name>`). When `menu` is set it **owns** the
home/source links — the automatic Home (first) and Source Files (last) entries
are suppressed and appear only if you list them (`{ id: "home" }` /
`{ id: "source" }`); external links appear inline. The sections below the menu
**still** follow `sectionOrder`. See `resolveMenuItem` in
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts);
this site's [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
uses a `menu`.

## Putting it together

A realistic mixed config:

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
opts: {
  // Top-level order: a guide group, then API kinds, then more prose.
  sectionOrder: ["Getting Started", "Core", "Classes", "Guides", "Modules"],
  docGroups: ["Getting Started", "Guides"],
  defaultDocGroup: "Docs",
  clubSidebarItems: true,
  menu: [
    { id: "home", title: "Home", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  sectionOrder: ["Getting Started", "Core", "Classes", "Guides", "Modules"],
  docGroups: ["Getting Started", "Guides"],
  defaultDocGroup: "Docs",
  clubSidebarItems: true,
  menu: [
    { id: "home", title: "Home", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

</tab>
</tabs>

Combine that with `@category Core/Parsing order=1` on your classes and `order:`
frontmatter on your guides, and you control the sidebar top to bottom.

## Where to go next

- The `@category` / `@order` tag reference: [Custom tags](/authoring/custom-tags).
- The full option list: [Configuration](/configuration).
- The two workflows this ties together:
  [Build a guides site](/guides/build-a-guides-site) ·
  [Build an API reference](/guides/build-an-api-reference) ·
  [Combine guides + API](/guides/combine-guides-and-api).
