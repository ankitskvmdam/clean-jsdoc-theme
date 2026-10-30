---
'clean-jsdoc-theme': patch
---

Parameter and property defaults now show exactly as written. A string default
was quoted a second time, so `[name=""]` displayed as `"\"\""` and `[sep='']`
as `"''"`. Defaults now render verbatim in a code span (`""`, `''`, `{a: 1}`,
`() => {}`, `0`, `true`, `null`), the same as a member's **Default:** line, on
JSDoc and TypeDoc pages alike.
