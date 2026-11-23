---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
---

Braces in documentation text are always shown as written (#363).

Outside code, a `{…}` in a page is never treated as an MDX expression, including
on a line where a backtick in a link title, a tag attribute or a bare URL made
the brace escaping read the line differently from MDX. An attribute written
`a={…}` keeps `{…}` as its string value, a spread attribute `{...x}` is dropped,
and an `import`/`export` block shows as text.
