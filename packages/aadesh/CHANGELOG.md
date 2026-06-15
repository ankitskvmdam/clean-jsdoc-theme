# @clean-jsdoc-theme/aadesh

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

- 32a34f0: CLI: localization commands moved under `clean-jsdoc i18n`; `build` stays
  top-level.

  The localization authoring verbs are now grouped: `clean-jsdoc i18n extract`,
  `clean-jsdoc i18n prompt`, and `clean-jsdoc i18n validate`. `clean-jsdoc build`
  is unchanged — it renders your site with or without locales, so it stays a
  top-level command. All flags are identical; only the command path changed. The
  interactive menu now offers the `i18n` group + `build`, and the
  "save to package.json" feature emits the namespaced form. The top-level
  namespace is reserved for future command groups.

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- Updated dependencies [8221bc8]
- Updated dependencies [61a6b67]
- Updated dependencies [8b45c63]
- Updated dependencies [768cd9e]
- Updated dependencies [32a34f0]
- Updated dependencies [b623df9]
  - @clean-jsdoc-theme/bhasha@5.0.0
  - @clean-jsdoc-theme/utils@5.0.0
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
  - @clean-jsdoc-theme/setu@5.0.0-alpha.3
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.3

## 5.0.0-alpha.2

### Minor Changes

- Assets, theme colors, and synchronized tabs.
  - **Hashed asset pipeline + inline SVGs.** Doc/README images referenced by a relative or root-relative path are now copied into content-hashed `_assets/<name>.<hash><ext>` paths (cache-busting, like the logo and custom CSS/JS), and SVGs are inlined into the page so their `[data-theme="dark"]` styles follow the in-page theme toggle rather than only the OS color scheme. Logos gain the same content hash.
  - **`colors` / `darkColors` options.** Override the light and dark palettes per key (`bg`, `fg`, `accent`, …) from `jsdoc.json` / `typedoc.json`; previously these were silently ignored.
  - **Synchronized tabs.** Tab blocks sharing a `group` now stay in sync across a page and persist the choice (e.g. picking the TypeDoc example switches every example), with a `value` per tab as the sync key. Fixes the active-tab underline being clipped until a scroll.

### Patch Changes

- Updated dependencies
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.2
  - @clean-jsdoc-theme/setu@5.0.0-alpha.2

## 5.0.0-alpha.1

### Patch Changes

- 768cd9e: v5 alpha release to test end to end pipeline
- Updated dependencies [768cd9e]
  - @clean-jsdoc-theme/bhasha@5.0.0-alpha.1
  - @clean-jsdoc-theme/setu@5.0.0-alpha.1
