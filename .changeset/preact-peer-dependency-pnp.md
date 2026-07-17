---
"@clean-jsdoc-theme/rang": patch
"@clean-jsdoc-theme/dwar": patch
"@clean-jsdoc-theme/bhasha": patch
"@clean-jsdoc-theme/setu": patch
"@clean-jsdoc-theme/typedoc": patch
"@clean-jsdoc-theme/aadesh": patch
"clean-jsdoc-theme": patch
---

Fix `Cannot read properties of undefined (reading 'context')` that made every page fail to render under Yarn Berry (PnP), producing an empty `dist`.

`preact` was a direct dependency of the internal packages that create and consume Preact contexts, so under Yarn PnP's strict resolution the server-rendered component tree and `preact-render-to-string` could bind to different Preact instances — leaving Preact's internal `currentComponent` unset and throwing on the first `useContext` of every page. `preact` is now a `peerDependency` of the internal packages (`rang`, `dwar`, `bhasha`, `setu`) and a direct dependency of the installable entry points (`clean-jsdoc-theme`, `@clean-jsdoc-theme/typedoc`, `@clean-jsdoc-theme/aadesh`), so a single Preact instance is shared regardless of package manager.
