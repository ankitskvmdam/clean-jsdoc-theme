---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/rang': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/aadesh': patch
'@clean-jsdoc-theme/bhasha': patch
'@clean-jsdoc-theme/typedoc': patch
---

Build the packages with [tsdown](https://tsdown.dev) (Rolldown) instead of tsup.

No API, entry-point, or output-filename changes: every package emits the same
files with the same exports and the same type surface, and a site built with the
new toolchain is byte-identical — 671/671 emitted HTML/Markdown files, the
stylesheet, and all 61 hydration bundles match the previous output exactly.
