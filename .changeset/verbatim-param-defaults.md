---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/typedoc': patch
---

Parameter and property defaults now show exactly as written. A string default
was quoted a second time, so `[name=""]` displayed as `"\"\""` and `[sep='']`
as `"''"`. Defaults now render verbatim in a code span (`""`, `''`, `{a: 1}`,
`() => {}`, `0`, `true`, `null`, `NaN`), the same as a member's **Default:**
line, on JSDoc and TypeDoc pages alike.

On TypeDoc pages, a `@defaultValue` tag no longer shows its own backticks or a
`ts` code fence inside the **Default:** value. A `@defaultValue` written as prose
(`see [docs](…) for details`, `` `true` when `x` is set ``) renders as text with
working links and code instead of one code span. A parameter with an object or
array initializer no longer shows `default: ...`.
