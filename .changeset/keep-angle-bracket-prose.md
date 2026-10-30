---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/dwar': patch
---

Keep angle-bracketed words like `Promise<User>` and `<T>` in doc-comment prose.

A description such as "Resolves to a Promise<User> or Array<string>" rendered
as "Resolves to a Promise or Array", with no error or warning: the markdown
step passes `<User>` through as an HTML tag, and the HTML conversion dropped the
unknown tag. A type name that matches an HTML element was worse: `Array<Option>`
lost the rest of its paragraph. A tag that isn't real markup now renders as
literal text. That covers capitalized names (`<User>`, `<Callout>`), single
capital letters (`<T>`, `<P>`) and lowercase names that aren't HTML elements
(`<string>`). Lowercase HTML such as `<kbd>`, `<sub>`, `<details>`, `<br>` and
`<img>`, all-caps HTML such as `<BR>`, and the `<steps>`/`<tabs>`/`<playground>`
containers work as before. This applies to JSDoc and TypeDoc comments, the
README, tutorials and `docs` pages. The page's meta description and the search
index now match the rendered text too. They keep the literal words, decode
entities (`&quot;` no longer shows up in search results) and drop the
backslashes that escaped characters left behind (`snake\_case` → `snake_case`).
