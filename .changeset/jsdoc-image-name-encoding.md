---
'clean-jsdoc-theme': patch
---

Percent-encode local image file names in `_assets/` srcs (#396).

An image whose file name has a space, `(`, `)`, `'`, `#` or `?` got a src with
the raw character, which is not a valid Markdown destination and broke the image
in the page and its `.md` companion. The src is now percent-encoded (the file
keeps its real name on disk), and a `%20`-style reference such as
`![Pic](./my%20pic.png)` now resolves to the file `my pic.png`.
