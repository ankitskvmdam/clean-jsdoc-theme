---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/utils': patch
---

Rebuild the cached island bundle when any package it bundles changes (#376).

The on-disk island cache (`node_modules/.cache/clean-jsdoc-theme`) was keyed
only on dwar's island entries, rang's output and the preact version. A change
in `@clean-jsdoc-theme/utils` or another bundled dependency left the old
browser code in place after an upgrade. The cache entry now records every file
the bundle was built from and is reused only while they are all unchanged.
Entries written by earlier versions are ignored.
