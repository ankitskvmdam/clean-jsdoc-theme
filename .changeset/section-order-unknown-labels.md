---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
---

Warn when a `sectionOrder` label matches no sidebar section (#352).

A label that is not a built-in kind label, nor a `@category` or doc group in the
build, is reported with a "did you mean" hint when one is close
(`Clases` → `Classes`). Built-in labels with no pages (such as `Events`) and v4's
`Global` are accepted. The check runs under JSDoc only; `sectionOrder` has no
effect under TypeDoc. With `strict`, the warning fails the build, so a project
that sets `strict` and lists a stale label now fails until the label is fixed.
