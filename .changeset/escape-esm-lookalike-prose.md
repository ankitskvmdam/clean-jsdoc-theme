---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
---

Fix a page being skipped when a description line starts with `import` or `export` (#347).

A doc comment whose description began with the lowercase word `import` (or
`export`) — e.g. "import these functions to your own project." — made its whole
page fail to render with `Could not parse import/exports with acorn`, because MDX
reads a flow line that starts with that keyword as an ES module statement. The
renderer's pre-pass now neutralizes such prose lines (the keyword's first letter
becomes a character reference, invisible once rendered), so the sentence renders
as plain text whatever word it starts with. Real `import` statements inside code
fences and inline code are untouched, and the `.md` companion is unchanged.
