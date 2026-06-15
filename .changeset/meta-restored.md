---
'clean-jsdoc-theme': minor
'@clean-jsdoc-theme/utils': minor
'@clean-jsdoc-theme/dwar': minor
'@clean-jsdoc-theme/typedoc': minor
---

Custom `<meta>` injection restored (`opts.meta`).

v4's custom `<meta>` tags are back as `opts.meta` — an array of attribute maps
(`{ name, content }`, `{ property, content }`, `{ charset }`, …), each rendered
as a `<meta>` tag in every page's `<head>`. dwar emits its own defaults
(charset, viewport, the auto description) first, then the author entries,
de-duping by identifying attribute (`name` / `property` / `http-equiv` /
`charset`) so an author `description` replaces the auto one. Values are escaped
and invalid attribute names dropped; `render()` does no I/O for it.
