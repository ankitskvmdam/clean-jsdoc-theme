---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
---

Keep frontmatter out of the search index when a value contains `---` (#393).

A page whose title or description held `---` (for example `title: a --- b`)
had the rest of its frontmatter indexed as page text and shown in search
excerpts. The frontmatter now ends only at a `---` on its own line, the same
rule the page renderer uses, including for CRLF files. Rendered HTML is
unchanged for generated pages; a CRLF, empty or end-of-file-closed frontmatter
block is now also recognised by the comment and backtick pre-passes and
`llms-full.txt`.
