---
'clean-jsdoc-theme': minor
'@clean-jsdoc-theme/typedoc': minor
'@clean-jsdoc-theme/aadesh': minor
'@clean-jsdoc-theme/bhasha': minor
'@clean-jsdoc-theme/utils': minor
'@clean-jsdoc-theme/dwar': minor
'@clean-jsdoc-theme/rang': minor
'@clean-jsdoc-theme/setu': minor
---

Assets, theme colors, and synchronized tabs.

- **Hashed asset pipeline + inline SVGs.** Doc/README images referenced by a relative or root-relative path are now copied into content-hashed `_assets/<name>.<hash><ext>` paths (cache-busting, like the logo and custom CSS/JS), and SVGs are inlined into the page so their `[data-theme="dark"]` styles follow the in-page theme toggle rather than only the OS color scheme. Logos gain the same content hash.
- **`colors` / `darkColors` options.** Override the light and dark palettes per key (`bg`, `fg`, `accent`, …) from `jsdoc.json` / `typedoc.json`; previously these were silently ignored.
- **Synchronized tabs.** Tab blocks sharing a `group` now stay in sync across a page and persist the choice (e.g. picking the TypeDoc example switches every example), with a `value` per tab as the sync key. Fixes the active-tab underline being clipped until a scroll.
