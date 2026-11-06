---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/typedoc': patch
---

Keep a doc page's sidebar link when a later doc page is skipped for sharing its slug.

When two files in the docs directory produced the same URL (for example
`docs/foo-bar.md` and `docs/foo_bar.md`, both `foo-bar`), the first was built and
the second skipped with a warning, but the sidebar dropped both entries, so the
built page could only be reached by typing its URL. Only the skipped page's entry
is removed now; the page that was built keeps its link. A doc page skipped because
an API page already owns its slug still gets no sidebar entry.
