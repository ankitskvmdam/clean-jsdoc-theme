# clean-jsdoc-theme

[![npm](https://img.shields.io/npm/v/clean-jsdoc-theme?logo=npm)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![typedoc plugin](https://img.shields.io/npm/v/@clean-jsdoc-theme/typedoc?logo=npm&label=%40clean-jsdoc-theme%2Ftypedoc)](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc)
[![license](https://img.shields.io/npm/l/clean-jsdoc-theme)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)
[![docs](https://img.shields.io/badge/docs-ankdev.me-005bff)](https://ankdev.me/clean-jsdoc-theme)
[![live demo](https://img.shields.io/badge/live%20demo-api--docs-7c3aed)](https://ankdev.me/clean-jsdoc-theme/api-docs)
[![sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ankitskvmdam)

A fast, modern, LLM-friendly documentation theme for **JSDoc _and_ TypeDoc**. Point it at your source comments — and, optionally, a folder of Markdown guides — and v5 produces a static site: SSR-rendered chrome, lazy-hydrated Preact islands (sidebar, TOC, fuzzy command palette, theme toggle, settings, mobile nav, language switcher, copy-page button, code-block copy, tabbed code blocks, a Monaco source viewer), a co-located `.md` per page for LLMs, a built-in fuzzy search index (plus an optional Pagefind full-text index), and optional multi-language (i18n) builds — all framework-free, with no CSS or build config required to get started.

> If clean-jsdoc-theme saves you time, please consider [sponsoring its development](https://github.com/sponsors/ankitskvmdam) — it directly funds the v5 rewrite and ongoing maintenance.

---

## Architecture

![clean-jsdoc-theme Architecture.](https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/refs/heads/master/docs/architecture.svg)

Four boundary packages (utils → setu/rang → dwar), each independently testable, glued together by thin JSDoc and TypeDoc bridges, plus the i18n pair (aadesh + bhasha):

| Package                                             | What it does                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@clean-jsdoc-theme/utils`](./packages/utils)      | Shared type contracts (`SiteManifest`, `Page`, `RenderOptions`, `IslandName`, …) and slug rules used by both setu and dwar.                                                                                                                                                          |
| [`@clean-jsdoc-theme/setu`](./packages/setu)        | JSDoc → `SiteManifest`. Walks the salty doclet collection into one MDX page per documented symbol (classes, interfaces, mixins, modules, namespaces, typedefs, globals) plus README/tutorials/source pages, and resolves `{@link}`/`@see` cross-references. No HTML, no JSX, no I/O. |
| [`@clean-jsdoc-theme/rang`](./packages/rang)        | Preact component library: chrome (`Layout`, `Header`, `Footer`, `Brand`), the hydratable islands (`IslandName` set), shadcn-style primitives (`Button`, `ButtonGroup`, `Dialog`, `DropdownMenu`), MDX element map, `ISLAND_REGISTRY`.                                                |
| [`@clean-jsdoc-theme/dwar`](./packages/dwar)        | Pure `SiteManifest` → HTML/CSS/JS renderer. Server-renders pages, bundles each island as its own ESM chunk via esbuild, emits CSS, exposes a separate Pagefind post-write step.                                                                                                      |
| [`clean-jsdoc-theme`](./packages/clean-jsdoc-theme) | The JSDoc theme entry. A thin `publish.ts` bridge that wires the packages together and is what `jsdoc -t clean-jsdoc-theme` actually invokes.                                                                                                                                        |
| [`@clean-jsdoc-theme/typedoc`](./packages/typedoc)  | The TypeDoc bridge — a plugin that feeds TypeDoc's reflections through the same setu → dwar pipeline, so a TypeScript project gets identical output. Selected via the `outputs` option in `typedoc.json`.                                                                            |
| [`@clean-jsdoc-theme/aadesh`](./packages/aadesh)    | The `clean-jsdoc` CLI for the theme. Localization authoring lives under the `i18n` group (`clean-jsdoc i18n extract`/`prompt`/`validate`); `build` is top-level (one static site per locale). Reads locales from your existing `jsdoc.json` opts; the top-level namespace is reserved for future groups. |
| [`@clean-jsdoc-theme/bhasha`](./packages/bhasha)    | The pure, browser-safe i18n core: the UI string catalog, the `t` translator + `LanguageProvider`, and the API-slot key/hash scheme that setu, aadesh, and rang all share.                                                                                                            |

---

## Quickstart

Both toolchains render through the same pipeline, so the output is identical — pick the entry point that matches your source. Serve over HTTP (Pagefind's full-text index needs HTTP to load).

### JSDoc

```sh
pnpm add -D clean-jsdoc-theme jsdoc
```

Minimal `jsdoc.json`:

```json
{
  "source": { "include": ["./src", "./README.md"] },
  "plugins": ["plugins/markdown"],
  "opts": {
    "encoding": "utf8",
    "destination": "dist",
    "recurse": true,
    "template": "./node_modules/clean-jsdoc-theme/dist"
  }
}
```

```sh
jsdoc -c jsdoc.json
pnpm dlx serve dist
```

### TypeDoc

```sh
pnpm add -D typedoc @clean-jsdoc-theme/typedoc
```

Minimal `typedoc.json` — load the plugin, select its **output**, and put theme options under `cleanJsdocTheme` (TypeDoc's counterpart to JSDoc's `opts`):

```json
{
  "entryPoints": ["src/index.ts"],
  "plugin": ["@clean-jsdoc-theme/typedoc"],
  "outputs": [{ "name": "clean-jsdoc-theme", "path": "dist" }],
  "cleanJsdocTheme": { "siteName": "My Library" }
}
```

```sh
typedoc
pnpm dlx serve dist
```

Runnable fixtures — `pnpm install && pnpm run docs` in each: [`examples/basic/`](./examples/basic) (JSDoc, covering every documentable kind, source-file viewers, tutorials, a README home page, per-island ESM chunks, and a Pagefind index), [`examples/typedoc-basic/`](./examples/typedoc-basic) (TypeDoc), and [`examples/with-i18n-example/`](./examples/with-i18n-example) (a 3-locale build).

## Documentation

- **Guides & full reference** — [**ankdev.me/clean-jsdoc-theme**](https://ankdev.me/clean-jsdoc-theme): installation (JSDoc + TypeDoc), configuration, authoring, and theming.
- **Live demo** — [**ankdev.me/clean-jsdoc-theme/api-docs**](https://ankdev.me/clean-jsdoc-theme/api-docs): a real generated API reference, so you can see the output before installing.
- **FAQ & recipes** — [**ankdev.me/clean-jsdoc-theme/guides/faq**](https://ankdev.me/clean-jsdoc-theme/guides/faq): embedding CodePen / YouTube, rich doc comments (callouts, steps, tabs), and common config tweaks.
- **LLM skill** — a downloadable [skill](https://ankdev.me/clean-jsdoc-theme/theme/llm-skill) (in [`SKILLS/`](./SKILLS)) that turns any coding assistant into a setup expert.

---

## Development

```sh
pnpm install
pnpm build         # build all packages
pnpm test          # vitest across every package
pnpm typecheck
pnpm lint
pnpm check:docs    # doc-consistency guard (package table, repo layout, island docs)
```

To iterate on the example end-to-end:

```sh
cd examples/basic
pnpm run docs      # build:theme (turbo) → jsdoc -c jsdoc.json → dist/
pnpm dlx serve dist
```

---

## History

clean-jsdoc-theme has been in active development since its [first commit](https://github.com/ankitskvmdam/clean-jsdoc-theme/commit/cd1e612e3897d17ee0c500353b079d087310c1e0) on 10 November 2019.

---

## License

MIT.
