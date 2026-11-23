---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
---

Highlight code fences whose language was missed when choosing which grammars to load (#420).

A fence inside a blockquote, on a list item's first line or in a footnote
definition, a fence of four or more backticks or tildes, and a fence with a space
before the language rendered as plain text when no other fence on the site used
that language. The language scan now reads every fence form, in time that grows
in step with the page size.
