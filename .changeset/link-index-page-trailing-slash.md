---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/typedoc': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/rang': patch
'@clean-jsdoc-theme/dwar': patch
---

Fix links to a class named `Index` opening the home page (#333).

The page for a symbol named `index` is written to `index/index.html`, but the
sidebar, type links, search results, prev/next cards and the language switcher
linked it as `/index`. Hosts that serve `/index` from `index.html` (GitHub Pages
does) showed the home page instead. Links to a page whose URL ends in `index`
(`/index`, `/module/index`) now carry a trailing slash (`/index/`) so they reach
the page itself. All other links are unchanged.
