---
title: Getting Started
group: Getting Started
order: 2
---

# Getting Started

This guide walks through adding `clean-jsdoc-theme` to a **JSDoc** project —
installing it, pointing JSDoc at the theme, and the handful of config options
worth knowing up front.

> [!INFO]
> **Using TypeScript?** `clean-jsdoc-theme` also ships a TypeDoc plugin
> (`@clean-jsdoc-theme/typedoc`) that produces the same site from a TypeDoc
> project. A dedicated TypeDoc setup guide is coming — this page covers JSDoc.

## Install

Install JSDoc and the theme as dev dependencies:

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

```sh
# or with pnpm
pnpm add -D jsdoc clean-jsdoc-theme
```

## Configure JSDoc

Add a `jsdoc.json` to your project root. Here's a small but real-world example
to start from:

```json5
{
  source: { include: ["./src", "./README.md"] },

  // Required: the markdown plugin pre-renders the Markdown in your
  // doc comments to HTML before the theme runs.
  plugins: ["plugins/markdown"],

  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> The **`plugins/markdown`** plugin is required. clean-jsdoc-theme expects your
> doc-comment Markdown already rendered to HTML — without it the build fails
> fast, and descriptions would render as raw, unformatted text.

Then build your docs:

```sh
npx jsdoc -c jsdoc.json
```

The site is written to `dist/`. Open `dist/index.html` in a browser, or serve
the folder during development:

```sh
npx serve dist
```

## Interesting options

A few of the options you'll reach for most — see the full
[Configuration](/configuration) reference for everything.

| Option               | What it does                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| [`siteName`](/configuration#sitename)             | Header title. Plain text, or a logo set — `light` and `dark` are the logo image URLs shown in each theme, and `alt` is the text shown if the image fails to load (and read by screen readers). |
| [`fonts`](/configuration#fonts)                   | Override `heading` / `body` (Google Fonts, loaded for you) and `mono`.                                |
| [`sectionOrder`](/configuration#sectionorder)     | Order the top-level sidebar sections; pair with `@category` tags to define your own groups.           |
| [`clubSidebarItems`](/configuration#clubsidebaritems) | Collapse related entries (a module and its members) under a shared, collapsible parent.           |
| [`menu`](/configuration#menu)                     | Custom links pinned above the sidebar nav, each with a `lucide:` / `simpleicons:` icon.               |
| [`tutorials`](/configuration#tutorials) / [`docs`](/configuration#docs) | Render hand-written Markdown guides alongside the generated API reference.       |
| [`copyPage`](/configuration#copypage)             | The per-page "copy page" / "open in LLM" button (on by default; configurable or opt-out).             |
