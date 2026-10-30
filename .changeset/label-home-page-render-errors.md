---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/typedoc': patch
---

Label the home page in the failed-page and content-warning reports.

When the home page (README or root `index.md`) failed to render or raised a
content warning, the build log listed it with a blank label (`-  (line 8:2): …`)
because its slug is empty. It is now shown as `(home page)`. Other pages keep
their slug as the label.

The warning for a doc page skipped because its slug is empty (it would shadow
the home page) now names the page by its title instead of printing `slug ""`.
