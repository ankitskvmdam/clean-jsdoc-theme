---
title: Overview
group: Getting Started
order: 1
---

# Overview

`clean-jsdoc-theme` turns a **JSDoc** or **TypeDoc** project into a fast, modern,
LLM-friendly documentation site. You point it at your source comments — and,
optionally, a folder of Markdown guides — and it produces server-rendered HTML,
lazily-hydrated interactive islands, fuzzy + full-text search, light and dark
themes, and a companion `.md` of every page.

It isn't a single template. Under the hood it's a small set of
single-responsibility packages wired into a one-way pipeline, so the same core
powers both the JSDoc and TypeDoc entry points and each piece stays small and
testable.

## The packages

**Core** — the pipeline every build runs through:

| Package                        | What it does                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **[`@clean-jsdoc-theme/utils`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils)** | Shared type contracts (the boundary between packages), slug rules for URLs/anchors, and pure option validation. Browser-safe. |
| **[`@clean-jsdoc-theme/setu`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu)**  | Walks the doclet collection and produces a `SiteManifest` — one page per documented symbol, plus prose/guide pages, nav, and the search index. Emits Markdown only: no HTML, no I/O. |
| **[`@clean-jsdoc-theme/rang`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang)**  | The Preact component library: the SSR page shell, the hydratable **islands** (command palette, TOC, theme toggle, source viewer…), and the MDX element map. |
| **[`@clean-jsdoc-theme/dwar`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar)**  | The renderer. Takes a `SiteManifest` and emits the static site — HTML, one bundle per island, a stylesheet, and the search index. Pure: its only disk touch is the optional Pagefind step. |

**Entry points** — thin bridges that feed your toolchain into that pipeline:

| Package                          | What it does                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| **[`clean-jsdoc-theme`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/clean-jsdoc-theme)**          | The package JSDoc loads via `jsdoc -t clean-jsdoc-theme`. Wires `setu → dwar`, handles file I/O, validates options, runs Pagefind. |
| **[`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)** | The TypeDoc twin — a plugin that feeds TypeDoc's reflections through the **same** `setu → dwar` pipeline for identical output. |

**Reserved** — stubs scoped to a later release:
**[`@clean-jsdoc-theme/aadesh`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh)**
(a `clean-jsdoc build` CLI) and
**[`@clean-jsdoc-theme/bhasha`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha)**
(i18n).

See the [Packages](/packages) page for why each one exists and how they relate.

## Rough architecture

The packages form a strict one-way pipeline — your comments flow in, a static
site comes out:

```
 JSDoc / TypeDoc          (collect your source comments)
        │
        ▼
 bridge  ─►  setu.generateSite()  ─►  SiteManifest   (MDX pages + nav + search)
                                          │
                                          ▼
                          dwar.render()  ◄── components from rang
                                          │
                                          ▼
                                    static site       (HTML + .md + islands + search)
```

The boundaries are deliberate and one-way: **setu never imports dwar or rang**,
and **dwar never re-reads your doclets** — it consumes only the `SiteManifest`.
That keeps the renderer pure and lets both bridges share one rendering core with
no duplicated logic.

## Who should use clean-jsdoc-theme

- **JSDoc users** who want a modern, responsive, searchable site instead of the
  default template — with no CSS or build config required to get started.
- **TypeScript / TypeDoc users** who want that same output from their existing
  reflection-based docs.
- **Library authors** who want hand-written Markdown guides and an
  auto-generated API reference living in **one** site, one sidebar, one search.
- **Teams who care about AI**, who want every page to ship a clean companion
  `.md` so assistants and LLMs can read the docs as easily as people can.

Ready to set it up? Head to **[JSDoc Getting Started](/jsdoc-getting-started)**
or **[TypeDoc Getting Started](/typedoc-getting-started)**.
