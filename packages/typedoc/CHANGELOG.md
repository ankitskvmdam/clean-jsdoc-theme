# @clean-jsdoc-theme/typedoc

## 5.1.1

### Patch Changes

- 2abaafa: Add a **`scrollbar`** option (`"styled"` | `"visible"` | `"native"`) to control scrollbar presentation. The default `"styled"` keeps the current overlay bar (invisible at rest); `"visible"` keeps the themed bar always shown; `"native"` disables all scrollbar styling and uses the browser's own scrollbar. Fixes #281.
- Updated dependencies [2abaafa]
  - @clean-jsdoc-theme/utils@5.1.1
  - @clean-jsdoc-theme/dwar@5.1.1
  - @clean-jsdoc-theme/setu@5.1.1

## 5.1.0

### Minor Changes

- d3082d7: Add **`collapsibleSidebarSections`** — top-level sidebar section headers (Namespaces, Classes, Interfaces, `@category` groups, doc groups, Tutorials, …) can now be collapsed. It accepts `true` / absent (all sections collapsible — the default), `false` (none), or an array of exact, case-sensitive section labels (only those). Sections default open, and a visitor's collapsed state persists in `localStorage`. A label in the array that matches no rendered section prints a build warning listing the available section labels. Works for both the JSDoc template and the TypeDoc plugin. (Closes #343.)

  **Heads-up — visible default change:** with no configuration, every top-level sidebar section header now renders as a collapse toggle (still expanded by default, so nothing is hidden on load). Pass `"collapsibleSidebarSections": false` to restore the previous always-static headers.

### Patch Changes

- 8fc6dd1: Footer: the repository link now **underlines on hover** instead of changing color. It keeps its `text-muted-foreground` color and adds `hover:underline` (was `hover:text-accent`).
- Updated dependencies [d3082d7]
- Updated dependencies [8fc6dd1]
  - @clean-jsdoc-theme/utils@5.1.0
  - @clean-jsdoc-theme/setu@5.1.0
  - @clean-jsdoc-theme/dwar@5.1.0

## 5.0.8

### Patch Changes

- ce160bc: Stamp the theme version into every generated page as `<meta name="generator" content="clean-jsdoc-theme <version>" />`, so a built site records which version produced it (useful for bug-report triage). Emitted by default in both the JSDoc and TypeDoc flavors; an author `meta` entry with `name: "generator"` overrides it.
- 4c687c6: Fix `Cannot read properties of undefined (reading 'context')` that made every page fail to render under Yarn Berry (PnP), producing an empty `dist`.

  `preact` was a direct dependency of the internal packages that create and consume Preact contexts, so under Yarn PnP's strict resolution the server-rendered component tree and `preact-render-to-string` could bind to different Preact instances — leaving Preact's internal `currentComponent` unset and throwing on the first `useContext` of every page. `preact` is now a `peerDependency` of the internal packages (`rang`, `dwar`, `bhasha`, `setu`) and a direct dependency of the installable entry points (`clean-jsdoc-theme`, `@clean-jsdoc-theme/typedoc`, `@clean-jsdoc-theme/aadesh`), so a single Preact instance is shared regardless of package manager.

- Updated dependencies [ce160bc]
- Updated dependencies [4c687c6]
  - @clean-jsdoc-theme/dwar@5.0.8
  - @clean-jsdoc-theme/setu@5.0.8
  - @clean-jsdoc-theme/utils@5.0.8

## 5.0.7

### Patch Changes

- Patch release: dependency security updates, a TypeDoc doc/behavior cleanup, and standalone package READMEs.
  - **Security / dependencies** — bump `esbuild` (dwar) to `^0.28.1` and refresh the build/test toolchain (`happy-dom`, `vitest`, `vite`, `turbo`), plus transitive overrides (`markdown-it`, `linkify-it`, `shell-quote`, `fast-uri`, `brace-expansion`, `js-yaml`) to clear all open Socket/Dependabot advisories.
  - **setu / typedoc** — remove the inert `sectionOrder` / `clubSidebarItems` handling under the TypeDoc flavor. Under TypeDoc the module hierarchy owns the API sidebar and doc groups order via `docGroups`; these options were accepted but had no effect, so the dead threading is gone. No behavior change.
  - **Docs** — correct the TypeDoc sidebar-lever documentation (getting-started, structure-your-sidebar, configuration) and make the `clean-jsdoc-theme` and `@clean-jsdoc-theme/typedoc` package READMEs standalone, each centered on its own toolchain.

