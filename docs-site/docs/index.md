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
(`⌘K`), full-text search, and first-class light and dark themes.

It is also built for LLMs. Alongside every page it emits a companion `.md`,
authored to be ideal for large language models to read and understand — so your
API reference is as legible to an AI as it is to a human. Every API page also
carries one-click actions to copy that Markdown or open the page straight in
Claude, ChatGPT, or Perplexity (all opt-out if you'd rather not).

## Why clean-jsdoc-theme

- **Looks great out of the box.** Modern, responsive layout with first-class
  light and dark modes — no CSS required to get started.
- **Fast, framework-free output.** A static site built on a Preact + MDX +
  esbuild + Pagefind pipeline. No client framework to ship, no build config to
  maintain.
- **Interactive where it matters.** A fuzzy command palette (`⌘K`), a
  scroll-spy table of contents, copy-to-clipboard code blocks, tabbed examples,
  and a Monaco-powered source viewer — each loaded only on the pages that use it.
- **Prose _and_ API in one site.** Mix hand-written Markdown guides (like this
  page) with auto-generated API reference from your JSDoc/TypeDoc comments.
- **Built for LLMs.** Every page ships a companion `.md` written to be read by
  machines, plus opt-out "copy page" and "open in Claude / ChatGPT / Perplexity"
  actions on API pages — so your docs are as legible to a model as to a human.
- **Customizable.** Site name or logo, Google Fonts, sidebar menu, section
  ordering, custom CSS/JS, and more — all from your JSDoc or TypeDoc config.

## Where to next

- **[Getting Started](/getting-started)** — install it and point JSDoc or
  TypeDoc at your project.
- **[Packages](/packages)** — the monorepo's packages and what each one is for.
- **API Reference** — browse a real, theme-generated API page in the sidebar
  (see the `sample-api` module).
