---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Keep a ` ```js playground ` fence where it was written (#362).

In a list item it used to be moved out after the list, ending the list; in a
blockquote (or a `> [!TIP]` callout) it stayed a plain code block. It is now a
playground in place, in list items, nested lists, blockquotes, callouts and
`<details>`.
