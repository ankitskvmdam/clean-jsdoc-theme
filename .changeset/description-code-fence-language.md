---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Keep the language of a fenced code block in a JSDoc description or README (#359).

JSDoc's markdown plugin marks a fence's language as a `lang-js` class on the
`<pre>`, which was dropped: the block rendered unhighlighted, and the page's
`.md` companion had a fence with no language. The language now survives.
` ```iframe ` fences in the README now become embeds, as documented, and a
`<playground>` container in a doc comment or the README gets its code's
language. A ` ```js playground ` fence in a doc comment is still a plain (now
highlighted) block, as JSDoc drops the `playground` word: use `<playground>` or
`@playground` there.
