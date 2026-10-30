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
or `Array<title>` lost the rest of the paragraph or page.

A tag that reads as a type argument now renders as literal text. That covers
unknown names (`<User>`, `<T>`, `<string>`, `<Callout>`), element names with no
attributes and no closing tag that aren't lowercase HTML (`<P>`, `<Option>`),
and a lowercase element glued to a word with neither (`Promise<object>`). Real
HTML keeps working in any case when it has attributes or a closing tag
(`<kbd>…</kbd>`, `<B>…</B>`, `<A HREF="…">`, `<my-widget>…</my-widget>`), as do
lowercase elements such as `<br>`, `<img>` and an unclosed `<p>`, all-caps
`<BR>`, and the `<steps>`/`<tabs>`/`<playground>` containers. This applies to
JSDoc and TypeDoc comments, `@example` captions, the README, tutorials and
`docs` pages, and a literal tag with braces (`<Foo bar="{x}">`) no longer
fails the page.

The page's meta description and search entry now match the rendered text:
literal words are kept and character references are decoded once (so
`&quot;` and `&mdash;` no longer show up in search results). The search
excerpt and content drop the backslashes that escaped characters left behind
(`snake\_case` reads `snake_case`), and inline code keeps its text as written.
