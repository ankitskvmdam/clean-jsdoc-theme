# @clean-jsdoc-theme/rang

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
  - @clean-jsdoc-theme/bhasha@5.0.2

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
  - @clean-jsdoc-theme/bhasha@5.0.1

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

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- 3c6fc7c: Fixes & polish:
  - **Per-locale saved searches.** The command palette's recent + favorite
    searches are now scoped to the active locale (keyed off `<html lang>`), so
    switching language no longer wipes or overwrites the lists — each language
    keeps its own.
  - **Sidebar scrollbar no longer overlaps the nav labels** — the scrollable
    sidebar reserves a stable gutter and a small right padding.
  - **npm link** added to the docs-site chrome (a `menu` entry).

- Updated dependencies [8221bc8]
- Updated dependencies [61a6b67]
- Updated dependencies [8b45c63]
- Updated dependencies [768cd9e]
- Updated dependencies [32a34f0]
- Updated dependencies [b623df9]
  - @clean-jsdoc-theme/bhasha@5.0.0
  - @clean-jsdoc-theme/utils@5.0.0

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
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.4

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

## 5.0.0-alpha.2

### Minor Changes

- Assets, theme colors, and synchronized tabs.
  - **Hashed asset pipeline + inline SVGs.** Doc/README images referenced by a relative or root-relative path are now copied into content-hashed `_assets/<name>.<hash><ext>` paths (cache-busting, like the logo and custom CSS/JS), and SVGs are inlined into the page so their `[data-theme="dark"]` styles follow the in-page theme toggle rather than only the OS color scheme. Logos gain the same content hash.
  - **`colors` / `darkColors` options.** Override the light and dark palettes per key (`bg`, `fg`, `accent`, …) from `jsdoc.json` / `typedoc.json`; previously these were silently ignored.
  - **Synchronized tabs.** Tab blocks sharing a `group` now stay in sync across a page and persist the choice (e.g. picking the TypeDoc example switches every example), with a `value` per tab as the sync key. Fixes the active-tab underline being clipped until a scroll.

### Patch Changes

- Updated dependencies
  - @clean-jsdoc-theme/utils@5.0.0-alpha.2

## 5.0.0-alpha.1

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- Updated dependencies [768cd9e]
  - @clean-jsdoc-theme/utils@5.0.0-alpha.1
