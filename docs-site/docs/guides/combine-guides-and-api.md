---
title: Combine guides + API
group: Guides
order: 3
---

# Combine guides + API

This is the theme's signature capability: **hand-written guides and a generated
API reference in one site** — one sidebar, one search index, one URL space. No
second site to deploy, no context-switch for your readers.

You've seen the two halves already:

- [Build a guides site](/guides/build-a-guides-site) — prose pages from a
  [`docs`](/theme/configuration#docs) folder.
- [Build an API reference](/guides/build-an-api-reference) — generated pages from
  your source.

Turn both on at once and they merge. This page is the mental model for how.

## The whole picture in one config

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",

    readme: "./README.md",   // → home page
    docs: "./docs",          // → prose guide pages
    // src above → generated API pages

    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  readme: "README.md",       // → home page
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",          // → prose guide pages
    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
</tabs>

That single build produces guide pages, API pages, the home page, and (for
JSDoc, by default) the source viewer — all stitched into one nav.

## The mental model

Everything funnels into **one flat list of pages** and **one call to
`assembleNav`** (in
[`packages/setu/src/generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)).
The sources are different, but the sidebar treats them uniformly:

1. **Home** — always first, always ungrouped. The README home page, **unless** a
   docs-root `index.md` exists, which overrides it.
2. **Sections**, in the effective order (below). Each top-level group is a bold
   sidebar title:
   - **API kind sections** — Classes, Modules, Namespaces, … for untagged
     symbols; or your own `@category` group names.
   - **Doc groups** — the groups your guide pages declare (frontmatter or
     directory).
   - **Tutorials** — if you use the JSDoc `--tutorials` directory.
3. **Source Files** — always last, always ungrouped (JSDoc, when
   `outputSourceFiles` is on).

The crucial insight: **a guide page's group and an API symbol's `@category` are
the same kind of thing.** Both end up as `frontmatter.group`, both feed the same
ordering machinery. A guide and a class can sit in the *same* sidebar group if
they share a group name.

```text
  README / index.md ──▶ Home
  docs/ folder ───────▶ Doc groups          ┐
  source code ────────▶ API kind sections   │
                        / @category groups   ├─▶  assembleNav  ──▶  one sidebar
  tutorials/ ─────────▶ Tutorials            │
  source files ───────▶ Source Files         ┘
```

## How the two are ordered together

This is the part worth getting right. The effective top-level order is built in
[`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts):

1. **[`sectionOrder`](/theme/configuration#sectionorder) comes first**, in the order
   you list. It's one unified list — it can name API kind labels (`Classes`),
   `@category` group names, **and** doc-group names, interleaved however you like.
2. For **kind labels**, `sectionOrder` is both a filter *and* an order — a kind
   label you omit is **dropped from the sidebar**.
3. **Category and doc groups are never dropped** by omission. Any not named in
   `sectionOrder` are appended *after* the listed sections — doc groups in
   [`docGroups`](/theme/configuration#docgroups) order first, then the rest
   alphabetically.
4. **Home** is always first and **Source Files** always last, regardless of
   `sectionOrder`.

> [!IMPORTANT]
> Because `sectionOrder` mixes doc groups *and* kind labels in one list, it's the
> tool for true interleaving — e.g. **Getting Started** (a guide group), then
> **Classes** (API), then **Guides** (more prose), then **Modules**. That's
> exactly what this site does; see its
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json).
> Use `docGroups` only when you want to order doc groups but leave the API
> sections at their defaults.

### Within a group

- **API symbols** sort by their `@order` / `@category … order=` then
  alphabetically — an untagged kind section stays purely alphabetical.
- **Guide pages** sort by their frontmatter `order` then title.
- **Tutorials** keep their resolved tree order.

The deeper mechanics — nested `/`-path groups, `clubSidebarItems`, leaf-vs-branch
ordering — are covered in [Structure your sidebar](/guides/structure-your-sidebar).

## The home page, settled once

When you combine sources, more than one thing *could* be the home page. The
precedence (see `generateSite` in
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)):

1. A docs-root **`index.md`** (slug `""`, `kind: 'index'`) — wins if present.
2. Otherwise the **`readme`** HTML.

So a `docs/index.md` lets you write a bespoke landing page while still using your
`README.md` for the npm/GitHub readme.

## Collisions are resolved, never fatal

All pages share one URL space, so slugs must be unique. setu claims slugs in a
fixed order — **API pages first**, then docs, then tutorials, then source pages —
and any later page whose slug is already claimed (or that would shadow the home)
is **skipped with a warning**, never a crash. So if a guide's slug happens to
collide with a generated class page, the API page wins and the guide is dropped
(rename it or set a frontmatter `slug`). Verified in the collision handling in
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts).

## Cross-linking between the halves

Because it's one site, links just work. From a guide, link to a generated page
by its slug; from a doc comment, use `{@link}` / `@tutorial` and setu resolves it
to the right page (doc pages are keyed by slug, tutorials by name — see the
resolvers in
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)).

## Where to go next

- Fine-tune the merged sidebar: [Structure your sidebar](/guides/structure-your-sidebar).
- The group/order tags on symbols: [Custom tags](/authoring/custom-tags).
- Every option in detail: [Configuration](/theme/configuration).
