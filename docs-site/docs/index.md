---
title: clean-jsdoc-theme
---

# clean-jsdoc-theme

[![sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ankitskvmdam)
[![npm version](https://img.shields.io/npm/v/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![npm downloads](https://img.shields.io/npm/dm/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![GitHub stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme)
[![Contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors)
[![License](https://img.shields.io/npm/l/clean-jsdoc-theme.svg?color=005bff)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)

**clean-jsdoc-theme** is a complete documentation suite for JavaScript and
TypeScript projects — not just a coat of paint on JSDoc's output. Point it at a
**JSDoc** _or_ **TypeDoc** project and it uses those tools under the hood only to
collect your source comments; from there it takes over, building a structured
model of your API and rendering a fast, modern static site — server-rendered
HTML, lazy-hydrated interactive islands, a built-in fuzzy command palette
(`Ctrl K`), full-text search, and first-class light and dark themes.

It is also built for LLMs. Alongside every page it emits a companion `.md`,
authored to be ideal for large language models to read and understand — so your
API reference is as legible to an AI as it is to a human. Every API page also
carries one-click actions to copy that Markdown or open the page straight in
Claude, ChatGPT, or Perplexity (all opt-out if you'd rather not).

## What you get

### Two kinds of search, zero setup

A `Ctrl K` fuzzy command palette that ranks across titles, descriptions, and full
page text — and deep-links straight to any class member by name. Turn on an
optional Pagefind full-text index with a single flag.

### Prose and API in one site

Hand-written Markdown guides sit right beside reference auto-generated from your
JSDoc or TypeDoc comments — one sidebar, one search index, one URL space. Point
it at a folder of Markdown files and the folder layout, plus a little
frontmatter, becomes your navigation — the prose pages on this site, including
the one you're reading, are exactly that. `{@link}` and `@see` resolve to real
cross-page anchors, and every member links to its exact source line.

### Rich, interactive content

Tabbed code blocks, copy-to-clipboard, info and warning callouts, sandboxed live
embeds (CodePen and friends), and a Monaco-powered source viewer that opens to
the exact line you linked.

### Fast and framework-free

Server-rendered HTML with lazy-hydrated Preact islands — each shipped only to the
pages that use it. No client framework to send down the wire, no build config to
maintain.

### Light and dark, out of the box

First-class light and dark themes on an OKLCH palette — no CSS required. Bring
your own site name or logo, Google Fonts, sidebar menu, and custom CSS/JS
whenever you want them.

### Ships in any language

Built-in localization: declare your locales and the `clean-jsdoc` CLI builds one
static site per language — translated UI, API descriptions, and prose, with a
header language switcher, per-language fonts, and `hreflang` for SEO. See
[Localize your docs](/guides/localize-your-docs).

### Built for LLMs

Every page emits a companion `.md` authored for machine reading, plus opt-out
"copy page" and "open in Claude / ChatGPT / Perplexity" actions — so an AI reads
the same reference your users do.

### An out-of-the-box AI skill

A downloadable [**skill**](/theme/llm-skill) that turns any coding assistant into a
`clean-jsdoc-theme` expert — point your agent at it and relax while it sets up your
config, authors your guides, and structures your sidebar correctly the first time.
No prompt-engineering, no guessing.

## The packages

`clean-jsdoc-theme` isn't a single template. Under the hood it's a small set of
single-responsibility packages wired into a one-way `setu → dwar` pipeline: your
source comments flow in one end and a fast, static, LLM-friendly site comes out
the other. Because that core is shared, the same pieces power both the JSDoc and
TypeDoc entry points.

Most users never touch these directly — you install an [entry
point](#entry-points), set a few [options](/theme/configuration), and you're done. But
every building block is **published to npm**, documented, and reusable.

![Build pipeline: JSDoc / TypeDoc → setu.generateSite() → SiteManifest → dwar.render() (with components from rang) → static site](/assets/build-pipeline.svg)

### Core pipeline

**setu** turns your comments into a `SiteManifest`; **dwar** renders that
manifest to HTML/CSS/JS using the Preact components from **rang**; **utils**
holds the shared types and Zod schemas that define the boundary contract.

| Package | What it does | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/utils`](https://www.npmjs.com/package/@clean-jsdoc-theme/utils) | Shared types, Zod schemas, and the `SiteManifest` contract every other package builds against. | [Overview](/packages/utils-overview) · [Examples](/packages/utils-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils) |
| [`@clean-jsdoc-theme/setu`](https://www.npmjs.com/package/@clean-jsdoc-theme/setu) | Processes JSDoc doclets into pages, nav, and cross-resolved links — emits the `SiteManifest`. Does no I/O. | [Overview](/packages/setu-overview) · [Examples](/packages/setu-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu) |
| [`@clean-jsdoc-theme/rang`](https://www.npmjs.com/package/@clean-jsdoc-theme/rang) | Preact component library, MDX component map, and island registry — the UI dwar bundles for SSR and hydration. | [Overview](/packages/rang-overview) · [Examples](/packages/rang-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang) |
| [`@clean-jsdoc-theme/dwar`](https://www.npmjs.com/package/@clean-jsdoc-theme/dwar) | Renders a `SiteManifest` to in-memory HTML/CSS/JS (Preact + MDX + utility CSS + esbuild islands), plus a Pagefind hook. Pure. | [Overview](/packages/dwar-overview) · [Examples](/packages/dwar-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar) |

### Entry points

These are what you actually install — each feeds your docs through the same
`setu → dwar` core, JSDoc via the `publish` bridge and TypeDoc via a registered
output.

| Package | What it does | Getting started | Source |
| --- | --- | --- | --- |
| [`clean-jsdoc-theme`](https://www.npmjs.com/package/clean-jsdoc-theme) | The JSDoc template. JSDoc calls its `publish()` bridge, which orchestrates setu → dwar and writes the files. | [JSDoc Getting Started](/theme/jsdoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/clean-jsdoc-theme) |
| [`@clean-jsdoc-theme/typedoc`](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc) | The TypeDoc plugin. Registers a `clean-jsdoc-theme` output that runs reflection → setu → dwar. | [TypeDoc Getting Started](/theme/typedoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc) |

### Localization

Ship your docs in multiple languages. **aadesh** is the `clean-jsdoc` CLI that
drives the extract → translate → build workflow; **bhasha** is the pure,
browser-safe i18n core (catalog, translator, key scheme) the build and the UI
share. Start with [Localize your docs](/guides/localize-your-docs).

| Package | What it does | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/aadesh`](https://www.npmjs.com/package/@clean-jsdoc-theme/aadesh) | The `clean-jsdoc` localization CLI — extract, translate-prompt, validate, and build one site per locale. | [Overview](/packages/aadesh-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh) |
| [`@clean-jsdoc-theme/bhasha`](https://www.npmjs.com/package/@clean-jsdoc-theme/bhasha) | The isomorphic i18n core: chrome catalog, `t` translator, `LanguageProvider`, and the API key/hash scheme. | [Overview](/packages/bhasha-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha) |

The boundaries are deliberately one-way — **setu** never imports dwar or rang,
**dwar** consumes only the `SiteManifest`, and `render()` is pure — which is what
lets both entry points share one rendering core with no duplicated logic. For why
the project is split this way, see the [Overview](/theme/overview); to combine
hand-written guides with your generated reference, see [Combining guides and
API](/guides/combine-guides-and-api).

## Where to next

- **Getting Started** — install it and point [JSDoc](/theme/jsdoc-getting-started) or
  [TypeDoc](/theme/typedoc-getting-started) at your project.
- **[API Reference](/api-docs/)** — a live example of theme-generated API
  reference, built from a small sample module.
