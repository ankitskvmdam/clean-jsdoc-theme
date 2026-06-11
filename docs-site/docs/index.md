---
title: clean-jsdoc-theme
---

# clean-jsdoc-theme

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

### Built for LLMs

Every page emits a companion `.md` authored for machine reading, plus opt-out
"copy page" and "open in Claude / ChatGPT / Perplexity" actions — so an AI reads
the same reference your users do.

## Where to next

- **[Getting Started](/getting-started)** — install it and point JSDoc or
  TypeDoc at your project.
- **[Packages](/packages)** — the monorepo's packages and what each one is for.
- **[API Reference](/api-docs/)** — a live example of theme-generated API
  reference, built from a small sample module.
