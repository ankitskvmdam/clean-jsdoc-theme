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
that left the site without a home page. The renderer's pre-pass now drops
comments from prose, as a browser would hide them. A comment shown inside a
fenced code block (including a four-backtick fence wrapping triple-backtick
lines), an inline code span, or a link URL/title is kept as written, and a
comment that starts a line hides everything up to its `-->`, so commenting out
a whole section — code blocks, `<steps>`/`<tabs>`/`<playground>` containers
and playground fences included — works as on GitHub. An unterminated `<!--` is shown as literal text
instead of hiding the rest of the page.

The `.md` companion keeps the comments as written; the search index leaves out
the text of every complete comment. `@example` captions holding raw HTML such as
`<?php … ?>`, `<![CDATA[…]]>` or `<br>` no longer skip the page either: they are
normalized the same way descriptions already were.
