---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/typedoc': minor
---

The TypeDoc plugin now applies the color and custom CSS/JS options (#352).

`colors`, `darkColors`, `customCss`, `customJs`, `customCssFile`,
`customJsFile` and `hashCustomAssets` in `cleanJsdocTheme` now work as they do
under JSDoc: the palettes merge per key over the defaults, and custom files are
copied to `_assets/` and linked under `basePath`. These options no longer warn
`opts/unsupported-in-typedoc`. `progress`, `readme` and `tutorials` still do,
because TypeDoc has its own way to do each.

`colors` and `darkColors` are now recognized theme keys. A near-miss typo such
as `color` gets a "did you mean" hint, which fails the build under `strict` in
JSDoc too. A v4 `theme_opts.colors` now gets the "move it up to `opts.colors`"
hint.
