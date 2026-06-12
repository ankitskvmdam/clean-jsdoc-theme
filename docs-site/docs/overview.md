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
single-responsibility packages wired into a one-way pipeline, so the same core
powers both the JSDoc and TypeDoc entry points and each piece stays small and
testable.

> [!NOTE]
> This section — **Using the Theme** — is about building a docs site *with* the
> theme. If you want to understand or reuse the building-block packages
> themselves (`utils`, `setu`, `rang`, `dwar`, …), see the
> [Packages](/packages) section.

## Architecture

The packages form a strict one-way pipeline — your comments flow in, a static
site comes out:

![Build pipeline: JSDoc / TypeDoc → setu.generateSite() → SiteManifest → dwar.render() (with components from rang) → static site](/assets/build-pipeline.svg)

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
