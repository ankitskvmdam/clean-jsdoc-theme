---
title: Overview
group: Authoring/Custom tags
order: 5
---

# Custom tags

The theme reads a handful of doc-comment **block tags** that base JSDoc and
TypeDoc don't define. You write them in your source comments; the theme uses them
to shape the sidebar and to embed live content (demos, runnable playgrounds)
straight from your code.

| Tag | What it does | Page |
| --- | --- | --- |
| `@category <path> [order=N]` | Put a symbol's page in an explicit sidebar group (and optionally order it). | [`@category`](/authoring/custom-tags/category) |
| `@order N` | A standalone within-group sort key for **any** symbol. | [`@order`](/authoring/custom-tags/order) |
| `@iframe <url> key=value` | Embed a sandboxed live demo from a source comment. | [`@iframe`](/authoring/custom-tags/iframe) |
| `@playground <providers> [filename=] [highlight=]` | Open an `@example` in a live playground (CodePen / JSFiddle / CodeSandbox). | [`@playground`](/authoring/custom-tags/playground) |

## Enable them first — `allowUnknownTags`

There's **one** setup step, and it's the single most common reason these tags
"don't work": base JSDoc strips any tag it doesn't recognize **before** the theme
ever runs. Turn on unknown tags in your `jsdoc.json`:

```json
{
  "tags": { "allowUnknownTags": true }
}
```

Without it, `@category` collapses to the default kind sections, `@order` does
nothing, and `@iframe` / `@playground` never render — silently. This site's
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
sets it.

> [!NOTE]
> **TypeDoc needs no such flag** — it passes these tags through. The
> `allowUnknownTags` requirement is JSDoc-only.

## Prose has equivalents

These are **source-comment** tags. When you're writing prose instead (a README,
a tutorial, or a file in your `docs` directory), the same capabilities are
available without tags:

- **`group` / `order` frontmatter** mirror `@category` / `@order` on a guide page
  (see [Build a guides site](/guides/build-a-guides-site)).
- the ` ```iframe ` **fence** mirrors `@iframe` (see [Embeds](/guides/embeds)).
- the ` ```js playground ` **fence** and the `<playground>` **container** mirror
  `@playground` (see [Add a playground](/guides/add-playgrounds)).

## See also

- [Structure your sidebar](/guides/structure-your-sidebar) — how `@category` /
  `@order` combine with `sectionOrder`, `docGroups`, `clubSidebarItems`, and `menu`.
- [Embeds & live demos](/guides/embeds) — the shared `@iframe` / ` ```iframe `
  config grammar in full.
- [Add a playground](/guides/add-playgrounds) — the full `@playground` feature:
  `opts.playground`, prose forms, and per-provider options.
