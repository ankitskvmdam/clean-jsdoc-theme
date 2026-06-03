# Architecture

`clean-jsdoc-theme` v5 is a pnpm + Turborepo monorepo. JSDoc invokes a thin
bridge that wires four single-responsibility packages into a one-way pipeline,
producing a static documentation site (SSR HTML + lazy-hydrated Preact islands +
a Pagefind search index).

---

## The pipeline

```
 JSDoc (salty doclet collection)
        │
        ▼
 clean-jsdoc-theme/publish.ts ── the bridge JSDoc calls via require()
        │
        ├─► setu.generateSite(collection)  ──►  SiteManifest
        │                                          (pages = MDX, nav, buildId)
        │                                              │
        │                                              ▼
        ├─► dwar.render(manifest, { theme })  ──►  RenderResult { files, search, stats }
        │        ▲                                     │
        │        │ components from rang                ▼
        │        └─ @clean-jsdoc-theme/rang      writeOutputFiles(files → opts.destination)
        │                                              │
        └─► dwar.runPagefindAgainstDir(destination)  ─┘  (indexes the written HTML)

 type contracts for every arrow live in @clean-jsdoc-theme/utils/src/site/*
```

**Boundary guarantees**

- The setu→dwar contract lives once, in `utils/src/site/*`. Both sides import it.
- **setu never imports dwar or rang** — the boundary is one-way.
- **dwar never re-reads doclets** — it consumes only a `SiteManifest`.
- **`dwar.render()` is pure** — no `fs`, no `process.cwd`, no logging. The only
  disk touch is `runPagefindAgainstDir` (a separate post-write step).
- **Slug rules live once** (`utils/.../slug-rules.ts`) — used by both setu (nav)
  and dwar (heading anchors).

---

## Repository layout

```
clean-jsdoc-theme/
├── packages/
│   ├── utils/                 # @clean-jsdoc-theme/utils  — shared types + slug rules
│   ├── setu/                  # @clean-jsdoc-theme/setu   — JSDoc → SiteManifest
│   ├── rang/                  # @clean-jsdoc-theme/rang   — Preact component library
│   ├── dwar/                  # @clean-jsdoc-theme/dwar   — SiteManifest → HTML/CSS/JS
│   ├── clean-jsdoc-theme/     # clean-jsdoc-theme         — the JSDoc theme entry (bridge)
│   ├── aadesh/                # @clean-jsdoc-theme/aadesh — CLI surface (stub)
│   └── bhasha/                # @clean-jsdoc-theme/bhasha — i18n surface (stub)
├── examples/
│   └── basic/                 # working JSDoc fixture: `pnpm run docs` → dist/
├── docs-site/                 # dogfood docs site (stub)
├── ARCHITECTURE.md            # this file
├── MIGRATION.md               # v4 → v5 migration guide
├── BREAKING_CHANGES.md
├── README.md
├── package.json               # workspace root
├── pnpm-workspace.yaml
├── turbo.json                 # task graph (build / test / lint / typecheck)
└── tsconfig.base.json
```

Tooling: **pnpm** workspace · **Turborepo** task orchestration · **tsup** builds ·
**vitest** tests · **TypeScript** project-wide.

---

## Packages

### `@clean-jsdoc-theme/utils` — shared contracts

The dependency-free core every other package imports. No runtime logic beyond
slug rules.

```
utils/src/
├── doclet-schema.ts      # JSDoc doclet shape
├── salty.ts              # salty (taffy) collection helpers/types
├── site/
│   ├── page.ts           # Page, Frontmatter, Heading
│   ├── manifest.ts       # SiteManifest, NavNode, SearchEntry
│   ├── render.ts         # OutputFile, RenderOptions, RenderResult
│   ├── theme.ts          # ThemeTokens, ThemeColors, ThemeConfig, ComponentOverrides
│   ├── islands.ts        # IslandName union + IslandPropsMap
│   ├── slug-rules.ts     # slugifyHeading, slugifyPath  (used by setu AND dwar)
│   └── index.ts          # barrel — the setu↔dwar boundary
└── index.ts
```

### `@clean-jsdoc-theme/setu` — JSDoc → `SiteManifest`

Walks the salty doclet collection and produces one MDX page per documented
class. No HTML, no JSX, no I/O. **Coverage today: `kind: 'class'` only**
(modules / mixins / namespaces / interfaces / typedefs / globals are deferred —
each is a mechanical `*-view.ts` + `mdast/*-view.ts` addition).

```
setu/src/
├── index.ts              # generateSite(collection, opts) → SiteManifest  (entry)
├── generate-site.ts      # enumerate classes, build pages, nav, buildId
├── validate.ts           # validateCollectionOrThrow
├── doclet.ts             # doclet access helpers
├── class-view.ts         # class doclet → structured view model
├── name-registry.ts      # longname → slug/path resolution
├── helper.ts
├── mdx.ts                # mdast → MDX string
└── mdast/
    ├── builders.ts       # mdast node builders
    ├── class-view.ts     # class view model → mdast
    ├── doclet.ts
    └── from-html.ts      # JSDoc inline HTML → mdast
docs/                     # architecture.md, how-jsdoc-works.md, …
```

### `@clean-jsdoc-theme/rang` — Preact component library

The components dwar server-renders and bundles. Ships SSR chrome, hydratable
islands, the MDX element map, the island registry, and shadcn-style primitives.
Styled with Tailwind utility classes referencing CSS variables (`--clean-*` and
the shadcn semantic aliases).

