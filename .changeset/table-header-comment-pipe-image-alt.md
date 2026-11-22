---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/dwar': patch
---

Fix two leftovers of dropping HTML comments from page bodies (#380).

A table whose header row holds a comment with a `|` in it (`<!-- a | b --> h | i`)
is now read as a table. The page used to fail with "Unexpected end of file in
expression" when a later row held a comment that ran across lines.

An image's alt text no longer shows `/**/` where a comment stood in its label:
`![a <!-- x --> b](p.png)` now has the alt `"a  b"`. Alt text that holds `/* */`
of its own is left as written.
