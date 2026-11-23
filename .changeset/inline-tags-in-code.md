---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/utils': patch
---

JSDoc inline tags inside code are left as written (#363).

A `{@link …}` shown in an `@example`, a fenced code block, an inline code span,
a JSX attribute or the frontmatter is no longer rewritten. Tags in prose are
still shown as inline code, as before, and a tag whose text holds a URL or
other Markdown is shown as one code span. In a table row, a code span now ends
at the cell boundary, as GFM reads it, so its braces are escaped like other
prose.
