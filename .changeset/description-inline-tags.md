---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Resolve JSDoc inline tags in API page descriptions (#366).

`{@link}`/`{@linkcode}`/`{@linkplain}`/`{@tutorial}` in a page's frontmatter
`description` (the search entry's description and fallback subtitle, pager
cards, `<meta name="description">`, `.md` output) are replaced by plain text:
the link's label, else its target as written, and the tutorial's title for
`{@tutorial}`.
