---
"@clean-jsdoc-theme/dwar": patch
"@clean-jsdoc-theme/typedoc": patch
"clean-jsdoc-theme": patch
---

Stamp the theme version into every generated page as `<meta name="generator" content="clean-jsdoc-theme <version>" />`, so a built site records which version produced it (useful for bug-report triage). Emitted by default in both the JSDoc and TypeDoc flavors; an author `meta` entry with `name: "generator"` overrides it.
