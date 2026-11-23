---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
---

Highlight fenced code blocks whose language is written in upper or mixed case (#415).

A block opened with ` ```JS `, `~~~TS` or ` ```C# ` used to render as plain text,
because the highlighter matches language names case-sensitively. The language is
now matched case-insensitively, including aliases such as `C#` and `C++`. The
`.md` output keeps the language exactly as written, and unknown languages still
render as plain text.
