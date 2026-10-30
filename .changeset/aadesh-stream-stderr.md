---
'@clean-jsdoc-theme/aadesh': patch
---

`clean-jsdoc build` and `extract` now pass the JSDoc/TypeDoc process's stderr
through as it runs. It used to be captured and dropped, apart from its last line
when a build failed, so the reason for a failure (a strict-mode option error, a
missing `plugins/markdown`) and the theme's option warnings were hidden.
