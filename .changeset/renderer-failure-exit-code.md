---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
---

Say which step failed when esbuild cannot bundle the interactive components (#371).

A build whose esbuild binary is missing or cannot start already exits non-zero
(JSDoc: 1, TypeDoc: its output-error code) and writes no site. The error now
names the island bundle step and suggests reinstalling dependencies, instead of
a bare `spawn UNKNOWN` or `The service was stopped`. Under JSDoc's `--debug` or
`--verbose` the underlying esbuild error is printed too. End-to-end tests now
cover this for both the JSDoc template and the TypeDoc plugin.
