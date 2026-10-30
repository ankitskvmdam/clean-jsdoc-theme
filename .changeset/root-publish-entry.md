---
'clean-jsdoc-theme': patch
---

`"template": "node_modules/clean-jsdoc-theme"` (the path v4 configs and the
migration guide use) now works: the package ships a root `publish.js` that loads
the built theme, so JSDoc no longer fails with `Cannot find module
'.../clean-jsdoc-theme/publish'`. `node_modules/clean-jsdoc-theme/dist` keeps
working.
