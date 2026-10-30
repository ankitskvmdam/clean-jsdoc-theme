---
'clean-jsdoc-theme': patch
---

All packages now declare `engines.node: ">=22"`, the Node line CI tests (Node 20
reached end-of-life in April 2026). Installing on an older Node now warns up front
(or fails under `engine-strict`) instead of breaking later at runtime. Package
metadata also gains keywords and an updated homepage URL.
