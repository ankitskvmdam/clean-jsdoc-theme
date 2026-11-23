---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/typedoc': patch
---

Content-hash the TypeDoc favicon (#418).

The TypeDoc bridge copied the favicon to a fixed `_assets/favicon.<ext>`, so a
changed icon could stay cached. It is now written as
`_assets/<name>.<hash>.<ext>`, the same content-hashed name the JSDoc bridge
uses, and the `<link rel="icon">` points at it (with `basePath` applied once).
