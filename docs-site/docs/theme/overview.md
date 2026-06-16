---
title: Overview
group: Using the Theme
order: 1
---

# Overview

`clean-jsdoc-theme` turns a **JSDoc** or **TypeDoc** project into a fast, modern,
LLM-friendly documentation site. You point it at your source comments — and,
optionally, a folder of Markdown guides — and it produces server-rendered HTML,
lazily-hydrated interactive islands, fuzzy + full-text search, light and dark
themes, and a companion `.md` of every page.

It isn't a single template. Under the hood it's a small set of
single-responsibility [packages](/#the-packages) wired into a one-way pipeline, so
the same core powers both the JSDoc and TypeDoc entry points.

## How it works

<steps>

<step label="Document your code">

Write JSDoc or TypeDoc comments as you normally would — optionally alongside a
folder of hand-written Markdown guides.

</step>

<step label="Point your tool at the theme">

Add the theme to your `jsdoc.json` or `typedoc.json`. No CSS or build
configuration is required to get started.

</step>

<step label="Build">

Run JSDoc or TypeDoc. The theme builds a complete static site — HTML, islands, a
search index, and a companion `.md` for every page — ready to deploy anywhere.

</step>

</steps>

## Who should use clean-jsdoc-theme

- **JSDoc users** who want a modern, responsive, searchable site instead of the
  default template — with no CSS or build config required to get started.
- **TypeScript / TypeDoc users** who want that same output from their existing
  reflection-based docs.
- **Library authors** who want hand-written Markdown guides and an
  auto-generated API reference living in **one** site, one sidebar, one search.
- **Teams who care about AI**, who want every page to ship a clean companion
  `.md` so assistants and LLMs can read the docs as easily as people can.
- **Projects that need localization**, who want to ship their docs in multiple
  languages — translated UI, API descriptions, and prose, one static site per
  locale with a language switcher. See [Localize your docs](/guides/localize-your-docs).

## Find your way around

- **Getting started** — [JSDoc](/theme/jsdoc-getting-started) or
  [TypeDoc](/theme/typedoc-getting-started): install the theme and build your first site.
- **[Configuration](/theme/configuration)** — every theme option, with the JSDoc and
  TypeDoc forms side by side.
- **Guides** — [build a guides site](/guides/build-a-guides-site), an
  [API reference](/guides/build-an-api-reference),
  [combine the two](/guides/combine-guides-and-api), and
  [structure your sidebar](/guides/structure-your-sidebar).
- **Authoring** — [callouts](/components/callouts), [steps](/components/steps),
  [tabs](/components/tabs), [embeds](/guides/embeds), and
  [custom tags](/components/overview) you can use in prose and doc comments.
- **[Packages](/#the-packages)** — the building blocks, if you want to understand
  or extend the internals.

Ready to set it up? Head to **[JSDoc Getting Started](/theme/jsdoc-getting-started)** or
**[TypeDoc Getting Started](/theme/typedoc-getting-started)**.
