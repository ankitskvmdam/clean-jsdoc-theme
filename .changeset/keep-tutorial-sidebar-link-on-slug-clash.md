---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Keep a tutorial's sidebar link when a later tutorial is skipped for sharing its slug, and warn about the skip.

When two tutorials produced the same URL (for example `tutorials/foo-bar.md` and
`tutorials/foo_bar.md`, both `tutorials/foo-bar`), the first was built and the
second dropped, but the sidebar kept both entries, so the second link opened the
first tutorial's page. Only the built tutorial keeps its entry now. A skipped
tutorial, which used to be dropped silently, is reported like a skipped doc page:
`skipping tutorial "Underscore" (tutorials/foo_bar): its slug "tutorials/foo-bar"
collides with an existing page`. A tutorial whose slug a doc or API page already
owns is skipped with the same warning and gets no sidebar entry.
