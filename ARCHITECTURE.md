# Architecture

`clean-jsdoc-theme` v5 is a pnpm + Turborepo monorepo. JSDoc invokes a thin
bridge that wires four single-responsibility packages into a one-way pipeline,
producing a static documentation site (SSR HTML + a co-located `.md` per page for
LLMs + lazy-hydrated Preact islands + a fuzzy search index, plus an optional
Pagefind full-text index).

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
- **`dwar.render()` is resilient** — a single page that fails to compile (e.g.
  MDX that won't parse) is skipped and reported in `RenderResult.errors`, never
  thrown. One bad page can't abort the whole build; the bridge logs the skips.
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
├── docs-site/                 # dogfood docs site: prose-first `opts.docs` build
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
│   ├── page.ts           # Page (+ 'source' kind & raw-source body), Frontmatter, Heading
│   ├── manifest.ts       # SiteManifest, NavNode, SearchEntry
│   ├── render.ts         # OutputFile, RenderOptions, RenderResult, RenderError
│   ├── theme.ts          # ThemeTokens, ThemeColors, ThemeConfig, ComponentOverrides
│   ├── site-name.ts      # SiteName (text | logo set) + siteNameText/resolveSiteLogo
│   ├── islands.ts        # IslandName union + IslandPropsMap
│   ├── slug-rules.ts     # slugifyHeading, slugifyPath, slugifySourcePath  (setu AND dwar)
│   └── index.ts          # barrel — the setu↔dwar boundary
└── index.ts
```

### `@clean-jsdoc-theme/setu` — JSDoc → `SiteManifest`

Walks the salty doclet collection and produces one MDX page per documented
container symbol. Emits Markdown/MDX only — no HTML, no I/O. The one bit of JSX it
emits is MDX callout elements (`<Callout type="info|warning|error">`, e.g. for
`@deprecated`): a plain `mdast` `data` field is dropped by `toMarkdown`, and
lowercase literal JSX bypasses MDX's component map, so callouts are emitted as a
capitalized MDX JSX node (wired via `mdxJsxToMarkdown`) that round-trips through
serialization and arrives as a prop on rang's `MdxBlockquote`.
**API coverage.** The five container kinds — class, interface, mixin, module,
namespace — render through one kind-parametric path (`getContainerView` →
`containerViewToMdast`): class keeps its constructor-params special case, and
class/interface additionally walk the `@augments`/`@extends` inheritance chain to
fold in inherited members. **Typedefs** get their own pages, and every
**global**-scope symbol that doesn't already own a page is collected onto a single
aggregated **"Globals"** page (each symbol a section; one nav entry). **events**,
**enums**, and **constants** are not standalone — they render as member sections
within their parent container's page. Alongside the
API, two free-form prose sources are also rendered as pages: the project
**README** (`opts.readme`, which JSDoc has already rendered to HTML) becomes the
site **home page** (slug `''` → `index.html`), and **tutorials** (the
`--tutorials` tree) become **guide pages** under `tutorials/<name>`, grouped as
"Tutorials" in the nav with their resolved hierarchy flattened in order. Both
flow through the same MDX → dwar path as class pages. Every prose source is
normalized to structured mdast before serialization (README + HTML tutorials via
`htmlToMdastBlocks`; Markdown tutorials via `markdownToMdastBlocks`, which routes
Markdown → HTML → the same converter). This is deliberate: raw Markdown is GFM,
not MDX, so passing it through verbatim lets MDX-hostile constructs — angle-bracket
autolinks (`<https://…>`), void/unclosed raw HTML (`<img …>`) — abort the page
compile in dwar. The HTML round-trip lowers everything to structured nodes (links,
images, tables — no raw HTML), and `toMdx` serializes links in resource form
(`[text](url)`, never `<url>`) so nothing MDX-hostile survives. GFM (tables, task
lists, strikethrough, footnotes) is preserved throughout.

**Docs directory.** A prose-first **docs site** is built from a directory of
Markdown/HTML files (`opts.docs`): the bridge walks it (it's the I/O layer; setu
stays disk-free) and hands setu a flat `DocInput[]` — each a POSIX relative path
(no extension), the raw content, and a `type`. `buildDocPages` then turns each
into a page where the **filesystem layout drives the URL and the sidebar group**:
the slug is the relative path with **no prefix** (`guides/advanced.md` →
`/guides/advanced`), and the group is the humanized parent directory
(`guides/` → "Guides"). A leading `---\n…\n---` YAML **frontmatter** block
(`parseFrontmatter`, dependency-light) overrides per file — `title`, `group`,
`order`, `slug`, `hidden` all win over the directory/humanized fallbacks; a
file with no frontmatter falls back to its folder's group and a humanized
filename title. A doc with no group at all lands in `opts.defaultDocGroup`. The
root `index.md` (`path === 'index'`) becomes the **home page** (slug `''`,
`kind: 'index'`), overriding the README home; otherwise the README still wins.
Doc-group sidebar sections render in `opts.docGroups` order, after the API
sections. A doc whose slug would shadow the home or an already-claimed
API/source/tutorial slug is skipped + logged (never throws), mirroring the
synthetic-globals skip. Tutorials and docs share **one** builder: legacy
tutorials are routed through `tutorialsToDocInputs`, a thin adapter that
synthesizes a `DocInput` per tutorial (`tutorials/<name>`, group "Tutorials",
incrementing order) with frontmatter parsing disabled, so today's tutorial
output stays byte-identical while flowing through the same path.

**Link resolution.** `{@link}`/`{@linkcode}`/`{@linkplain}` inline tags and `@see`
block tags become real anchors. setu builds a link registry (`link-registry.ts`)
from the page set it actually generates — a two-pass build: pass 1 populates the
registry (`longname → {slug, #anchor}`) for every page-level symbol and member
heading; pass 2 renders each page with a resolver closed over the full registry,
so forward references resolve. `resolveLinkTags` (`mdast/link-tags.ts`) and the
`@see` handler in `mdast/doclet.ts` then rewrite namepaths into page-slug +
`#member` heading anchors. External URLs (`http(s)://`, `mailto:`) link directly
(rang's `MdxA` opens `^https?://` in a new tab); unresolved namepaths fall back to
inline code, the look JSDoc text had before, and dwar's `preprocessJsdocInlineTags`
stays as a final safety net so any tag that still reaches MDX compile can't break
the page. The resolver also has a **unique short-name fallback**: a bare authored
name (`{@link BaseEntity}`) resolves to its symbol only when that short name is
unambiguous across the whole registry — ambiguous names refuse to resolve rather
than guess. Known v1 limitation (see `docs/plan-link-resolution.md`): member
anchors are bare `slugifyHeading(name)` without the per-page dedup counter, so a
member whose heading slug collides on its page may get a slightly-off anchor.

Source files are a third output, gated by the bridge's `outputSourceFiles` flag
(default on). When enabled, every documented source file becomes a hidden
`kind: 'source'` viewer Page (raw text on `Page.source`, no MDX body) plus a flat
**"Source Files"** index page, and each class member gains a `Source: file:line`
link — `source-view.ts` resolves the doclet `meta` (`path`/`filename`/`lineno`)
to `/source/<file>/#L<n>`, with the page slug and the link target sharing
`slugifySourcePath` so they always agree. By default the link lands on the first
line of the **declaration**: a container's documented doclet points `lineno` at
its doc-comment, so `firstCodeLine` skips past the comment block to the code (the
`sourceLinkToComment` option opts back into the comment line).

**Sidebar nav.** `assembleNav` groups pages into sections by kind (ordered/
filtered by `sectionOrder`, or fully replaced by a `menu` top region). With
`clubSidebarItems` on, `clubNavTree` additionally collapses each section's entries
into a one-level parent/child tree by the path segment before the first `/`
(`queue`, `queue/Queue`, `queue/types` → a `queue` parent; the bare `queue` module
becomes an `index` child); a prefix used by a single entry stays flat. Applies
uniformly to every section, tutorials included.

```
setu/src/
├── index.ts              # generateSite(collection, opts) → SiteManifest  (entry;
│                         #   opts carries pkg + readme HTML + tutorial tree + sources
│                         #   + sectionOrder + menu + clubSidebarItems + sourceLinkToComment)
├── generate-site.ts      # enumerate containers by kind, two-pass build (link
│                         #   registry before render), container/typedef/globals
│                         #   pages, assembleNav (sidebar: optional `menu` top
│                         #   region → divider → API sections ordered/filtered by
│                         #   `sectionOrder`; clubNavTree groups by path prefix when
│                         #   clubSidebarItems is on), buildId
├── guide-view.ts         # README → home Page; DocInput[] → guide Pages + nav
│                         #   (buildDocPages: frontmatter/directory slugs+groups,
│                         #   root index.md → home); tutorialsToDocInputs adapter
│                         #   (legacy tutorials → DocInput[], byte-identical output)
├── source-view.ts        # source files → hidden 'source' viewer Pages + "Source
│                         #   Files" index + per-member meta→/source/…#L<n> resolver
│                         #   (firstCodeLine: land on the declaration, not the comment)
├── validate.ts           # validateCollectionOrThrow
├── doclet.ts             # doclet access helpers
├── class-view.ts         # container doclet → structured view model
│                         #   (getContainerView, kind-parametric; getClassView alias)
├── name-registry.ts      # longname → slug/path resolution
├── link-registry.ts      # longname → {slug,#anchor} registry + makeLinkResolver
│                         #   ({@link}/@see → href; unique short-name fallback)
├── helper.ts
├── mdx.ts                # mdast → MDX string (resource-form links only, so no
│                         #   `<url>` autolink reaches dwar's MDX compile)
└── mdast/
    ├── builders.ts       # mdast node builders
    ├── class-view.ts     # container view model → mdast (containerViewToMdast)
    ├── doclet.ts
    ├── link-tags.ts      # resolveLinkTags: rewrite {@link}/{@linkcode}/
    │                     #   {@linkplain} text nodes → anchors (skips code spans)
    └── from-html.ts      # HTML / Markdown → structured mdast (the MDX-safe
                          #   normalization shared by README + tutorials)
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
    ├── Brand.tsx        # site identity: renders siteName as text OR a per-theme
    │                     #   logo image (dark/light swap via CSS only). Shared by
    │                     #   Header / Footer / MobileNav
    ├── Button.tsx        # shadcn-style Button (cva variants/sizes) + buttonVariants
    ├── ButtonGroup.tsx   # shadcn-style segmented group: flattens adjacent buttons'
    │                     #   inner corners + collapses their shared border (split button)
    ├── Dialog.tsx        # shadcn-style Dialog (Preact-native; overlay+blur, focus trap,
    │                     #   scroll lock, presence/animation) + Header/Title/Body/Footer.
    │                     #   align: center/top modal OR left/right side-sheet (drawer)
    ├── DropdownMenu.tsx  # shadcn-style menu (Preact-native; compound root/trigger/
    │                     #   content/item/separator/label; outside-click + Esc close,
    │                     #   roving arrow-key focus)
    ├── Layout.tsx        # slot page shell (SSR; toc rail only when toc slot set)┐
    ├── Header.tsx        # site header (SSR)            │ chrome
    ├── Footer.tsx        # site footer (SSR)            ┘
    ├── Sidebar.tsx       # island: menu region (icon links: lucide/┐ (+ SidebarItem
    │                     #   simpleicons CDN) + divider + grouped nav │  action row);
    │                     #   clubbed parents are collapsible (chevron, localStorage-
    │                     #   persisted) and scroll the active item into view on load
    ├── MobileNav.tsx     # island: < md nav drawer      │  (reuses Dialog sheet +
    │                     #   SidebarItem + useThemeMode + SettingsDialog + Sidebar)
    ├── TOC.tsx           # island: curved right-rail TOC │
    ├── TocPopover.tsx    # island: < lg mobile TOC bar   │  (progress ring +
    │                     #   expandable list; shares toc-utils with TOC)         │
    ├── toc-utils.ts      # shared scroll-spy: useActiveHeadings (rail set),       │
    │                     #   useTocProgress / getActiveHeadingIndex (mobile),     │
    │                     #   getItemOffset / getLineOffset (depth indentation)    │
    ├── CmdK.tsx          # island: command palette — fuzzy search │ islands
    │                     #   over the fetched search index (search-utils) (hydrated)
    ├── search-utils.ts   # dependency-free fuzzy matcher (fuzzyMatch / fuzzySearch /
    │                     #   highlightSegments) — fzf-style scoring for CmdK
    ├── Settings.tsx      # island: settings (+ SettingsDialog, controlled)
    ├── ThemeToggle.tsx   # island: light/dark (+ useThemeMode hook)
    ├── CodeTabs.tsx      # island: tabbed code
    ├── CopyBtn.tsx       # island: clipboard (code blocks)
    ├── CopyPageButton.tsx # island: copy-page split button (ButtonGroup + DropdownMenu):
    │                     #   copy the page .md, view it, or open in Claude/ChatGPT/
    │                     #   Perplexity (prompt + .md link, never the page body)
    ├── icons/            # inlined brand SVGs (ChatGptIcon ← chatgpt.svg)
    ├── CodeViewer.tsx    # island: read-only Monaco source viewer (CDN-loaded)
    ├── mdx-utils.tsx     # MDX shared utils: BaseProps, makeHeading, HeadingAnchor
    │                     #   (hover link button), cx, textContent
    ├── mdx-tags.tsx      # MDX tag renderers (headings, links, lists, tables, …)
    └── CodeBlock.tsx     # block code (the MDX `pre`, used as MdxPre) + inline
                          #   `Code` (MDX `code`); also serves CodeTabs + standalone
```

**Islands** (`IslandName`): `sidebar`, `mobile-nav`, `toc`, `toc-mobile`, `cmdk`,
`code-tabs`, `copy-btn`, `copy-page`, `theme-toggle`, `settings`, `code-viewer`.
Each renders meaningful SSR HTML, then progressively enhances after hydration.
The `cmdk` palette lazily fetches the search index on first open and ranks page
titles with a fuzzy matcher (`search-utils`). The `copy-page` split button
(content pages only, not the source section) copies the page's companion `.md`,
opens it, or hands its raw-Markdown link to an LLM — it's configurable via
`ThemeConfig.copyPage` (`enabled` + which `actions`). The `mobile-nav` drawer
composes the others (theme toggle, settings, sidebar) rather than duplicating
them; it shows below `md`, where the header keeps only its trigger and the
sidebar column is hidden. `toc` (the curved right rail) and `toc-mobile` (the
`< lg` progress-bar popover, `TocPopover`) are two presentations of the same
headings — both hydrate but only one is visible per breakpoint; they share their
scroll-spy and indentation logic via `toc-utils`. The `code-viewer` island
(source pages only) renders a byte-exact `<pre>` fallback, then lazy-loads a
read-only Monaco editor from the jsdelivr CDN (never bundled): it reads its code
back from that `<pre>`, reveals the `#L<n>` deep-link line, and re-themes off the
`<html data-theme>` attribute (a `MutationObserver`, since the toggle is a
separate island) with custom themes whose background matches the site's pinned
code surface.

### `@clean-jsdoc-theme/dwar` — `SiteManifest` → HTML/CSS/JS

A pure renderer. Server-renders pages, bundles each island as its own ESM chunk,
emits CSS, and exposes a separate Pagefind step.

```
dwar/src/
├── index.ts              # render(manifest, opts) → RenderResult  (entry). Renders
│                         #   each page in try/catch — a page that fails to compile
│                         #   is skipped + reported in RenderResult.errors, not thrown.
│                         #   kind:'source' pages skip MDX and mount the code-viewer
│                         #   island directly (code stays in the SSR <pre>, off the payload)
├── layout.tsx            # SsrLayout — island-seam adapter: wraps islands in
│                         #   data-island markers, then composes rang's Layout
│                         #   via its slots (emits no chrome of its own). Header
│                         #   controls are desktop-only (search/theme/settings);
│                         #   mobile-nav is the only < md control. Exposes
│                         #   renderIsland() (id alloc + marker), reused for source pages
├── mdx.ts                # @mdx-js/mdx compile + run (Preact runtime, frontmatter,
│                         #   remark-gfm for tables/strikethrough/task-lists,
│                         #   + rehype slug pass giving headings ids that mirror
│                         #   setu's TOC exactly — slugifyHeading + per-page registry).
│                         #   Pre-pass: {@link} → code spans + escapeStrayBraces (literal
│                         #   {…} in JSDoc prose escaped so MDX won't read it as JS)
├── html.ts               # HTML document skeleton, slug→path, excerpt, payload escaping
├── css.ts                # buildThemeVariableCss (:root + [data-theme=dark] tokens)
│                         #   + the prebuilt UTILITY_CSS  →  one stylesheet
├── generated/
│   └── utility-css.ts    # AUTOGENERATED Tailwind output (inlined string)
├── islands-bundle.ts     # esbuild: one ESM chunk per island (Preact inlined)
├── islands-loader.ts     # inline loader (lazy-imports only chunks present on page;
│                         #   copy-btn + code-viewer read their text from the DOM <pre>)
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
`</body>`), a co-located `<slug>/index.md` per content page (the page's MDX body
verbatim — for LLMs + the copy-page button; source-viewer pages have none),
`_assets/styles.<buildId>.css`, `_assets/search-index.<buildId>.json` (the fuzzy
search index the `cmdk` island fetches), `_islands/<name>.js` per island, a
per-page `data-island-props` JSON payload, and `RenderResult.search` (one
`SearchEntry` per non-hidden page). Content pages also mount the `copy-page`
island above the body (gated by `ThemeConfig.copyPage`, never on the source
section). The full-text Pagefind bundle is a separate post-write step.

### `clean-jsdoc-theme` — the JSDoc theme entry

The package JSDoc loads via `jsdoc -t clean-jsdoc-theme`. A thin orchestrator.

```
clean-jsdoc-theme/src/
├── publish.ts            # publish(taffyData, opts, tutorials) — the entry.
│                         #   resolves pkg + theme (opts.siteName / fonts → tokens),
│                         #   normalizes the README (→ home) + tutorial tree (→ guides)
│                         #   into setu opts, calls setu → dwar, writes files, runs
│                         #   Pagefind. siteName is text OR a logo set — local logo
│                         #   images are copied to _assets/logo-*. Logs the rendered-
│                         #   page count + any RenderResult.errors (skipped pages).
│                         #   Collects source files from doclet meta (gated by
│                         #   templates.default.outputSourceFiles, default on) → setu;
│                         #   templates.default.sourceLinkToComment toggles whether a
│                         #   Source: link lands on the declaration (default) or comment.
│                         #   Normalizes opts.sectionOrder + opts.menu + opts.clubSidebarItems
│                         #   → setu, and opts.aiPrompt + opts.copyPage → theme.
│                         #   Walks opts.docs (collectDocs: recursive, *.md/*.markdown/
│                         #   *.html → DocInput[] w/ POSIX rel path + raw content; the
│                         #   only place the docs tree is read) and threads docs +
│                         #   opts.docGroups + opts.defaultDocGroup → setu.
│                         #   Holds defaultTheme (OKLCH palette).
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

The prose-first counterpart is **`docs-site/`** — a dogfood site driven by
`opts.docs` + frontmatter (no `--tutorials`): `pnpm --filter
@clean-jsdoc-theme/docs-site run docs` runs the same `build:theme` → `jsdoc`
flow, emitting clean unprefixed doc slugs (`/getting-started`, `/guides/advanced`)
grouped into the `opts.docGroups` sidebar sections, with `docs/index.md` as the
home page.

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
