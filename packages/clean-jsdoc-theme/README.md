<div align="center">

<a href="https://ankdev.me/clean-jsdoc-theme"><img src="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/clean-jsdoc-theme.svg" alt="clean-jsdoc-theme" width="340" /></a>

A fast, modern, LLM-friendly documentation theme for **JSDoc** and **TypeDoc**.

[![npm version](https://img.shields.io/npm/v/clean-jsdoc-theme)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![npm downloads](https://img.shields.io/npm/dm/clean-jsdoc-theme)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![license](https://img.shields.io/npm/l/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)
[![docs](https://img.shields.io/badge/docs-ankdev.me-005bff)](https://ankdev.me/clean-jsdoc-theme)
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

Point it at your source comments — and, optionally, a folder of Markdown guides —
and it produces a static site: server-rendered HTML, lazily-hydrated interactive
islands, fuzzy + full-text search, light and dark themes, and a companion `.md`
of every page for LLMs. No CSS or build config required to get started.

## Highlights

- **JSDoc _and_ TypeDoc** — the same modern output from either toolchain.
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
npm install --save-dev clean-jsdoc-theme jsdoc
```

Add a `jsdoc.json`:

```json
{
  "source": { "include": ["./src", "./README.md"] },
  "plugins": ["plugins/markdown"],
  "opts": {
    "destination": "dist",
    "recurse": true,
    "template": "node_modules/clean-jsdoc-theme/dist"
  }
}
```

Build, then serve over HTTP (Pagefind needs HTTP to load its index):

```sh
jsdoc -c jsdoc.json
npx serve dist
```

## Documentation

- **Guides & full reference** — [**ankdev.me/clean-jsdoc-theme**](https://ankdev.me/clean-jsdoc-theme): installation, TypeDoc usage, configuration, and theming.
- **Live demo** — [**ankdev.me/clean-jsdoc-theme/api-docs**](https://ankdev.me/clean-jsdoc-theme/api-docs): a real generated API reference, so you can see the output before installing.

> **v5 is in alpha.** To stay on v4, pin `"clean-jsdoc-theme": "^4"` in your
> `package.json`. Every past release is tagged, so you can check out the matching
> git tag to browse the v4 source.

## License

[MIT](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE) © [Ankit Kumar](https://ankdev.me)