- Updated dependencies
  - @clean-jsdoc-theme/setu@5.0.7
  - @clean-jsdoc-theme/dwar@5.0.7
  - @clean-jsdoc-theme/utils@5.0.7

## 5.0.6

### Patch Changes

- TypeDoc output parity with TypeDoc's default theme. **TypeDoc flavor only — JSDoc output is unchanged (byte-identical).**
  - **Sidebar** now mirrors TypeDoc's default theme: a module/folder hierarchy (folders from your source directory structure, single-child folders merged, clickable + expandable module nodes, members nested and ordered by kind) instead of the global kind buckets. Under the TypeDoc flavor the module hierarchy owns the API sidebar, so `@category` / `@group` / `@order` / `sectionOrder` / `clubSidebarItems` no longer shape it (they continue to work for the JSDoc template; doc groups, `menu`, and tutorials still apply for both).
  - **Inheritance & relationships** on class/interface pages: `Hierarchy`, `Implements`, and `Implemented By` sections, plus `Inherited from` / `Overrides` / `Implementation of` member captions.
  - **`@group`** tag recognized; **`@inheritDoc`** resolved; native TypeDoc **`projectDocuments`** rendered as pages; **async** modifier badge; inline **object-literal types** expanded into linked property tables.

  Docs updated for all of the above in English, Hindi, Japanese, and Chinese.

- Updated dependencies
  - @clean-jsdoc-theme/setu@5.0.6
  - @clean-jsdoc-theme/utils@5.0.6
  - @clean-jsdoc-theme/dwar@5.0.6

## 5.0.5

### Patch Changes

- @clean-jsdoc-theme/utils@5.0.5
- @clean-jsdoc-theme/setu@5.0.5
- @clean-jsdoc-theme/dwar@5.0.5

## 5.0.4

### Patch Changes

- @clean-jsdoc-theme/utils@5.0.4
- @clean-jsdoc-theme/setu@5.0.4
- @clean-jsdoc-theme/dwar@5.0.4

## 5.0.3

### Patch Changes

- @clean-jsdoc-theme/utils@5.0.3
- @clean-jsdoc-theme/setu@5.0.3
- @clean-jsdoc-theme/dwar@5.0.3

## 5.0.2

### Patch Changes

- cbf2da2: Mobile header fix and restored `target`/`class` menu options.
  - **Search + language switcher now stay visible on mobile.** The header search
    trigger was wrapped in a `hidden … md:flex` desktop-only container, so the
    search icon disappeared below the `md` breakpoint. Search (and the
    always-present language switcher) are pulled out of that wrapper so both stay
    visible on every breakpoint; theme/settings remain desktop-only since the
    mobile nav drawer already hosts them.
  - **`target` and `class` are back on menu entries.** Both options were dropped
    from the v5 menu object and are now re-introduced as optional fields, threaded
    through the whole pipeline (opts schema, setu, the JSDoc + TypeDoc bridges, and
    rang's sidebar). `target` overrides the link target (external links still
    default to `_blank`, and the `noopener` rel is dropped when the target isn't
    `_blank`); `class` is merged onto the rendered link. Both apply to external and
    built-in/internal entries and are omitted when unset, so existing menus stay
    byte-identical.

- Updated dependencies [cbf2da2]
  - @clean-jsdoc-theme/utils@5.0.2
  - @clean-jsdoc-theme/setu@5.0.2
  - @clean-jsdoc-theme/dwar@5.0.2

## 5.0.1

### Patch Changes

