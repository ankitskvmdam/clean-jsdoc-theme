---
title: clean-jsdoc-theme
---

# clean-jsdoc-theme

A clean, responsive, and customizable documentation theme for **JSDoc** and
**TypeDoc**. It turns your source comments into a fast static site with
server-rendered HTML, lazy-hydrated interactive islands, a built-in fuzzy
command palette, light/dark themes, and a co-located `.md` of every page so
LLMs can read your docs too.

> **🚧 These docs are a work in progress.** This is an early preview while
> we rebuild the site for v5. Some pages are missing and others will change.
> A complete version is coming soon — thanks for your patience.

> **ℹ️ This very site is generated using `clean-jsdoc-theme`.** Every page you
> are reading — including this prose and the API reference — was produced by the
> theme itself, so it doubles as a live demo of what your own docs can look like.

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
- **LLM-friendly.** Every page ships a companion `.md` and a one-click
  "copy page" / "open in Claude" button, so your docs are readable by humans and
  models alike.
- **Customizable.** Site name or logo, Google Fonts, sidebar menu, section
  ordering, custom CSS/JS, and more — all from your `jsdoc.json`.

## Where to next

- **[Getting Started](/getting-started)** — install the theme and point JSDoc at
  your project.
- **[Packages](/packages)** — the monorepo's packages and what each one is for.
- **API Reference** — browse a real, theme-generated API page in the sidebar
  (see the `sample-api` module).
