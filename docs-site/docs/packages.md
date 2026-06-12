---
title: Packages
group: Packages
order: 1
---

# Packages

`clean-jsdoc-theme` isn't a single template. Under the hood it's a small set of
single-responsibility packages wired into a one-way `setu → dwar` pipeline. Your
source comments flow in one end and a fast, static, LLM-friendly site comes out
the other — and because the core is shared, the same pieces power both the JSDoc
and TypeDoc entry points.

Most users never touch these directly: you install an
[entry point](#entry-points), set a few [options](/configuration), and you're
done. But each building block is published, documented, and reusable, so this
section exists for anyone who wants to understand the internals or build on top
of them.

![Build pipeline: JSDoc / TypeDoc → setu.generateSite() → SiteManifest → dwar.render() (with components from rang) → static site](/assets/build-pipeline.svg)

## Core pipeline

These four packages do the work. Comments are processed into a `SiteManifest` by
**setu**, and **dwar** renders that manifest to HTML/CSS/JS using the Preact
components from **rang**. **utils** holds the shared types and Zod schemas that
define the boundary contract.

| Package | Role | Docs | Source |
| --- | --- | --- | --- |
| `@clean-jsdoc-theme/utils` | Shared types, Zod schemas, and the `SiteManifest` contract every other package builds against. | [Overview](/packages/utils-overview) · [Examples](/packages/utils-examples) | [packages/utils](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils) |
| `@clean-jsdoc-theme/setu` | Processes JSDoc doclets into pages, nav, and cross-resolved links — emits the `SiteManifest`. Does no I/O. | [Overview](/packages/setu-overview) · [Examples](/packages/setu-examples) | [packages/setu](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu) |
| `@clean-jsdoc-theme/rang` | Preact component library, MDX component map, and island registry — the UI dwar bundles for SSR and hydration. | [Overview](/packages/rang-overview) · [Examples](/packages/rang-examples) | [packages/rang](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang) |
| `@clean-jsdoc-theme/dwar` | Renders a `SiteManifest` to in-memory HTML/CSS/JS (Preact + MDX + utility CSS + esbuild islands), plus a Pagefind hook. Pure. | [Overview](/packages/dwar-overview) · [Examples](/packages/dwar-examples) | [packages/dwar](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar) |

## Entry points

These are what you actually install. Each one feeds your docs through the same
`setu → dwar` core — JSDoc via the `publish` bridge, TypeDoc via a registered
output. Their usage is covered in the getting-started guides, not here.

| Package | Role | Getting started | Source |
| --- | --- | --- | --- |
| `clean-jsdoc-theme` | The JSDoc template. JSDoc calls its `publish()` bridge, which orchestrates setu → dwar and writes the files. | [JSDoc Getting Started](/jsdoc-getting-started) | [packages/clean-jsdoc-theme](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/clean-jsdoc-theme) |
| `@clean-jsdoc-theme/typedoc` | The TypeDoc plugin. Registers a `clean-jsdoc-theme` output that runs reflection → setu → dwar. | [TypeDoc Getting Started](/typedoc-getting-started) | [packages/typedoc](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc) |

## Reserved

Two more packages are published and reserved on npm but not yet usable — they're
stubs under active development. See [Reserved packages](/packages/reserved) for
what each one will do.

| Package | Planned role | Status |
| --- | --- | --- |
| `@clean-jsdoc-theme/aadesh` | A `clean-jsdoc` build/i18n workflow CLI. | [Reserved](/packages/reserved) |
| `@clean-jsdoc-theme/bhasha` | Localization / i18n tooling (extract → translate → build). | [Reserved](/packages/reserved) |

## How they fit together

The boundaries are deliberate and strictly one-way:

- **setu never imports dwar or rang.** It only depends on `utils` — it turns
  doclets into a `SiteManifest` and stops there. (You can confirm this in
  [`packages/setu/src`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src):
  there are no imports from dwar or rang.)
- **dwar consumes only the `SiteManifest`.** It never re-reads your doclets and
  has no notion of JSDoc or salty — it imports `utils` (for types), `rang` (for
  components), and `setu` only for the manifest *types*, never to re-derive
  content.
- **`render()` is pure.** dwar returns an in-memory `RenderResult`; it does no
  filesystem writes, no `cwd` reads, and no logging. The entry-point bridges own
  all I/O — they write `result.files` to disk and then optionally run Pagefind.

That single, narrow boundary — the `SiteManifest` — is what lets both the JSDoc
and TypeDoc entry points share one rendering core with no duplicated logic, and
keeps the renderer testable in isolation.

For the bigger picture of why the project is split this way, see the
[Overview](/overview). To combine hand-written guides with your generated API
reference in one site, see
[Combining guides and API](/guides/combine-guides-and-api).
