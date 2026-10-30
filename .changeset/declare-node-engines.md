---
'clean-jsdoc-theme': patch
---

Every package now declares `engines.node: ">=20"`, the minimum its runtime
dependencies (ora, commander, shiki) already require. Installing on an older Node
now warns up front (or fails under `engine-strict`) instead of breaking later at
runtime. Package metadata also gains keywords and an updated homepage URL.