- 746b91d: Code playgrounds, a favicon option, and a refreshed code block.
  - **Playgrounds (#329).** Open an `@example` (or a code fence) in **CodePen**,
    **JSFiddle**, or **CodeSandbox**, prefilled — bringing back and generalizing
    v4's `codepen` feature. A code block's header gains an "Open Code in" dropdown;
    it's fully client-side (form POST / parameterized link — no backend, no API
    key). Configure with `opts.playground` (`enableForAllExamples`, `providers`,
    and site-wide per-provider options) and the `@playground` block tag (provider
    selection, `none`/`off`, plus `filename=` and `highlight=` for the rendered
    block). Works in prose too — a ` ```js playground ` fence or a `<playground>`
    container — and through both the JSDoc and TypeDoc bridges.
  - **Favicon.** New `favicon` option — a path to an image the theme copies to a
    content-hashed asset and links as `<link rel="icon">` (with the right `type`).
    Restores the v4 option v5 had dropped, and is the way to ship an SVG favicon
    (browsers auto-discover only a root `favicon.ico`).
  - **Refreshed code block.** Each block now has a header bar (a `CODE`/filename
    label plus copy and the playground dropdown), per-line highlighting, and
    configurable code-chrome colors (`codeHeaderBg` / `codeHeaderFg` /
    `codeHighlightBg` under `colors` / `darkColors`) that stay legible in light and
    dark.

- Updated dependencies [746b91d]
  - @clean-jsdoc-theme/utils@5.0.1
  - @clean-jsdoc-theme/setu@5.0.1
  - @clean-jsdoc-theme/dwar@5.0.1

## 5.0.0

### Minor Changes

- 8221bc8: Assets, theme colors, and synchronized tabs.
  - **Hashed asset pipeline + inline SVGs.** Doc/README images referenced by a relative or root-relative path are now copied into content-hashed `_assets/<name>.<hash><ext>` paths (cache-busting, like the logo and custom CSS/JS), and SVGs are inlined into the page so their `[data-theme="dark"]` styles follow the in-page theme toggle rather than only the OS color scheme. Logos gain the same content hash.
  - **`colors` / `darkColors` options.** Override the light and dark palettes per key (`bg`, `fg`, `accent`, …) from `jsdoc.json` / `typedoc.json`; previously these were silently ignored.
  - **Synchronized tabs.** Tab blocks sharing a `group` now stay in sync across a page and persist the choice (e.g. picking the TypeDoc example switches every example), with a `value` per tab as the sync key. Fixes the active-tab underline being clipped until a scroll.

- 61a6b67: Command palette, callouts, tutorials, and a rebuilt documentation site.
  - **Command palette — recent & favorite searches.** `Ctrl K` now remembers recent
    queries and lets you star favorites (persisted locally). The palette was
    refactored into focused components.
  - **Tutorials nest in the sidebar.** Sub-tutorials render as collapsible groups
    mirroring JSDoc's resolved hierarchy (#253), and `@tutorial` resolves to its
    page through a shared cross-reference resolver.
  - **Callouts everywhere.** Every blockquote renders as a callout (defaulting to
    `info`), and GitHub-style alert blockquotes nested inside lists are promoted
    too.
  - **Rendering fixes.** Anchor jumps land below the sticky header on small
    screens; Home is included in the prev/next reading order (source & menu links
    excluded); grouped badge images no longer add vertical margin; the island
    bundle cache busts when `rang` changes; and the build spinner stays alive
    during long synchronous stages.
  - **Documentation.** A rebuilt docs site — getting-started, guides, authoring
    (callouts / steps / tabs / embeds / custom tags), an FAQ, and per-package
    pages — plus refreshed package READMEs with a theme-aware logo.

- 8b45c63: Localization (i18n), prompt-to-file, Unicode anchors, and polish.
  - **Multi-language documentation.** A new localization pipeline renders one static
    site per locale (the default unprefixed, others under `/<locale>`) with a header
    language switcher, `hreflang` alternates, and per-language fonts. Two new
    packages drive it: **`@clean-jsdoc-theme/bhasha`** (the pure, browser-safe i18n
    core — chrome catalog, the `t` translator + fallback chain, `LanguageProvider`,
    and the API-slot key/hash scheme) and **`@clean-jsdoc-theme/aadesh`** (the
    `clean-jsdoc` CLI: `extract` / `prompt` / `validate` / `build`, plus an
    interactive menu). Translatable content spans UI chrome, API
    descriptions/summaries/example captions/parameter + return descriptions, and
    prose (a per-locale `README.<locale>.md` home and a `docs.<locale>/` overlay).
    Opt in with `opts.locales` / `opts.defaultLocale`; a build with no locales stays
    byte-identical. The TypeDoc bridge supports _extract_ today; the localized
    _build_ is JSDoc-only for now.
  - **`clean-jsdoc prompt` writes files.** The LLM translation prompt is now written
    to Markdown files under `clean-jsdoc-theme-artifacts/locales/prompts/` (chunked,
    git-ignored, regenerated each run) instead of being dumped to the console — so
    you can paste or upload each file straight into an LLM.
  - **Unicode-aware heading anchors.** `slugifyHeading` / `slugifyPath` /
    `slugifySourcePath` now keep non-ASCII letters (and recompose to NFC), so Hindi,
    Japanese, and CJK headings get meaningful anchors, a working TOC, and valid
    `#fragment` links. Latin accent folding (`café → cafe`) is preserved.
  - **Sidebar TOC fix.** The active TOC entry is scrolled into view on long tables
    of contents.
  - **Maintenance.** Package version constants are derived from `package.json` at
    build time (no more drift), and the package READMEs were refreshed to match the
    current code.

