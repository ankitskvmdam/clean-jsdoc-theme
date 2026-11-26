---
'clean-jsdoc-theme': minor
'@clean-jsdoc-theme/dwar': minor
'@clean-jsdoc-theme/utils': minor
'@clean-jsdoc-theme/typedoc': minor
---

Add a `shiki` option for highlighting languages shiki doesn't bundle.

`shiki.langs` takes TextMate grammar files (`.tmLanguage.json`), and
`shiki.langAlias` maps extra fence names to a bundled or custom language. Fences
in those languages used to render as plain text.
