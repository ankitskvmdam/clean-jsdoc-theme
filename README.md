# clean-jsdoc-theme

[![npm](https://img.shields.io/npm/v/clean-jsdoc-theme?logo=npm)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ankitskvmdam)

If clean-jsdoc-theme saves you time, please consider [sponsoring its development](https://github.com/sponsors/ankitskvmdam) — it directly funds the v5 rewrite and ongoing maintenance.

A clean, responsive, and customizable theme for JSDoc. v5 emits a static site with SSR-rendered chrome, lazy-hydrated Preact islands (sidebar, TOC, fuzzy command palette, theme toggle, settings, mobile nav, language switcher, copy-page button, code-block copy, tabbed code blocks, a Monaco source viewer), a co-located `.md` per page for LLMs, a built-in fuzzy search index (plus an optional Pagefind full-text index), optional multi-language (i18n) builds, and an Astro-free, framework-free build.

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

Then:

```sh
jsdoc -c jsdoc.json
pnpm dlx serve dist
```

The working example lives in [`examples/basic/`](./examples/basic) — `pnpm install && pnpm run docs` produces a static `dist/` covering every documentable kind, source-file viewers, tutorials, a README home page, the per-island ESM chunks, and a Pagefind index.

---

## Status

- ✅ End-to-end JSDoc → HTML pipeline works against real source.
- ✅ Page coverage for **all documentable kinds** — classes, interfaces, mixins, modules, namespaces, typedefs, and an aggregated globals page (events/enums/constants render as member sections).
- ✅ README → home page, `--tutorials` → guide pages, documented source files → read-only Monaco viewer pages.
- ✅ `{@link}` / `@see` cross-references resolved to real anchors (slug + member hash); external URLs open in a new tab.
- ✅ Fuzzy command-palette search over a generated index; a co-located `.md` per page + a copy-page button (copy / view / open in Claude · ChatGPT · Perplexity).
- ✅ Configurable sidebar — `sectionOrder` / `menu`, plus opt-in clubbing into collapsible, localStorage-persisted groups.
- ✅ Tests across every package (utils / setu / rang / dwar / bhasha / aadesh / typedoc / bridge). Lint and typecheck clean.
- ✅ Configurable theme tokens — `colors` / `darkColors` palette overrides (per-key merge over the OKLCH defaults) plus heading / body / mono font selection, wired through to the rendered CSS variables. Component-level overrides land before stable.
- ✅ Multi-language (i18n) builds — declare `opts.locales`, then the `clean-jsdoc` CLI (`@clean-jsdoc-theme/aadesh`, on `@clean-jsdoc-theme/bhasha`) extracts/validates/builds one static site per locale: translated UI chrome + API descriptions, per-locale `README.<locale>.md` home + `docs.<locale>/` overlays, per-language fonts, and a header language switcher.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full project structure.

---

## Repository layout

```
clean-jsdoc-theme/
├── packages/
│   ├── utils/                 # @clean-jsdoc-theme/utils
│   ├── setu/                  # @clean-jsdoc-theme/setu
│   ├── rang/                  # @clean-jsdoc-theme/rang
│   ├── dwar/                  # @clean-jsdoc-theme/dwar
│   ├── clean-jsdoc-theme/     # JSDoc theme entry (publish.ts bridge)
│   ├── typedoc/               # @clean-jsdoc-theme/typedoc (TypeDoc plugin)
│   ├── aadesh/                # @clean-jsdoc-theme/aadesh (theme CLI: i18n group + build)
│   └── bhasha/                # @clean-jsdoc-theme/bhasha (i18n core)
├── examples/
│   ├── basic/                 # Working JSDoc fixture
│   ├── typedoc-basic/         # Working TypeDoc fixture
│   └── with-i18n-example/     # 3-locale (en/ja/hi) localization fixture
├── docs-site/                 # Dogfood site (the published docs)
├── SKILLS/                    # LLM agent skills — drop into an assistant for theme expertise
├── docs/ARCHITECTURE.md       # Full project structure
├── MIGRATION.md               # v4 → v5 migration guide (breaking changes in §6)
└── migration-map.json         # machine-readable v4 → v5 option map
```

Pnpm workspace, Turborepo for task orchestration, tsup for builds, vitest for tests.

---

## Development

```sh
pnpm install
pnpm build         # build all packages
pnpm test          # vitest across every package
pnpm typecheck
pnpm lint
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
