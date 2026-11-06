---
'@clean-jsdoc-theme/aadesh': patch
'clean-jsdoc-theme': patch
---

`clean-jsdoc build` and `extract` now pass the JSDoc/TypeDoc process's stderr
through as it runs. It used to be captured and dropped, apart from its last line
when a build failed, so the reason for a failure (a strict-mode option error, a
missing `plugins/markdown`) and the theme's option warnings were hidden.

The JSDoc theme now prints each option warning once, at the end of the build
(on stderr, after the build report, or on the way out if the build fails), like
the TypeDoc plugin. It used to print them when the options were validated and
again after the build report. A localized build runs one JSDoc process per locale,
so each warning shows once per locale.
