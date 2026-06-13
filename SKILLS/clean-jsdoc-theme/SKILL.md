---
name: clean-jsdoc-theme
description: >-
  Expert guidance for working with clean-jsdoc-theme v5 — the JSDoc/TypeDoc
  documentation theme. Use when setting up the theme, writing jsdoc.json or
  typedoc.json options, authoring docs/guides/READMEs (callouts, steps, tabs,
  embeds, custom @category/@order/@iframe tags), structuring the sidebar,
  cross-linking with {@link}/@see, tuning theming/colors/fonts, debugging a
  build, or contributing to the monorepo packages (utils, setu, rang, dwar).
---

# clean-jsdoc-theme — working skill

This skill makes you an expert at **using and extending `clean-jsdoc-theme` v5**.
Everything here is verified against the source. When a user is documenting a
JS/TS project with this theme, configuring it, authoring prose, or hacking on the
packages, follow this document over your prior assumptions about "a JSDoc theme."

> Project: <https://github.com/ankitskvmdam/clean-jsdoc-theme> ·
> npm: `clean-jsdoc-theme` (JSDoc) and `@clean-jsdoc-theme/typedoc` (TypeDoc).

---

## 1. What it actually is (mental model)

`clean-jsdoc-theme` is **not** a CSS skin on JSDoc's default template. It is a
complete documentation pipeline. JSDoc or TypeDoc is used **only to collect doc
comments**; from there the theme builds its own structured model and renders a
modern static site.

The pipeline is one-way and shared by both entry points:

```
JSDoc doclets  ─┐
                ├─▶  setu.generateSite()  ─▶  SiteManifest  ─▶  dwar.render()  ─▶  static site
TypeDoc reflns ─┘        (no I/O)                                 (pure, uses rang components)
```

What `render()` emits per build:

- `‹slug›/index.html` per page — server-rendered, with lazy-hydrated **Preact
  islands** (only the islands a page uses are shipped to it).
- `‹slug›/index.md` per content page — a **companion Markdown** of the page,
  authored to be ideal for LLMs (this is the theme's defining feature).
- `_assets/styles.‹buildId›.css` — one stylesheet (Tailwind v4, prebuilt).
- `_assets/search-index.‹buildId›.json` — fuzzy search index for the `Ctrl K`
  palette (titles, descriptions, full text, plus a deep-link entry per member).
- `_islands/‹name›.js` — one content-hashed chunk per island + a shared chunk.
- Optionally a **Pagefind** full-text index (separate post-write step).

Key guarantees worth knowing: **setu does no disk I/O** (the bridge reads files),
**dwar.render() is pure** (no `fs`, no `process.cwd`), and **one page that fails
to compile is skipped and reported, never aborts the build**.

---

## 2. Setup

The theme has two entry points. Pick the one matching the user's toolchain. The
**option names and values are identical** between them — only *where you put
them* differs: JSDoc uses `opts`, TypeDoc uses a `cleanJsdocTheme` block.

### JSDoc

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

`jsdoc.json`:

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],          // REQUIRED — see gotcha below
  opts: {
    template: "node_modules/clean-jsdoc-theme/dist",
    destination: "dist",
    recurse: true,
    readme: "./README.md",
    siteName: "My Library",               // ← theme options live under opts
  },
}
```

Build: `npx jsdoc -c jsdoc.json` → output in `dist/`. Serve with `npx serve dist`
(Pagefind needs HTTP, so opening `index.html` from disk won't load full-text
search).

> **Critical gotcha:** the `plugins/markdown` plugin is **required**. JSDoc
> renders comment Markdown → HTML *before* the theme sees it, and the theme
> consumes that HTML. Without it, descriptions arrive as raw, unformatted text.

### TypeDoc

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

`typedoc.json`:

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",
  plugin: ["@clean-jsdoc-theme/typedoc"],            // loads it
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],  // turns it on
  cleanJsdocTheme: { siteName: "My Library" },       // ← theme options live here
}
```

It registers a custom **output** (not a CSS theme extending `DefaultTheme`). Build
with `npx typedoc`.

