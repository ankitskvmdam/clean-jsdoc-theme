---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/utils': patch
---

Fix a page being skipped when its prose contains an HTML comment (`<!-- … -->`).

MDX has no HTML-comment syntax, so a single comment in a README (badge blocks,
all-contributors markers), a tutorial or a doc comment made the whole page fail
to render with ``Unexpected character `!` (U+0021) before name`` — on the README
that left the site without a home page. Comments are now dropped from prose, as
a browser would hide them: the generator removes them while converting README,
tutorial and doc-comment text — so a generated page's body, its `.md` companion,
`llms-full.txt`, the page description and the search index hold no comment text
— and the renderer drops any comment left in a body handed to it directly (from
the rendered HTML and the search index; the `.md` companion stays the verbatim
body, as documented). A comment shown inside a fenced code block (including a
four-backtick fence wrapping triple-backtick lines, a fence in a list item or a
blockquote), an inline code span, a quoted attribute value or a link URL/title
is kept as written, and a comment that starts a line hides everything up to its
`-->`, so commenting out a whole section — or a single `<step>`/`<tab>` inside a
live `<steps>`/`<tabs>`, or a playground fence — works as on GitHub. An
unterminated `<!--` is shown as literal text instead of hiding the rest of the
page, and a comment removed from the middle of a page no longer shifts the line
numbers reported for a later render error.

`@example` captions are parsed with the same GitHub-Flavored Markdown as every
other prose surface (`~~strikethrough~~`, bare URLs), and ones holding raw HTML
such as `<?php … ?>`, `<![CDATA[…]]>` or `<br>` no longer skip the page: they are
normalized the same way descriptions already were.
