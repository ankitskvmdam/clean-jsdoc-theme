---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/setu': patch
---

Fix a page being skipped when its prose contains an HTML comment (`<!-- … -->`).

MDX has no HTML-comment syntax, so a single comment in a README (badge blocks,
all-contributors markers), a tutorial or a doc comment made the whole page fail
to render with ``Unexpected character `!` (U+0021) before name`` — on the README
that left the site without a home page. The renderer's pre-pass now drops
comments from prose (they render to nothing, as in HTML) while comments inside
code blocks and inline code are shown verbatim. An unterminated `<!--` is shown
as literal text instead of hiding the rest of the page. The `.md` companion keeps
the comments; the search index no longer includes their text.
