---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Keep a ` ```js playground ` fence where it was written (#362).

In a list item it used to be moved out after the list, ending the list; in a
blockquote (or a `> [!TIP]` callout) it stayed a plain code block. It is now a
playground in place, in list items, nested lists, blockquotes, callouts and
`<details>`.

A playground fence in a file with Windows (CRLF) line endings is now lowered
too; it used to stay a plain code block. A fence directly inside an HTML block
with no blank line around it (`<div>` on the line before) is now literal text,
as any fenced code block there is; add blank lines to get the playground. Under
an HTML table cell, heading or emphasis, the fence stays a plain code block.
