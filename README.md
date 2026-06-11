# clean-jsdoc-theme

> **v5 alpha.** A ground-up rewrite of the theme on a Preact + MDX + esbuild + Pagefind pipeline. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full project structure.
>
> To stay on v4, pin `"clean-jsdoc-theme": "^4"` in your `package.json`. Every past release is tagged, so you can check out the matching git tag to browse the v4 source.

A clean, responsive, and customizable theme for JSDoc. v5 emits a static site with SSR-rendered chrome, lazy-hydrated Preact islands (sidebar, TOC, fuzzy command palette, theme toggle, settings, mobile nav, copy-page button, code-block copy, tabbed code blocks, a Monaco source viewer), a co-located `.md` per page for LLMs, a built-in fuzzy search index (plus an optional Pagefind full-text index), and an Astro-free, framework-free build.

---

## Architecture

![clean-jsdoc-theme Architecture.](https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/refs/heads/master/docs/architecture.svg)

Four boundary packages, each independently testable, glued together by a thin JSDoc bridge:

| Package                                             | What it does                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`@clean-jsdoc-theme/utils`](./packages/utils)      | Shared type contracts (`SiteManifest`, `Page`, `RenderOptions`, `IslandName`, …) and slug rules used by both setu and dwar.                                                                                                                                                          |
| [`@clean-jsdoc-theme/setu`](./packages/setu)        | JSDoc → `SiteManifest`. Walks the salty doclet collection into one MDX page per documented symbol (classes, interfaces, mixins, modules, namespaces, typedefs, globals) plus README/tutorials/source pages, and resolves `{@link}`/`@see` cross-references. No HTML, no JSX, no I/O. |
| [`@clean-jsdoc-theme/rang`](./packages/rang)        | Preact component library: chrome (`Layout`, `Header`, `Footer`, `Brand`), eleven hydratable islands, shadcn-style primitives (`Button`, `ButtonGroup`, `Dialog`, `DropdownMenu`), MDX element map, `ISLAND_REGISTRY`.                                                                |
| [`@clean-jsdoc-theme/dwar`](./packages/dwar)        | Pure `SiteManifest` → HTML/CSS/JS renderer. Server-renders pages, bundles each island as its own ESM chunk via esbuild, emits CSS, exposes a separate Pagefind post-write step.                                                                                                      |
| [`clean-jsdoc-theme`](./packages/clean-jsdoc-theme) | The JSDoc theme entry. A thin `publish.ts` bridge that wires the four packages together and is what `jsdoc -t clean-jsdoc-theme` actually invokes.                                                                                                                                   |
| [`@clean-jsdoc-theme/aadesh`](./packages/aadesh)    | Reserved CLI surface — `clean-jsdoc`. Stub today; JSDoc's own `-t` is the supported entry.                                                                                                                                                                                           |
| [`@clean-jsdoc-theme/bhasha`](./packages/bhasha)    | Reserved i18n surface. Stub today; scoped to v5.1+.                                                                                                                                                                                                                                  |

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

The working example lives in [`examples/basic/`](./examples/basic) — `pnpm install && pnpm run docs` against 28 source files produces a static `dist/` covering every documentable kind, source-file viewers, tutorials, a README home page, the per-island ESM chunks, and a Pagefind index.

---

## Status

- ✅ End-to-end JSDoc → HTML pipeline works against real source.
- ✅ Page coverage for **all documentable kinds** — classes, interfaces, mixins, modules, namespaces, typedefs, and an aggregated globals page (events/enums/constants render as member sections).
- ✅ README → home page, `--tutorials` → guide pages, documented source files → read-only Monaco viewer pages.
- ✅ `{@link}` / `@see` cross-references resolved to real anchors (slug + member hash); external URLs open in a new tab.
- ✅ Fuzzy command-palette search over a generated index; a co-located `.md` per page + a copy-page button (copy / view / open in Claude · ChatGPT · Perplexity).
- ✅ Configurable sidebar — `sectionOrder` / `menu`, plus opt-in clubbing into collapsible, localStorage-persisted groups.
- ✅ Tests across utils / setu / rang / dwar / bridge. Lint and typecheck clean.
- 🚧 Theme tokens are fixed at a sensible default; configurable token / component overrides land before stable.
- 🚧 CLI (`@clean-jsdoc-theme/aadesh`), i18n (`@clean-jsdoc-theme/bhasha`), and the dogfood docs site (`docs-site/`) are stubbed.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full project structure.

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
│   ├── aadesh/                # @clean-jsdoc-theme/aadesh (stub)
│   └── bhasha/                # @clean-jsdoc-theme/bhasha (stub)
├── examples/
│   └── basic/                 # Working JSDoc fixture
├── docs-site/                 # Dogfood site (stub)
├── ARCHITECTURE.md            # Full project structure
├── MIGRATION.md               # v4 → v5 migration guide
└── BREAKING_CHANGES.md
```

Pnpm workspace, Turborepo for task orchestration, tsup for builds, vitest for tests.

---

## Development

```sh
pnpm install
pnpm build         # build all packages
pnpm test          # 292 tests across utils / setu / rang / dwar / bridge
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

## License

MIT.
