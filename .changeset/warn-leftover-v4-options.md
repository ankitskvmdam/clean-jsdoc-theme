---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
---

Leftover v4 options no longer pass silently. A `theme_opts` block (v5 reads options
directly from `opts`) and top-level v4 option names that v5 doesn't use
(`base_url`, `homepageTitle`, `sections`, …) now warn, each with a hint naming
the v5 replacement or saying the option was removed. With `strict: true` they are
errors that stop the build. v4 names that are still v5 options (`menu`, `favicon`,
`meta`, `footer`) aren't flagged. The TypeDoc plugin is unchanged.