- 32a34f0: Custom footer restored (`opts.footer`).

  v4's custom footer is back as `opts.footer`, accepting an inline HTML string or
  `{ file: "./footer.html" }`. The bridge resolves the union (reading the file
  form from disk) and threads the resolved string to `ThemeConfig.footer`, so the
  setu→dwar boundary stays a plain string and `render()` stays pure. rang's footer
  slot renders the author HTML verbatim in place of the default footer; style it
  with `customCss` / `customCssFile`.

- b623df9: Custom `<meta>` injection restored (`opts.meta`).

  v4's custom `<meta>` tags are back as `opts.meta` — an array of attribute maps
  (`{ name, content }`, `{ property, content }`, `{ charset }`, …), each rendered
  as a `<meta>` tag in every page's `<head>`. dwar emits its own defaults
  (charset, viewport, the auto description) first, then the author entries,
  de-duping by identifying attribute (`name` / `property` / `http-equiv` /
  `charset`) so an author `description` replaces the auto one. Values are escaped
  and invalid attribute names dropped; `render()` does no I/O for it.

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- Updated dependencies [8221bc8]
- Updated dependencies [61a6b67]
- Updated dependencies [8b45c63]
- Updated dependencies [768cd9e]
- Updated dependencies [32a34f0]
- Updated dependencies [b623df9]
  - @clean-jsdoc-theme/utils@5.0.0
  - @clean-jsdoc-theme/dwar@5.0.0
  - @clean-jsdoc-theme/setu@5.0.0

## 5.0.0-alpha.4

### Minor Changes

- Localization (i18n), prompt-to-file, Unicode anchors, and polish.
  - **Multi-language documentation.** A new localization pipeline renders one static
    site per locale (the default unprefixed, others under `/<locale>`) with a header
    language switcher, `hreflang` alternates, and per-language fonts. Two new
    packages drive it: **`@clean-jsdoc-theme/bhasha`** (the pure, browser-safe i18n
    core — chrome catalog, the `t` translator + fallback chain, `LanguageProvider`,
    and the API-slot key/hash scheme) and **`@clean-jsdoc-theme/aadesh`** (the
    `clean-jsdoc` CLI: `extract` / `prompt` / `validate` / `build`, plus an
    interactive menu). Translatable content spans UI chrome, API
    descriptions/summaries/example captions/parameter + return descriptions, and
    prose (a per-locale `README.<locale>.md` home and a `docs.<locale>/` overlay).
    Opt in with `opts.locales` / `opts.defaultLocale`; a build with no locales stays
    byte-identical. The TypeDoc bridge supports _extract_ today; the localized
    _build_ is JSDoc-only for now.
  - **`clean-jsdoc prompt` writes files.** The LLM translation prompt is now written
    to Markdown files under `clean-jsdoc-theme-artifacts/locales/prompts/` (chunked,
    git-ignored, regenerated each run) instead of being dumped to the console — so
    you can paste or upload each file straight into an LLM.
  - **Unicode-aware heading anchors.** `slugifyHeading` / `slugifyPath` /
    `slugifySourcePath` now keep non-ASCII letters (and recompose to NFC), so Hindi,
    Japanese, and CJK headings get meaningful anchors, a working TOC, and valid
    `#fragment` links. Latin accent folding (`café → cafe`) is preserved.
  - **Sidebar TOC fix.** The active TOC entry is scrolled into view on long tables
    of contents.
  - **Maintenance.** Package version constants are derived from `package.json` at
    build time (no more drift), and the package READMEs were refreshed to match the
    current code.