Runnable references in the repo: `examples/basic` (JSDoc), `examples/typedoc-basic`
(TypeDoc), and `docs-site/` (a prose-first dogfood site).

---

## 3. What becomes a page

| Source | Result |
| --- | --- |
| Each container symbol — `class`, `interface`, `mixin`, `module`, `namespace` | One page, members bucketed into sections. class/interface also fold in inherited members via `@augments`/`@extends`. |
| `typedef` | Its own page (first-class — `@type`, `@property`, and function-signature `@param`/`@returns` all render). |
| Every **global-scope** symbol without its own page | Collected onto one aggregated **"Globals"** page. |
| `events`, `enums`, `constants` | Rendered as member **sections within their parent**, not standalone pages. |
| `@module`/README/tutorial/doc Markdown | Prose pages (see §6). |
| Each documented **source file** | A hidden Monaco-powered source viewer page + a "Source Files" index; each member gets a `Source: file:line` link (on by default). |

A **class page** leads with the class description (`classdesc`), then a
**Constructor** section (on every class unless `@hideconstructor`): the call
signature (`new ClassName(id, [opts])` — a parameter-less class still shows
`new ClassName()`, and an undocumented constructor recovers its param names so
`new ClassName(options)` still appears), the separately-documented constructor
description (when the class and its `constructor` have *separate* doc comments),
and the parameter table.

---

## 4. Configuration reference

All options below are identical for both tools — only the namespace differs
(`opts` for JSDoc, `cleanJsdocTheme` for TypeDoc).

> Unknown / misspelled keys only **warn** (with a "did you mean?" hint) and the
> build continues. Set `strict: true` to escalate warnings to hard errors.

### Site & identity

| Option | Type | Notes |
| --- | --- | --- |
| `siteName` | string \| logo set | Header title. Logo set: `{ light, dark, default, alt }` (URLs or local paths; dark/light swap via CSS). Defaults to the package `name`. Local logos are copied to content-hashed `_assets/`. |
| `basePath` | string | Root path prefixed onto every internal link/asset, for sub-path hosting (`/my-lib`). Default `""`. |

### Content sources

| Option | Type | Notes |
| --- | --- | --- |
| `readme` | path | Markdown rendered as the **home page** (slug `""`). A root `docs/index.md` overrides it. |
| `docs` | dir path | A directory of hand-written `.md`/`.markdown`/`.html` guides → prose pages. Folder layout drives URL + sidebar group (see §6). |
| `docGroups` | string[] | Display order of top-level **doc** groups in the sidebar. |
| `defaultDocGroup` | string | Group a doc lands in when it declares none. |
| `tutorials` | dir path | JSDoc `--tutorials` tree → guide pages under a "Tutorials" group (sub-tutorials nest). Equivalent to JSDoc's `-u`. |

### Sidebar & navigation (see §7 for the full model)

| Option | Type | Notes |
| --- | --- | --- |
| `sectionOrder` | string[] | Order of **all** top-level sections (kind labels AND doc/category groups). Listed first, rest appended. For kind labels it's also a filter — an **omitted kind label is dropped**; category/doc groups are never dropped by omission. |
| `clubSidebarItems` | boolean | Collapse related entries under a shared collapsible parent, grouped by the path segment before the first `/`. Default `false`. Applies **only** to kind-label fallback buckets, never to `@category`-built groups. |
| `menu` | entry[] | Custom links pinned above the sidebar. Each: `{ title, link (or href), id?, icon? }`. `icon` is `lucide:<name>` or `simpleicons:<name>` (CDN-loaded). When set, `menu` owns the auto Home/Source links (suppressed unless you list `{ id: "home" }` / `{ id: "source" }`). |

### Appearance & assets

