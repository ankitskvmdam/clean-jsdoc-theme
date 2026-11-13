---
'@clean-jsdoc-theme/typedoc': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/rang': patch
'clean-jsdoc-theme': patch
---

Fix local images getting the `basePath` prefix twice under TypeDoc (#377). With
`cleanJsdocTheme.basePath: "/docs"`, a Markdown image or raw `<img>` in a docs
page, the README or a symbol comment rendered as
`<img src="/docs/docs/_assets/…">` (404). The TypeDoc plugin pre-applied the base
to the rewritten `_assets/` src and the renderer applied it again. Both bridges
now emit base-free `/_assets/…` srcs, like page links, and the base is added
exactly once at render time. Inline SVGs are unaffected.

The companion `<page>/index.md` files and `llms-full.txt` now carry `basePath`
on their root-relative links and image references, so they resolve when fetched
from a sub-path deploy (both flavours; JSDoc's used to emit `/_assets/…` and
both emitted base-free page links). Builds without `basePath` are unchanged.
