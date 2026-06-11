<div align="center">

<a href="https://ankdev.me/clean-jsdoc-theme"><img src="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/clean-jsdoc-theme.svg" alt="clean-jsdoc-theme" width="340" /></a>

The **TypeDoc** plugin for `clean-jsdoc-theme` — the same fast, modern,
LLM-friendly documentation site, generated from your TypeScript sources.

[![npm version](https://img.shields.io/npm/v/@clean-jsdoc-theme/typedoc)](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc)
[![npm downloads](https://img.shields.io/npm/dm/@clean-jsdoc-theme/typedoc)](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc)
[![license](https://img.shields.io/npm/l/@clean-jsdoc-theme/typedoc)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)
[![docs](https://img.shields.io/badge/docs-ankdev.me-005bff)](https://ankdev.me/clean-jsdoc-theme/typedoc-getting-started)
[![live demo](https://img.shields.io/badge/live%20demo-api--docs-7c3aed)](https://ankdev.me/clean-jsdoc-theme/api-docs)
[![stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme)
[![forks](https://img.shields.io/github/forks/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/fork)
[![issues](https://img.shields.io/github/issues/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues)
[![contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/screenshot.png" width="49%" alt="clean-jsdoc-theme — light theme" />
  <img src="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/screenshot-dark.png" width="49%" alt="clean-jsdoc-theme — dark theme" />
</p>

A TypeDoc plugin that feeds TypeDoc's reflections through the **same** pipeline as
the JSDoc theme, so a TypeScript project gets identical output: server-rendered
HTML, lazily-hydrated interactive islands, fuzzy + full-text search, light and
dark themes, and a companion `.md` of every page for LLMs.

## Highlights

- **Same site as the JSDoc theme** — one rendering core, so JSDoc and TypeDoc
  projects produce identical output.
- **Fast & framework-free** — server-rendered pages with lazily-hydrated Preact
  islands; each page loads only the JS it actually uses.
- **Search built in** — a fuzzy command palette (`Ctrl K`) over titles,
  descriptions, content, and per-member deep links, plus an optional
  [Pagefind](https://pagefind.app/) full-text index.
- **Guides + API in one site** — hand-written Markdown guides and the
  auto-generated reference share one sidebar and one search.
- **LLM-friendly** — every page ships a clean companion `.md`, plus a
  copy-page button to hand any page to Claude / ChatGPT / Perplexity.
- **Polished by default** — light/dark OKLCH themes, Google Fonts, shiki syntax
  highlighting, a Monaco source viewer, and `Source: file:line` links.

## Quick start

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

`typedoc` is a peer dependency — you bring your own. Load the plugin and select
its output in `typedoc.json`; theme options live under `cleanJsdocTheme`:

```jsonc
{
  "entryPoints": ["src/index.ts"],
  "plugin": ["@clean-jsdoc-theme/typedoc"],
  "outputs": [{ "name": "clean-jsdoc-theme", "path": "dist" }],
  "cleanJsdocTheme": {
    "siteName": "My Library"
  }
}
```

Build, then serve over HTTP (Pagefind needs HTTP to load its index):

```sh
npx typedoc
npx serve dist
```

## Documentation

- **Setup & full reference** — [**ankdev.me/clean-jsdoc-theme/typedoc-getting-started**](https://ankdev.me/clean-jsdoc-theme/typedoc-getting-started): installation, the `cleanJsdocTheme` options, and theming. Every theme option works the same as JSDoc's `opts`, nested under `cleanJsdocTheme`.
- **Live demo** — [**ankdev.me/clean-jsdoc-theme/api-docs**](https://ankdev.me/clean-jsdoc-theme/api-docs): a real generated API reference, so you can see the output before installing.

> **v5 is in alpha.** Verified against TypeDoc **0.28.x**.

## License

[MIT](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE) © [Ankit Kumar](https://ankdev.me)
