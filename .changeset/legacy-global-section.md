---
'@clean-jsdoc-theme/setu': patch
---

`sectionOrder` accepts v4's `"Global"` as the `Globals` section. A `sections` list
carried over from v4 (`["Classes", "Global"]`) used to drop the globals from the
sidebar without a word. A real `Global` group (an `@category Global` or a doc
group with that name) still takes precedence.
