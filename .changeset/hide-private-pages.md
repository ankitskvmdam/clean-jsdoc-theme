---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/typedoc': patch
---

`@private` and `@ignore` symbols no longer get their own page. A private typedef,
class, namespace, module, interface or mixin used to get a page and a sidebar
entry, and `@ignore`d globals still showed on the Globals page; only private
_members_ were hidden. Hidden symbols are now dropped once, before any page,
sidebar entry, link target, search entry or `llms.txt` line is built. A type that
names a hidden typedef now renders as plain text; it no longer links to a page for
the private typedef.

Everything documented inside a `@private` namespace, module or class is hidden
too, including public symbols nested in it. This differs from JSDoc's default
template, which hides only the private container and keeps an orphan page for a
public class nested inside it.

A class whose only private part is its ES6 `constructor` (`/** @private */
constructor()`) keeps its page and public members, whatever its shape: exported,
plain, a subclass, a class expression (top-level or nested, as in
`Ns.Foo = class {…}`), an `export default class`, or a CommonJS export
(`exports.Foo = class`, `module.exports = Foo`, `module.exports = class`), with or
without an `@alias` on the class comment. An ES5
`@class`/`@constructor` function marked `@private` is the class itself, so it
stays hidden. On the kept class, only the Constructor section
is hidden, along with everything else on the constructor comment (`@since`,
`@see`, …). JSDoc merges the constructor comment into the class, which used to
show the whole class as `private`. On TypeDoc pages, a `private constructor()`
that TypeDoc excludes no longer leaves a `new Name()` Constructor section behind.
With `excludePrivate: false`, or for a `protected constructor()`, the section
shows a `private` or `protected` badge.

JSDoc's `--private` (or `--access` naming `private` or `all`) now shows private
symbols, members included, as JSDoc's default template does. The other `--access`
levels (`public`, `protected`, `package`, `undefined`) are not supported: symbols
with those access levels are always documented. Under TypeDoc,
`excludePrivate: false` now also shows private members, which were dropped even
though TypeDoc had kept them.