| Option | Type | Notes |
| --- | --- | --- |
| `fonts` | `{ heading?, body?, mono? }` | `heading`/`body` are Google Font family names (loaded for you, existence-checked at build); `mono` is a CSS font stack. |
| `colors` | color map | Light-mode palette; merges **per key** over the built-in palette. Keys: `bg`, `bgMuted`, `fg`, `fgMuted`, `accent`, `accentFg`, `border`. Any valid CSS color (ships OKLCH). |
| `darkColors` | color map | Same keys, emitted under `[data-theme="dark"]`. Omit it and dark mode falls back to a sensible bg/fg swap. |
| `customCss` / `customJs` | string | Inline CSS/JS injected on every page. CSS loads **after** the theme stylesheet (overrides win); JS runs **last**. |
| `customCssFile` / `customJsFile` | path | Same, read from disk; copied to content-hashed `_assets/`. |
| `hashCustomAssets` | boolean | Content-hash custom-asset filenames for cache-busting. Default `true`. |

### LLM & copy-page

| Option | Type | Notes |
| --- | --- | --- |
| `copyPage` | boolean \| `{ enabled, actions }` | The per-page copy / open-in-LLM button (content pages only). `actions` ⊂ `copy`, `view`, `claude`, `chatgpt`, `perplexity`. On by default with all actions. |
| `aiPrompt` | string | Instruction prepended when a page is handed to an LLM via the open-in actions. |

### Build

| Option | Type | Notes |
| --- | --- | --- |
| `strict` | boolean | Escalate option diagnostics (bad font, unknown key) from warnings to hard errors. Default `false`. |
| `progress` | boolean | Toggle per-stage build spinners. Default `true`. |

### JSDoc-only (under `templates.default`, NOT `opts`)

```json5
templates: { default: { outputSourceFiles: false, sourceLinkToComment: true } }
```

- `outputSourceFiles` (default `true`) — generate the source-file viewer pages
  and `Source: file:line` links.
- `sourceLinkToComment` (default `false`) — land a `Source:` link on the doc
  **comment** instead of the **declaration**.

### Asset handling (automatic — no config)

