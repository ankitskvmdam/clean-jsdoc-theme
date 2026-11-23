---
'clean-jsdoc-theme': patch
---

Remove the unused `templates.default.strict` lookup (#368).

JSDoc never passes the `templates` block to the theme's options, so a
`"templates": { "default": { "strict": true } }` config was never strict. Set
`opts.strict: true` to make option problems fail the build.
