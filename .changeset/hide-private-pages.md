---
'clean-jsdoc-theme': patch
---

`@private` and `@ignore` symbols no longer get their own page. A private typedef,
class, namespace, module, interface or mixin used to get a page and a sidebar
entry, and `@ignore`d globals still showed on the Globals page; only private
*members* were hidden. Hidden symbols are now dropped once, before any page,
sidebar entry, link target, search entry or `llms.txt` line is built, together
with everything documented under a hidden container. A type that names a hidden
typedef now renders as plain text instead of linking to a missing page.

JSDoc's `--private` (or `--access private` / `--access all`) now shows private
symbols, members included, as JSDoc's default template does. Under TypeDoc,
`excludePrivate: false` now also shows private members, which were dropped even
though TypeDoc had kept them.
