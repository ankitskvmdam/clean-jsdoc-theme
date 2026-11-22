---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/dwar': patch
---

Fix two text artefacts in search excerpts and page descriptions (#385).

Search excerpts now leave out every inline code span, whatever its backtick
count. A double-backtick span used to leave its content (or a stray backtick)
behind. Unmatched backticks stay as the literal text the page shows.

Page descriptions no longer get a space before punctuation that follows inline
markup: `<code>Array</code>, maybe` reads "Array, maybe", not "Array , maybe".
Only block-level tags (`<p>`, `<li>`, `<br>`, ...) separate words now.