```
rang/src/
├── index.ts              # public exports
├── islands.ts            # ISLAND_REGISTRY: Record<IslandName, Component>
├── mdx-components.tsx     # defaultMdxComponents — MDX element → component map
├── lib/
│   └── cn.ts             # clsx + tailwind-merge (shadcn helper)
└── components/
    ├── Button.tsx        # shadcn-style Button (cva variants/sizes) + buttonVariants
    ├── Dialog.tsx        # shadcn-style Dialog (Preact-native; overlay, focus trap,
    │                     #   scroll lock, presence/animation) + Header/Title/Body/Footer
    ├── Layout.tsx        # page chrome (SSR)            ┐
    ├── Header.tsx        # site header (SSR)            │ chrome
    ├── Footer.tsx        # site footer (SSR)            ┘
    ├── Sidebar.tsx       # island: nav tree             ┐
    ├── TOC.tsx           # island: page TOC (scroll-spy)│
    ├── CmdK.tsx          # island: command palette      │ islands
    ├── Settings.tsx      # island: settings dialog      │  (hydrated)
    ├── ThemeToggle.tsx   # island: light/dark/system    │
    ├── CodeTabs.tsx      # island: tabbed code          │
    ├── CopyBtn.tsx       # island: clipboard            ┘
    └── CodeBlock.tsx     # MDX <pre> wrapper
```

**Islands** (`IslandName`): `sidebar`, `toc`, `cmdk`, `code-tabs`, `copy-btn`,
`theme-toggle`, `settings`. Each renders meaningful SSR HTML, then progressively
enhances after hydration.

### `@clean-jsdoc-theme/dwar` — `SiteManifest` → HTML/CSS/JS

A pure renderer. Server-renders pages, bundles each island as its own ESM chunk,
emits CSS, and exposes a separate Pagefind step.

```
dwar/src/
├── index.ts              # render(manifest, opts) → RenderResult  (entry)
├── layout.tsx            # SsrLayout — mirrors rang's Layout, wraps islands with
│                         #   data-island markers; renders the header controls
├── mdx.ts                # @mdx-js/mdx compile + run (Preact runtime, frontmatter)
├── html.ts               # HTML document skeleton, slug→path, excerpt, payload escaping
├── css.ts                # buildThemeVariableCss (:root + [data-theme=dark] tokens)
│                         #   + the prebuilt UTILITY_CSS  →  one stylesheet
├── generated/
│   └── utility-css.ts    # AUTOGENERATED Tailwind output (inlined string)
├── islands-bundle.ts     # esbuild: one ESM chunk per island (Preact inlined)
├── islands-loader.ts     # inline loader (lazy-imports only chunks present on page)
├── theme-script.ts       # pre-hydration <script>: theme + font-size/line-spacing
├── pagefind.ts           # runPagefindAgainstDir(destination)  — the only fs touch
styles/
└── tailwind.css          # Tailwind v4 input: @theme tokens, tw-animate-css, base
scripts/
├── build-css.mjs         # compiles tailwind.css via the v4 CLI → generated/utility-css.ts
└── smoke.ts              # end-to-end render to preview/ (manual check)
```

**CSS strategy.** Tailwind v4 is compiled **once at dwar's own build time**
(`build-css.mjs`, run before `tsup`) and inlined into `generated/utility-css.ts`.
Tailwind never runs at the consumer's `jsdoc` build, so `render()` stays pure and
users need no Tailwind config. The static utility layer is determined by rang's +
dwar's source; only the `:root` / `[data-theme="dark"]` token block is dynamic
(emitted per `ThemeConfig` at render time). Shadcn semantic colors
(`background`, `foreground`, `primary`, `muted`, `accent`, `border`, `ring`) are
mapped onto `--clean-*` via `@theme`, and the palette ships explicit OKLCH light
and dark values.

**`render()` emits:** `<slug>/index.html` per page (with a pre-hydration theme
script before the stylesheet), `_assets/styles.<buildId>.css`,
`_islands/<name>.js` per island, a per-page `data-island-props` JSON payload, and
`RenderResult.search` (one `SearchEntry` per non-hidden page).

### `clean-jsdoc-theme` — the JSDoc theme entry

The package JSDoc loads via `jsdoc -t clean-jsdoc-theme`. A thin orchestrator.

```
clean-jsdoc-theme/src/
├── publish.ts            # publish(taffyData, opts, tutorials) — the entry.
│                         #   resolves pkg + theme, calls setu → dwar, writes files,
│                         #   runs Pagefind. Holds defaultTheme (OKLCH palette).
└── write-output-files.ts # mkdir -p + writeFile loop (forward-slash → OS path)
```

setu and dwar are ESM-only; JSDoc 4 uses `require()`, so `publish.ts` (CJS) loads
them via dynamic `import()` of a resolved `file://` URL.

### Stubs

- **`@clean-jsdoc-theme/aadesh`** — reserved CLI (`clean-jsdoc build`). Stub today;
  JSDoc's own `-t` flag is the supported entry.
- **`@clean-jsdoc-theme/bhasha`** — reserved i18n surface. Only `createEmptyLocale`
  today; scoped to v5.1+.

---

## Build & test

```sh
pnpm install
pnpm build       # tsup per package (dwar also compiles its Tailwind CSS first)
pnpm test        # vitest across utils / setu / rang / dwar
pnpm typecheck
pnpm lint
```

Turborepo (`turbo.json`) wires the task graph: `build` depends on workspace deps'
builds; `test` / `typecheck` depend on builds so generated artifacts exist.

End-to-end check:

```sh
cd examples/basic
pnpm run docs            # jsdoc -c jsdoc.json → dist/
pnpm dlx serve dist
```

Or render dwar in isolation against a fixture: `pnpm --filter @clean-jsdoc-theme/dwar run smoke` → `packages/dwar/preview/`.
