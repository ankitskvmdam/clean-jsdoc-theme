---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/utils': patch
---

Rebuild the cached island bundle when any package it bundles changes (#376).

The on-disk island cache (`node_modules/.cache/clean-jsdoc-theme`) was keyed
only on dwar's island entries, rang's output and the preact version. A change
in `@clean-jsdoc-theme/utils` or another bundled dependency left the old
browser code in place after an upgrade. The cache entry now records the
bundled `@clean-jsdoc-theme/*` files by content, each third-party package by
its version (`package.json`) and where every package import resolves, and is
reused only while all of these are unchanged. Entries written by earlier
versions are ignored.
