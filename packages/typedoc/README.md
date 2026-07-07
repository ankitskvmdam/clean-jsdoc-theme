<div align="center">

<a href="https://ankdev.me/clean-jsdoc-theme">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/clean-jsdoc-theme-dark.svg" />
    <img src="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/clean-jsdoc-theme-light.svg" alt="clean-jsdoc-theme" width="340" />
  </picture>
</a>

A fast, modern, LLM-friendly documentation site for your **TypeScript**
project, powered by TypeDoc.

[![npm version](https://img.shields.io/npm/v/@clean-jsdoc-theme/typedoc)](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc)
[![npm downloads](https://img.shields.io/npm/dm/@clean-jsdoc-theme/typedoc)](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc)
[![license](https://img.shields.io/npm/l/@clean-jsdoc-theme/typedoc)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)
[![docs](https://img.shields.io/badge/docs-ankdev.me-005bff)](https://ankdev.me/clean-jsdoc-theme/theme/typedoc-getting-started)
[![live demo](https://img.shields.io/badge/live%20demo-api--docs-7c3aed)](https://ankdev.me/clean-jsdoc-theme/api-docs)
[![stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme)
[![forks](https://img.shields.io/github/forks/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/fork)
[![issues](https://img.shields.io/github/issues/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues)
[![contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors)
[![sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ankitskvmdam)
[![socket](https://socket.dev/api/badge/npm/package/@clean-jsdoc-theme/typedoc)](https://socket.dev/npm/package/@clean-jsdoc-theme/typedoc)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/screenshot.png" width="49%" alt="clean-jsdoc-theme — light theme" />
  <img src="https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/packages/clean-jsdoc-theme/media/screenshot-dark.png" width="49%" alt="clean-jsdoc-theme — dark theme" />
</p>

A TypeDoc plugin that turns your project's reflections into a fast, modern static
site: server-rendered HTML, lazily-hydrated interactive islands, fuzzy + full-text
search, light and dark themes, and a companion `.md` of every page for LLMs.

## Highlights

- **Built for TypeScript** — your TypeDoc reflections become a structured API
  model, then a polished static site. No CSS or build config to get started.
- **Fast & framework-free** — server-rendered pages with lazily-hydrated Preact
  islands; each page loads only the JS it actually uses.
- **Search built in** — a fuzzy command palette (`Ctrl K`) over titles,
  descriptions, content, and per-member deep links, plus an optional
  [Pagefind](https://pagefind.app/) full-text index.
- **Guides + API in one site** — hand-written Markdown guides and the
  auto-generated reference share one sidebar and one search.
- **Localization in progress** — the `clean-jsdoc` i18n tooling already extracts
  translatable strings from a TypeDoc project; the full per-locale build (with a
  language switcher, per-language fonts, and `hreflang`) is landing next.
- **LLM-friendly** — every page ships a clean companion `.md`, plus a
  copy-page button to hand any page to Claude / ChatGPT / Perplexity. A
  downloadable [skill](https://ankdev.me/clean-jsdoc-theme/theme/llm-skill) turns
  any coding assistant into a setup expert.
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
    "siteName": "My Library",
    // Optional: a directory of hand-written Markdown/HTML guides rendered
    // alongside the API (folder layout → URL + sidebar group; per-file
    // frontmatter overrides; a root `index.md` becomes the home page).
    "docs": "docs"
  }
}
```

> The home page comes from TypeDoc's own top-level `"readme"` option (or a root
> `docs/index.md`). Both `readme` and the theme block sit at the top level of
> `typedoc.json` — `readme` is TypeDoc's, the theme options nest under
> `cleanJsdocTheme`.

Build, then serve over HTTP (Pagefind needs HTTP to load its index):

```sh
npx typedoc
npx serve dist
```

## Documentation

- **Setup & full reference** — [**ankdev.me/clean-jsdoc-theme/theme/typedoc-getting-started**](https://ankdev.me/clean-jsdoc-theme/theme/typedoc-getting-started): installation, the `cleanJsdocTheme` options, and theming — everything configured under `cleanJsdocTheme` in your `typedoc.json`.
- **Using JSDoc instead?** Install [`clean-jsdoc-theme`](https://www.npmjs.com/package/clean-jsdoc-theme) — the JSDoc template with the same look and feature set.
- **FAQ & recipes** — [**ankdev.me/clean-jsdoc-theme/guides/faq**](https://ankdev.me/clean-jsdoc-theme/guides/faq): how to embed CodePen / YouTube / sites, write rich doc comments (callouts, steps), and common config tweaks.
- **Live demo** — [**ankdev.me/clean-jsdoc-theme/api-docs**](https://ankdev.me/clean-jsdoc-theme/api-docs): a real generated API reference, so you can see the output before installing.

## Contributing 🤝

Feedback shapes this plugin directly, and contributors are welcome:

- 🐛 **Hit a bug or odd output?** [Open an issue](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/new) with a small reproduction — that's the single most useful thing you can do.
- 💡 **Missing something or have an idea?** Feature requests and questions are welcome in the [issue tracker](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues).
- 🛠️ **Want to dig in? PRs are genuinely welcome.** The adapter lives in [`packages/typedoc/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc) (its `NOTES.md` records the verified TypeDoc API facts it relies on). Friendly areas to start: type rendering, reflection edge cases, and the localized build. See [CONTRIBUTING.md](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/CONTRIBUTING.md).

No contribution is too small — a typo fix, a repro, or a docs tweak all help.
Verified against TypeDoc **0.28.x**. Thanks for helping make the TypeScript
documentation story great. ❤️

## Contributors

Thanks to everyone who has helped build clean-jsdoc-theme.

[![Contributors](https://contrib.rocks/image?repo=ankitskvmdam/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors)

## License

[MIT](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE) © [Ankit Kumar](https://ankdev.me)
