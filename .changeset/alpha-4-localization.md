---
'clean-jsdoc-theme': minor
'@clean-jsdoc-theme/utils': minor
'@clean-jsdoc-theme/setu': minor
'@clean-jsdoc-theme/rang': minor
'@clean-jsdoc-theme/dwar': minor
'@clean-jsdoc-theme/aadesh': minor
'@clean-jsdoc-theme/bhasha': minor
'@clean-jsdoc-theme/typedoc': minor
---

Localization (i18n), prompt-to-file, Unicode anchors, and polish.

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
  byte-identical. The TypeDoc bridge supports *extract* today; the localized
  *build* is JSDoc-only for now.
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
