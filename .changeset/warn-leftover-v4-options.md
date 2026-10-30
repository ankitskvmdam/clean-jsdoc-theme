---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
---

Leftover v4 options no longer pass silently. A `theme_opts` block (v5 reads options
directly from `opts`) and top-level v4 option names that v5 doesn't use
(`base_url`, `homepageTitle`, `sections`, …) now warn, each with a hint naming
the v5 replacement or saying the option was removed. v4 names that are still v5
options (`menu`, `favicon`, `meta`, `footer`) aren't flagged.

Under `strict: true`, the `theme_opts` block and every key in it are errors that
fail the build. Top-level v4 names stay warnings even under `strict`, because
another JSDoc plugin may own an `opts.title` or `opts.search`. The TypeDoc plugin
never had v4 options and doesn't run this check.
