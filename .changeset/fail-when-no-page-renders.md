---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/typedoc': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/utils': patch
---

Fail the build when no page could be rendered (#401).

A build where every page failed used to exit 0 and replace the site with one
that had no pages. It now stops with one error (failure count plus the first
failure), exits non-zero, and leaves the output directory untouched. A build
where only some pages fail still skips them with a warning.