### Patch Changes

- Updated dependencies
  - @clean-jsdoc-theme/utils@5.0.0-alpha.4
  - @clean-jsdoc-theme/setu@5.0.0-alpha.4
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.4

## 5.0.0-alpha.3

### Minor Changes

- 61a6b67: Command palette, callouts, tutorials, and a rebuilt documentation site.
  - **Command palette — recent & favorite searches.** `Ctrl K` now remembers recent
    queries and lets you star favorites (persisted locally). The palette was
    refactored into focused components.
  - **Tutorials nest in the sidebar.** Sub-tutorials render as collapsible groups
    mirroring JSDoc's resolved hierarchy (#253), and `@tutorial` resolves to its
    page through a shared cross-reference resolver.
  - **Callouts everywhere.** Every blockquote renders as a callout (defaulting to
    `info`), and GitHub-style alert blockquotes nested inside lists are promoted
    too.
  - **Rendering fixes.** Anchor jumps land below the sticky header on small
    screens; Home is included in the prev/next reading order (source & menu links
    excluded); grouped badge images no longer add vertical margin; the island
    bundle cache busts when `rang` changes; and the build spinner stays alive
    during long synchronous stages.
  - **Documentation.** A rebuilt docs site — getting-started, guides, authoring
    (callouts / steps / tabs / embeds / custom tags), an FAQ, and per-package
    pages — plus refreshed package READMEs with a theme-aware logo.

### Patch Changes

- Updated dependencies [61a6b67]
  - @clean-jsdoc-theme/utils@5.0.0-alpha.3
  - @clean-jsdoc-theme/setu@5.0.0-alpha.3
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.3

## 5.0.0-alpha.2

### Minor Changes

- Assets, theme colors, and synchronized tabs.
  - **Hashed asset pipeline + inline SVGs.** Doc/README images referenced by a relative or root-relative path are now copied into content-hashed `_assets/<name>.<hash><ext>` paths (cache-busting, like the logo and custom CSS/JS), and SVGs are inlined into the page so their `[data-theme="dark"]` styles follow the in-page theme toggle rather than only the OS color scheme. Logos gain the same content hash.
  - **`colors` / `darkColors` options.** Override the light and dark palettes per key (`bg`, `fg`, `accent`, …) from `jsdoc.json` / `typedoc.json`; previously these were silently ignored.
  - **Synchronized tabs.** Tab blocks sharing a `group` now stay in sync across a page and persist the choice (e.g. picking the TypeDoc example switches every example), with a `value` per tab as the sync key. Fixes the active-tab underline being clipped until a scroll.

### Patch Changes

- Updated dependencies
  - @clean-jsdoc-theme/utils@5.0.0-alpha.2
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.2
  - @clean-jsdoc-theme/setu@5.0.0-alpha.2

## 5.0.0-alpha.1

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- Updated dependencies [768cd9e]
  - @clean-jsdoc-theme/utils@5.0.0-alpha.1
  - @clean-jsdoc-theme/dwar@5.0.0-alpha.1
  - @clean-jsdoc-theme/setu@5.0.0-alpha.1
