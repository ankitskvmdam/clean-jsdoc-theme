---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/dwar': patch
---

Keep `<sub>`, `<sup>` and other inline HTML that has no Markdown form (#360).

`H<sub>2</sub>O` in a doc comment, README or tutorial used to render as "H2O":
the HTML round-trip kept only the text. `<sub>`, `<sup>`, `<abbr>`, `<mark>`,
`<small>`, `<ins>`, `<u>`, `<cite>`, `<dfn>`, `<time>`, `<data>`, `<bdi>`,
`<bdo>`, ruby annotations and a `<span>` with a `lang`, `dir` or `title` now
reach the page as written. Only `title`, `lang` and `dir` attributes are kept
(plus `datetime`, `value` and `cite` where they apply); `class`, `style`, event
handlers and the rest are dropped. `<mark>` and `<u>` are no longer turned into
italics.

`<details>` stays collapsible, with its `<summary>` and `open` attribute;
it used to be flattened to plain paragraphs. Headings inside a `<details>`
don't appear in the page's table of contents.

Search text and excerpts join the text of these elements to their neighbours
(`H2O`, not `H 2 O`).
