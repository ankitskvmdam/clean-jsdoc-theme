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
- **Chrome markup lives once, in rang.** rang's `Layout`/`Header`/`Footer` own
  every byte of page-shell HTML. dwar's `SsrLayout` adds no chrome — it only
  wraps islands in `data-island` markers and passes them into rang's `Layout`
  slots (`headerControls` / `sidebar` / `toc`).

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
class. Emits Markdown/MDX only — no HTML, no I/O. The one bit of JSX it emits is
MDX callout elements (`<Callout type="info|warning|error">`, e.g. for
`@deprecated`): a plain `mdast` `data` field is dropped by `toMarkdown`, and
lowercase literal JSX bypasses MDX's component map, so callouts are emitted as a
capitalized MDX JSX node (wired via `mdxJsxToMarkdown`) that round-trips through
serialization and arrives as a prop on rang's `MdxBlockquote`.
**Coverage today: `kind: 'class'` only**
(modules / mixins / namespaces / interfaces / typedefs / globals are deferred —
each is a mechanical `*-view.ts` + `mdast/*-view.ts` addition).

```
setu/src/
├── index.ts              # generateSite(collection, opts) → SiteManifest  (entry)
├── generate-site.ts      # enumerate classes, build pages, nav (grouped by
│                         #   page kind → Modules/Classes/…), buildId
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
├── mdx-components.tsx     # defaultMdxComponents — the MDX element → component
│                         #   registry (wires up mdx-utils / mdx-tags / CodeBlock)
├── lib/
│   └── cn.ts             # clsx + tailwind-merge (shadcn helper)
└── components/
    ├── Button.tsx        # shadcn-style Button (cva variants/sizes) + buttonVariants
    ├── Dialog.tsx        # shadcn-style Dialog (Preact-native; overlay+blur, focus trap,
    │                     #   scroll lock, presence/animation) + Header/Title/Body/Footer.
    │                     #   align: center/top modal OR left/right side-sheet (drawer)
    ├── Layout.tsx        # slot-based page shell (SSR)  ┐
    ├── Header.tsx        # site header (SSR)            │ chrome
    ├── Footer.tsx        # site footer (SSR)            ┘
    ├── Sidebar.tsx       # island: grouped nav (by kind)┐  (+ SidebarItem action row)
    ├── MobileNav.tsx     # island: < md nav drawer      │  (reuses Dialog sheet +
    │                     #   SidebarItem + useThemeMode + SettingsDialog + Sidebar)
    ├── TOC.tsx           # island: page TOC (scroll-spy)│
    ├── CmdK.tsx          # island: command palette      │ islands
    ├── Settings.tsx      # island: settings (+ SettingsDialog, controlled) │ (hydrated)
    ├── ThemeToggle.tsx   # island: light/dark (+ useThemeMode hook)        │
    ├── CodeTabs.tsx      # island: tabbed code          │
    ├── CopyBtn.tsx       # island: clipboard            ┘
    ├── mdx-utils.tsx     # MDX shared utils: BaseProps, makeHeading, HeadingAnchor
    │                     #   (hover link button), cx, textContent
    ├── mdx-tags.tsx      # MDX tag renderers (headings, links, lists, tables, …)
    └── CodeBlock.tsx     # block code (the MDX `pre`, used as MdxPre) + inline
                          #   `Code` (MDX `code`); also serves CodeTabs + standalone
```

**Islands** (`IslandName`): `sidebar`, `mobile-nav`, `toc`, `cmdk`, `code-tabs`,
`copy-btn`, `theme-toggle`, `settings`. Each renders meaningful SSR HTML, then
progressively enhances after hydration. The `mobile-nav` drawer composes the
others (theme toggle, settings, sidebar) rather than duplicating them; it shows
below `md`, where the header keeps only its trigger and the sidebar column is
hidden.

### `@clean-jsdoc-theme/dwar` — `SiteManifest` → HTML/CSS/JS

A pure renderer. Server-renders pages, bundles each island as its own ESM chunk,
emits CSS, and exposes a separate Pagefind step.

```
dwar/src/
├── index.ts              # render(manifest, opts) → RenderResult  (entry)
├── layout.tsx            # SsrLayout — island-seam adapter: wraps islands in
│                         #   data-island markers, then composes rang's Layout
│                         #   via its slots (emits no chrome of its own). Header
│                         #   controls are desktop-only (search/theme/settings);
│                         #   mobile-nav is the only < md control
├── mdx.ts                # @mdx-js/mdx compile + run (Preact runtime, frontmatter,
│                         #   + rehype slug pass giving headings ids that mirror
│                         #   setu's TOC exactly — slugifyHeading + per-page registry)
├── html.ts               # HTML document skeleton, slug→path, excerpt, payload escaping
├── css.ts                # buildThemeVariableCss (:root + [data-theme=dark] tokens)
│                         #   + the prebuilt UTILITY_CSS  →  one stylesheet
├── generated/
│   └── utility-css.ts    # AUTOGENERATED Tailwind output (inlined string)
├── islands-bundle.ts     # esbuild: one ESM chunk per island (Preact inlined)
├── islands-loader.ts     # inline loader (lazy-imports only chunks present on page)
├── theme-script.ts       # pre-hydration <script>: theme + font-size/line-spacing
├── heading-anchors.ts    # inline <script>: delegated heading clicks → hash +
│                         #   copy link; sets data-copied 3s for the check-icon swap
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
and dark values. A `@custom-variant dark` rebinds the `dark:` utility variant to
`[data-theme="dark"]` (the theme toggle's signal) instead of the OS
`prefers-color-scheme`, and `--color-primary-light` derives a lighter accent via
relative `oklch()` for dark-mode emphasis (e.g. the selected sidebar item). The
heading/body/mono families are also exposed as `font-heading` / `font-body` /
`font-mono` utilities (mapped onto the `--clean-font-*` vars).

**`render()` emits:** `<slug>/index.html` per page (with a pre-hydration theme
script before the stylesheet and the inline heading-anchors script before
`</body>`), `_assets/styles.<buildId>.css`, `_islands/<name>.js` per island, a
per-page `data-island-props` JSON payload, and `RenderResult.search` (one
`SearchEntry` per non-hidden page).

### `clean-jsdoc-theme` — the JSDoc theme entry

The package JSDoc loads via `jsdoc -t clean-jsdoc-theme`. A thin orchestrator.

```
clean-jsdoc-theme/src/
├── publish.ts            # publish(taffyData, opts, tutorials) — the entry.
│                         #   resolves pkg + theme (opts.siteName / fonts → tokens),
│                         #   calls setu → dwar, writes files,
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
pnpm run docs            # build:theme (turbo) → jsdoc -c jsdoc.json → dist/
pnpm dlx serve dist
```

`examples/basic` consumes the theme's **built `dist`** (`publish.ts` loads
`setu`/`dwar`/`rang` from their `dist` at runtime; `jsdoc` never sees source).
So `docs` first runs `build:theme` — `turbo run build --filter=clean-jsdoc-theme`
— which rebuilds the whole upstream graph (`utils → setu/rang → dwar → theme`,
incl. dwar's CSS regen) in topo order, cached so unchanged packages are skipped.
Without this step a change in any package other than `clean-jsdoc-theme` would
leave a stale `dist` and never reach the site.

For a watch loop, `pnpm run dev` runs `turbo watch build` (cascades rebuilds on
any package edit) alongside `nodemon` (watches every package's `dist` and
re-runs `jsdoc`) and `serve`.

Or render dwar in isolation against a fixture: `pnpm --filter @clean-jsdoc-theme/dwar run smoke` → `packages/dwar/preview/`.
