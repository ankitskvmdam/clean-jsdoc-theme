---
title: Overview
group: Components
order: 1
---

# Components

The building blocks you reach for when **authoring** documentation — in prose
(your README, tutorials, and `docs` files) and in JSDoc / TypeDoc doc comments.
They come in two flavours:

- **Visual components** — markup you drop into prose or a comment that renders as
  a richer UI element (callouts, steppers, tabs, live embeds, runnable
  playgrounds).
- **Custom tags** — doc-comment block tags base JSDoc/TypeDoc don't define, which
  the theme reads to shape the sidebar or embed live content from your code.

## Visual components

Authored the same way in prose and inside doc-comment descriptions (they flow
through one converter):

| Component | What it does | Page |
| --- | --- | --- |
| **Callouts** | Note / tip / warning / error admonitions (GitHub-style `> [!TIP]`). | [Callouts](/components/callouts) |
| **Steps** | A numbered `<steps>` / `<step>` stepper. | [Steps](/components/steps) |
| **Tabs** | A tabbed `<tabs>` / `<tab>` view. | [Tabs](/components/tabs) |
| **Embeds** | A sandboxed `<iframe>` live demo — a ` ```iframe ` fence or the `@iframe` tag. | [Embeds & live demos](/guides/embeds) |
| **Playgrounds** | "Open in CodePen / JSFiddle / CodeSandbox" from an `@example` or a code fence. | [Add a playground](/guides/add-playgrounds) |

## Custom tags

Block tags base JSDoc and TypeDoc don't define — the theme reads them from your
source comments. Two shape the sidebar; two embed live content (and have prose
equivalents):

| Tag | What it does | Page |
| --- | --- | --- |
| `@category <path> [order=N]` | Put a symbol's page in an explicit sidebar group (and optionally order it). | [@category](/components/category) |
| `@order N` | A standalone within-group sort key for **any** symbol. | [@order](/components/order) |
| `@iframe <url> key=value` | Embed a sandboxed live demo from a source comment. | [Embeds & live demos](/guides/embeds) |
| `@playground <providers> [filename=] [highlight=]` | Open an `@example` in a live playground. | [Add a playground](/guides/add-playgrounds) |

### Enable custom tags first — `allowUnknownTags`

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

## Tags vs. prose — two ways in

The custom tags are the **source-comment** form. When you're writing prose
instead (a README, a tutorial, or a `docs` file), the same capabilities are
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
