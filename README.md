# clean-jsdoc-theme

> **v5 alpha.** A ground-up rewrite of the theme on a Preact + MDX + esbuild + Pagefind pipeline. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full project structure.
>
> To stay on v4, pin `"clean-jsdoc-theme": "^4"` in your `package.json`. v4 lives on the `v4-maintenance` branch and continues to receive security patches.

A clean, responsive, and customizable theme for JSDoc. v5 emits a static site with SSR-rendered chrome, lazy-hydrated Preact islands (sidebar, TOC, command palette, theme toggle, mobile nav, copy button, tabbed code blocks), a built-in Pagefind search index, and an Astro-free, framework-free build.

---

## Architecture

```
salty collection ──► setu.generateSite ──► SiteManifest ──► dwar.render ──► OutputFile[]
                          ▲                                       ▲                │
                          │                                       │                ▼
                    schema + slug rules                     components from    caller writes
                @clean-jsdoc-theme/utils                @clean-jsdoc-theme/rang      │
                                                                                     ▼
                                                                       dwar.runPagefindAgainstDir
```

Four boundary packages, each independently testable, glued together by a thin JSDoc bridge:

| Package | What it does |
|---|---|
| [`@clean-jsdoc-theme/utils`](./packages/utils) | Shared type contracts (`SiteManifest`, `Page`, `RenderOptions`, `IslandName`, …) and slug rules used by both setu and dwar. |
| [`@clean-jsdoc-theme/setu`](./packages/setu) | JSDoc → `SiteManifest`. Walks the salty doclet collection, produces one MDX page per documented class. No HTML, no JSX, no I/O. |
| [`@clean-jsdoc-theme/rang`](./packages/rang) | Preact component library: chrome (`Layout`, `Header`, `Footer`), seven hydratable islands, MDX element map, `ISLAND_REGISTRY`. |
| [`@clean-jsdoc-theme/dwar`](./packages/dwar) | Pure `SiteManifest` → HTML/CSS/JS renderer. Server-renders pages, bundles each island as its own ESM chunk via esbuild, emits CSS, exposes a separate Pagefind post-write step. |
| [`clean-jsdoc-theme`](./packages/clean-jsdoc-theme) | The JSDoc theme entry. A thin `publish.ts` bridge that wires the four packages together and is what `jsdoc -t clean-jsdoc-theme` actually invokes. |
| [`@clean-jsdoc-theme/aadesh`](./packages/aadesh) | Reserved CLI surface — `clean-jsdoc build`. Stub today; JSDoc's own `-t` is the supported entry. |
| [`@clean-jsdoc-theme/bhasha`](./packages/bhasha) | Reserved i18n surface. Stub today; scoped to v5.1+. |

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

The working example lives in [`examples/basic/`](./examples/basic) — `pnpm install && pnpm run docs` against eight source files produces a 27-file `dist/` (3 class pages, CSS, 7 island chunks, Pagefind index).

---

## Status

- ✅ End-to-end JSDoc → HTML pipeline works against real source.
- ✅ 170 tests across the four boundary packages.
- ✅ Lint and typecheck clean.
- 🚧 Page coverage is **classes only** today. Modules / mixins / namespaces / interfaces / typedefs / globals are deferred (each becomes a mechanical `*-view.ts` + `mdast/*-view.ts` addition in setu).
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
pnpm test          # 170 tests across utils / setu / rang / dwar
pnpm typecheck
pnpm lint
```

To iterate on the example end-to-end:

```sh
cd examples/basic
pnpm run docs      # jsdoc -c jsdoc.json → dist/
pnpm dlx serve dist
```

---

## License

MIT.
