---
"@clean-jsdoc-theme/utils": minor
"@clean-jsdoc-theme/setu": minor
"@clean-jsdoc-theme/rang": minor
"@clean-jsdoc-theme/dwar": minor
"clean-jsdoc-theme": minor
"@clean-jsdoc-theme/typedoc": minor
---

Add **`collapsibleSidebarSections`** — top-level sidebar section headers (Namespaces, Classes, Interfaces, `@category` groups, doc groups, Tutorials, …) can now be collapsed. It accepts `true` / absent (all sections collapsible — the default), `false` (none), or an array of exact, case-sensitive section labels (only those). Sections default open, and a visitor's collapsed state persists in `localStorage`. A label in the array that matches no rendered section prints a build warning listing the available section labels. Works for both the JSDoc template and the TypeDoc plugin. (Closes #343.)

**Heads-up — visible default change:** with no configuration, every top-level sidebar section header now renders as a collapse toggle (still expanded by default, so nothing is hidden on load). Pass `"collapsibleSidebarSections": false` to restore the previous always-static headers.
