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

The rule for a tag, by its name as written:

- Lowercase HTML or custom elements are markup (`<kbd>`, `<br>`, `<p>`,
  `<my-widget>`). The exception is one glued to a word with no attributes, no
  closing tag in the same block, and not void: `Promise<object>` and
  `Array<title>` are text, while `foo<br>` still breaks the line.
- ALL-CAPS element names of two or more letters are markup (`<BR>`,
  `<TABLE>`, `<DIV>`), with the same exception: `Array<DATA>` is text.
- A single capital letter that names an element is markup only with
  attributes or a closing tag in the same block (`<B>bold</B>`,
  `<A HREF="…">`, `<P ALIGN=center>`). On its own (`<T>`, `<P>`) it is a
  generic and shows as text.
- Every other name shows as text: unknown names (`<User>`, `<string>`) and
  any other capitalized name, even with attributes or a closing tag. That
  covers component tags in component-library docs, such as
  `<Button variant="primary">Click</Button>` or `<Option value>`, and
  mixed-case HTML such as `<Img src>` or `<Div>`, which used to render as HTML.

The `<steps>`/`<tabs>`/`<playground>` containers work as before. This applies
to JSDoc and TypeDoc comments, `@example` captions, the README, tutorials and
`docs` pages. A literal tag with braces (`<Foo bar="{x}">`) no longer fails
the page.

The page's meta description and search entry now match the rendered text:
literal words are kept and character references are decoded once (so
`&quot;` and `&mdash;` no longer show up in search results). The search
excerpt and content drop the backslashes that escaped characters left behind
(`snake\_case` reads `snake_case`), and inline code keeps its text as written.
