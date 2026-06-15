---
'clean-jsdoc-theme': minor
'@clean-jsdoc-theme/utils': minor
'@clean-jsdoc-theme/rang': minor
'@clean-jsdoc-theme/dwar': minor
'@clean-jsdoc-theme/typedoc': minor
---

Custom footer restored (`opts.footer`).

v4's custom footer is back as `opts.footer`, accepting an inline HTML string or
`{ file: "./footer.html" }`. The bridge resolves the union (reading the file
form from disk) and threads the resolved string to `ThemeConfig.footer`, so the
setu→dwar boundary stays a plain string and `render()` stays pure. rang's footer
slot renders the author HTML verbatim in place of the default footer; style it
with `customCss` / `customCssFile`.
