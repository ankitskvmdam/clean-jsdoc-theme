---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/utils': patch
---

Read fenced code the way MDX does when escaping braces and `import`/`export` lines and when warning about unbalanced backticks (#372).

A four-backtick fence around three-backtick lines, or an odd number of fence
lines, no longer gives a false "unbalanced inline-code backtick" warning, a
visible `\{` in the code, or a page that fails to compile. Fences that MDX closes on an
indented closer, fences in list items and quotes, and unclosed fences are read
the same way too. These passes also no longer fail on a single code span or
tag of several megabytes, and the backtick check no longer slows down on pages
with many unbalanced backticks.
