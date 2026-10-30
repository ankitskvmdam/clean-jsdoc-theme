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
`ts` code fence inside the **Default:** value, and it now wins over the
property's initializer. Defaults follow TypeDoc's own model. A tag that is a
single code span or plain content renders as a code value, so prose with no code
of its own (`@defaultValue the current working directory`,
`see [docs](url)`) shows as code, exactly as in TypeDoc's default theme. A tag
that mixes text with code spans or `{@link}` renders as text with working links
and code. A parameter with an object or array initializer no longer shows
`default: ...`.
