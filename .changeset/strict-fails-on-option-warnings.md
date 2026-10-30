---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/typedoc': patch
'@clean-jsdoc-theme/utils': patch
---

**`strict: true` now fails on option warnings, as documented — existing strict
builds may start failing.** Before, `strict` only failed on option errors, so a
misspelled key, an unusable `siteUrl`, or an unreadable `footer` / `favicon` /
logo / custom file was reported and the build carried on. Now every option
warning is an error under `strict`, and the build stops before writing anything.
The exceptions are a top-level v4 option name under JSDoc (see the v4-options
change) and, under TypeDoc, JSDoc-only options and the `siteUrl` override of
`hostedBaseUrl` (see the TypeDoc change). Content warnings, such as an unbalanced
backtick, are not affected.

A failed JSDoc build now exits non-zero. JSDoc 4 printed a thrown theme error as
`Unhandled rejection …` and still exited 0, so CI (and `clean-jsdoc build`, which
checks each locale's exit code) couldn't see a strict failure, a missing
`plugins/markdown`, or a bad build spec. The error is now reported once through
JSDoc's logger and the process exits 1. TypeDoc already exited non-zero.

`customCssFile` / `customJsFile` entries that aren't local paths (a URL, or a v4
`{ href, integrity }` object) now warn and are skipped instead of being dropped
silently.
