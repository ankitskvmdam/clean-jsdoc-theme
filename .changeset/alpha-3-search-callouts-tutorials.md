---
'clean-jsdoc-theme': minor
'@clean-jsdoc-theme/typedoc': minor
'@clean-jsdoc-theme/utils': minor
'@clean-jsdoc-theme/setu': minor
'@clean-jsdoc-theme/rang': minor
'@clean-jsdoc-theme/dwar': minor
'@clean-jsdoc-theme/aadesh': minor
'@clean-jsdoc-theme/bhasha': minor
---

Command palette, callouts, tutorials, and a rebuilt documentation site.

- **Command palette — recent & favorite searches.** `Ctrl K` now remembers recent
  queries and lets you star favorites (persisted locally). The palette was
  refactored into focused components.
- **Tutorials nest in the sidebar.** Sub-tutorials render as collapsible groups
  mirroring JSDoc's resolved hierarchy (#253), and `@tutorial` resolves to its
  page through a shared cross-reference resolver.
- **Callouts everywhere.** Every blockquote renders as a callout (defaulting to
  `info`), and GitHub-style alert blockquotes nested inside lists are promoted
  too.
- **Rendering fixes.** Anchor jumps land below the sticky header on small
  screens; Home is included in the prev/next reading order (source & menu links
  excluded); grouped badge images no longer add vertical margin; the island
  bundle cache busts when `rang` changes; and the build spinner stays alive
  during long synchronous stages.
- **Documentation.** A rebuilt docs site — getting-started, guides, authoring
  (callouts / steps / tabs / embeds / custom tags), an FAQ, and per-package
  pages — plus refreshed package READMEs with a theme-aware logo.
