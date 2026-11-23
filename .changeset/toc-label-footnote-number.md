---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Keep footnote numbers out of "On this page" labels and heading search titles (#357).

`## Intro[^1]` was listed as `Intro1`. The label is now `Intro`; the anchor stays
`#intro1`, matching the rendered heading and GitHub.
