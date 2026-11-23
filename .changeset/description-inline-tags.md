---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Resolve JSDoc inline tags in API page descriptions (#366).

`{@link}`/`{@linkcode}`/`{@linkplain}`/`{@tutorial}` in a page's frontmatter
`description` (search subtitle, pager cards, `<meta name="description">`, `.md`
output) are replaced by the text the page body shows: the label when one is
given, else the target as written, and the tutorial's title for `{@tutorial}`.
