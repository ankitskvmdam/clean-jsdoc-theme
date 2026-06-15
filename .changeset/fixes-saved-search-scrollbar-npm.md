---
'@clean-jsdoc-theme/rang': patch
---

Fixes & polish:

- **Per-locale saved searches.** The command palette's recent + favorite
  searches are now scoped to the active locale (keyed off `<html lang>`), so
  switching language no longer wipes or overwrites the lists — each language
  keeps its own.
- **Sidebar scrollbar no longer overlaps the nav labels** — the scrollable
  sidebar reserves a stable gutter and a small right padding.
- **npm link** added to the docs-site chrome (a `menu` entry).