Any image referenced from docs/README with a relative or root-relative path is
copied into `_assets/` under a **content-hashed** name and the ref is rewritten.
`.svg` files are **inlined** into the page so their own `[data-theme="dark"]`
styles can follow the in-page theme toggle (an `<img>` SVG can't). External
(`https://`) and `data:` URLs are left untouched.

---

## 5. Authoring rich content

All of these work in **prose** (README, tutorials, the `docs` directory). Several
also work directly inside **JSDoc/TypeDoc comment descriptions**. There is no
dedicated block tag for steps/tabs/callouts — you write the same markup in either
place and it flows through one converter.

### Callouts — GitHub-style alert blockquotes

```markdown
> [!NOTE]
> Useful information, even when skimming.
```

Four variants; markers are case-insensitive and several keywords fold onto each:

| Marker | Variant |
| --- | --- |
| `[!INFO]` `[!NOTE]` `[!IMPORTANT]` | info (blue) |
| `[!TIP]` `[!SUCCESS]` | tip (green) |
| `[!WARNING]` `[!CAUTION]` | warning (amber) |
| `[!ERROR]` `[!DANGER]` | error (red) |

The marker must be the first thing in the blockquote; it's stripped from the
body. Bodies are full Markdown and callouts promote at any depth (incl. inside
list items). A `@deprecated` doc-comment tag **auto-emits** an error callout (with
a kind-aware default sentence when no reason is given).

### Steps — numbered stepper (SSR, no JS)

```markdown
<steps>

<step label="Install">

Add the package as a dev dependency.

</step>

<step label="Build">

Run the build and open the output.

</step>

</steps>
```

`label` is optional. **Leave a blank line around each step's inner content** —
each body is re-parsed as Markdown, so blank lines are what let fenced
code/lists/nested containers parse. You can nest tabs, callouts, code, even
another `<steps>` inside a step.

### Tabs — tabbed view (SSR + a light enhancement island)

```markdown
<tabs group="pm">

<tab label="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
```

- `<tab label>` — button text (falls back to `Tab N`).
- `<tab value>` — cross-block sync key; defaults to the normalized label, so
  **identical labels sync for free**.
- `<tabs group>` — opts the block into cross-block syncing: give multiple blocks
  the same `group` and switching one switches all (persisted across visits).

Same blank-line rule as steps.

### Embeds — sandboxed iframes / live demos

Two authoring forms, **one config grammar** (`<url> key=value flag`):

Prose fence:

````markdown
```iframe
https://example.com/embed/demo title="Live demo" height=420
```
````

Source-comment block tag (requires `tags.allowUnknownTags: true`):

```js
/** @iframe https://example.com/embed/demo title="Demo" aspectRatio=16/9 */
```

- **First token = URL.** Only `https://` or protocol-relative `//` URLs are
  accepted; anything else is dropped with a warning.
- Options: `title`, `width` (CSS, default `100%`), `height` (px, default `400`),
  `aspectRatio` (e.g. `16/9`, preferred over height), `allow`, `sandbox`,
  `clickToLoad` (poster instead of live iframe), `themed`.
- `themed` is **on by default**: a `{theme}` token in the URL is swapped for
  `light`/`dark`; else an author `theme-id` param wins; else `?theme-id=<theme>`
  is appended. Opt out with `themed=false`. Both live and click-to-load work with
  no JS (`<noscript>` fallback).

### Custom doc-comment tags

All three are **unknown tags** → require `tags.allowUnknownTags: true` in
`jsdoc.json` (without it JSDoc strips them before the theme runs):

- **`@category <path> [order=N]`** — put a symbol's page in an explicit sidebar
  group. The group path is the **leading whitespace-separated tokens joined with
  a single space** (so `@category Getting Started` is one flat group named
  "Getting Started"); parsing switches to `key=value` options at the first token
  containing `=`. A literal **`/` nests** (`Core/Parsing` → Core ▸ Parsing).
  First `@category` wins.
- **`@order N`** — within-group sort key for any symbol, including a plain
  `@module`/`@class` in its kind section. When both are present,
  `@category … order=` wins over a standalone `@order`.
- **`@iframe`** — see Embeds above.

---

## 6. The docs directory & frontmatter

Point `opts.docs` at a directory. Each `.md`/`.markdown`/`.html`/`.htm` file
becomes one page; `node_modules`, `.git`, and dotfiles are skipped. The filesystem
drives the URL and sidebar group:

| Field | Derivation (first match wins) |
| --- | --- |
| `slug` | frontmatter `slug` → slugified relative path with **no prefix**; `index` → `""` |
| `title` | frontmatter `title` → humanized basename |
| `group` | frontmatter `group` → humanized **directory** path → `defaultDocGroup` |
| `order` | frontmatter `order` |
| `hidden` | frontmatter `hidden` (default `false`; hidden = rendered but kept out of the sidebar) |

So `guides/Advanced Setup.md` → `/guides/advanced-setup` in group **Guides**;
`guides/setup/install.md` → nested group **Guides/Setup**. A root `index.md` is
the home page and **overrides `readme`**.

Frontmatter is a leading `---` block of **flat `key: value` scalars only** — no
nested YAML, lists, or multi-line values. A malformed/unterminated block is
treated as no frontmatter.

```markdown
---
title: Advanced Setup
group: Guides
order: 2
slug: guides/advanced
hidden: false
---

# Advanced Setup
```

---

## 7. The sidebar model (one engine, several levers)

Every navigable entry — API symbol, guide page, tutorial — carries a **`group`
path** (the bold top-level title, optionally a `/`-nested branch) and an optional
**`order`** (within-group sort key). That single abstraction is why a guide and a
class can share a sidebar group.

Where they come from:

| Source | `group` | `order` |
| --- | --- | --- |
| API symbol | `@category`, else kind label (Classes, …) | `@category … order=`, else `@order` |
| Guide page | frontmatter `group`, else directory, else `defaultDocGroup` | frontmatter `order` |
| Tutorial | the tutorial hierarchy (`Tutorials/<parent>/…`) | resolved tree order |

The levers:

1. **`@category` / `@order`** (source tags, §5) — group and order API symbols.
2. **`/`-paths nest** — first segment = bold top-level title, deeper segments =
   collapsible branches. Works from `@category`, frontmatter `group`, or directory.
3. **Leaf-vs-branch order:** within a level, sort by effective order ascending (a
   branch's effective order = the **min `order` of any page inside it**, so
   `order=1` on one nested page floats its whole subgroup up); ties → leaves
   before branches; then first-seen. No-order entries sort last, then alphabetical.
4. **`clubSidebarItems`** — collapse kind-label buckets by the prefix before the
   first `/` in their label (`queue`, `queue/Queue` → a `queue` parent; the bare
   `queue` becomes an `index` child). Mutually exclusive with `@category` nesting.
5. **`sectionOrder`** — order the top-level sections (kind labels + group names in
   one list). Omitted kind labels are dropped; category/doc groups are appended.
6. **`docGroups` / `defaultDocGroup`** — order doc-group sections (appended after
   API sections unless also named in `sectionOrder`); fallback group for ungrouped docs.
7. **`menu`** — a top region above the sections, each with an icon.

Mixing guides interleaved with API kinds (Classes between two prose groups) needs
`sectionOrder`; `docGroups` alone always appends doc groups after API sections.

---

## 8. Cross-references & source links

- **`{@link}` / `{@linkcode}` / `{@linkplain}`** inline tags and **`@see`** block
  tags resolve to real cross-page anchors. setu builds a link registry from the
  pages it actually generates (two-pass, so forward references resolve), rewriting
  namepaths → page-slug + `#member` anchor.
- External URLs (`http(s)://`, `mailto:`) link directly (and `https://` opens in a
  new tab). Unresolved namepaths fall back to inline code (the look JSDoc text had).
- A **bare short name** (`{@link BaseEntity}`) resolves only when unambiguous
  across the whole registry — ambiguous names refuse to guess.
- Every documented member gets a `Source: file:line` link (default on) landing on
  the declaration line; the source-viewer page opens Monaco to that exact line.

---

## 9. LLM-friendliness (the theme's signature feature)

- A **companion `.md`** is emitted next to every content page (`‹slug›/index.md`)
  — the page's body as clean Markdown, authored for machine reading.
- A **copy-page split button** on content pages: copy that `.md`, view it, or open
  the page in **Claude / ChatGPT / Perplexity** (it hands over the `.md` + an
  optional `aiPrompt`, never the rendered HTML). Configurable via `copyPage`.
- The `Ctrl K` palette fetches the search index lazily and ranks across title,
  description, and full page text, with a deep-link entry per member heading.

When advising a user who cares about AI consumption: every page is already
LLM-legible by design — point assistants at the page's `index.md` companion.

---

## 10. The packages (architecture — for contributors/extenders)

A pnpm + Turborepo monorepo. Most users never touch these, but each is published
to npm and reusable.

| Package | Role |
| --- | --- |
| `@clean-jsdoc-theme/utils` | Shared types, Zod schemas, the `SiteManifest` contract, slug rules, and **pure** opts-validation + build-report logic (network/zlib injected so it stays browser-safe). The setu↔dwar boundary lives here once. |
| `@clean-jsdoc-theme/setu` | JSDoc doclets → `SiteManifest`. Emits MDX/Markdown only, **no HTML, no I/O**. Owns page generation, nav assembly, link resolution. |
| `@clean-jsdoc-theme/rang` | Preact component library — SSR chrome, hydratable islands, the MDX element map, the island registry. **Owns every byte of page-shell HTML.** Tailwind utility classes over CSS variables. |
| `@clean-jsdoc-theme/dwar` | `SiteManifest` → HTML/CSS/JS. A **pure** renderer: SSR pages, esbuild island bundle, CSS, separate Pagefind step. Consumes only the manifest; never re-reads doclets. |
| `clean-jsdoc-theme` | The JSDoc theme entry — a thin CJS bridge (`publish()`) that does the file I/O and wires setu → dwar. |
| `@clean-jsdoc-theme/typedoc` | The TypeDoc plugin — adapts reflections → doclets → the same setu → dwar core. ESM. |
| `aadesh` / `bhasha` | Reserved stubs (CLI / i18n), v5.1+. |

Boundary guarantees (don't violate when editing): **setu never imports dwar or
rang** (one-way), **dwar.render() is pure** (the only disk touch is Pagefind),
**dwar never re-reads doclets**, **slug rules and the boundary contract live once
in utils**, and **chrome markup lives once in rang** (dwar's `SsrLayout` only wraps
islands in `data-island` markers and fills rang's `Layout` slots).

The 13 islands: `sidebar`, `mobile-nav`, `toc`, `toc-mobile`, `cmdk`, `code-tabs`,
`copy-btn`, `copy-page`, `theme-toggle`, `settings`, `code-viewer`, `embed`,
`tabs`. Each renders meaningful SSR HTML first, then progressively enhances.

**Build commands:**

```sh
pnpm install
pnpm build        # tsup per package (dwar compiles its Tailwind CSS first)
pnpm build:docs   # generate every site (docs-site + examples)
pnpm test         # vitest across utils / setu / rang / dwar
pnpm typecheck
pnpm lint
```

`examples/*` and `docs-site` consume the theme's **built `dist`**, so their `docs`
script runs `build:theme` (turbo) first to rebuild the upstream graph. The
canonical architecture doc is [`docs/ARCHITECTURE.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs/ARCHITECTURE.md).

---

## 11. Common gotchas & troubleshooting

- **Descriptions render as raw text / Markdown not formatting (JSDoc):** you're
  missing `plugins: ["plugins/markdown"]`. It's required.
- **`@category` / `@order` / `@iframe` do nothing:** set
  `tags.allowUnknownTags: true` in `jsdoc.json`. JSDoc strips unknown tags otherwise.
- **A step's/tab's code block or list renders flat:** add **blank lines** around
  the inner content — each body is re-parsed as Markdown.
- **`@category Getting Started` made two nested groups:** spaces don't nest, only
  `/` does. `Getting Started` is one flat group whose name contains a space. Use
  `Core/Parsing` to nest.
- **A guide group appears after Classes/Modules even though I listed it first:**
  `docGroups` always appends doc groups after API sections — use `sectionOrder` to
  interleave.
- **Full-text search empty when opening `index.html` from disk:** Pagefind needs
  HTTP. Serve the folder (`npx serve dist`).
- **An embed didn't appear:** the URL must be `https://` or protocol-relative
  `//`. `http://` and relative paths are dropped (with a warning).
- **A page silently missing:** a page that fails to MDX-compile is skipped and
  reported in `RenderResult.errors` (the bridge logs it) — check the build output;
  it never aborts the whole build.
- **A bad font name or unknown option only warned:** that's the default
  (resilient). Use `strict: true` to fail the build instead.
- **A doc's slug collides with an API/home/tutorial slug:** the doc is skipped and
  logged (kind precedence: module > namespace > class > interface > mixin > typedef).

---

## 12. Quick reference

```jsonc
// JSDoc: opts.* | TypeDoc: cleanJsdocTheme.*  (identical values)
{
  siteName, basePath,
  readme, docs, docGroups, defaultDocGroup, tutorials,
  sectionOrder, clubSidebarItems, menu,
  fonts, colors, darkColors,
  customCss, customJs, customCssFile, customJsFile, hashCustomAssets,
  copyPage, aiPrompt,
  strict, progress
}
// JSDoc-only, under templates.default.*:
//   outputSourceFiles, sourceLinkToComment
```

Authoring cheat sheet:

- Callout: `> [!TIP]` / `[!NOTE]` / `[!WARNING]` / `[!ERROR]` (+ aliases).
- Steps: `<steps><step label="…">…blank-line-wrapped body…</step></steps>`.
- Tabs: `<tabs group="x"><tab label="…" value="…">…</tab></tabs>`.
- Embed: ` ```iframe ` fence or `@iframe <https-url> key=value`.
- Sidebar: `@category Core/Parsing order=1`, `@order N`, frontmatter `group`/`order`.
- Cross-link: `{@link Symbol}`, `{@linkcode Symbol}`, `@see {@link Other}`.
