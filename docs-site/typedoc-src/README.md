# clean-jsdoc-theme — TypeDoc API example

This is a small TypeScript project documented with the
[`@clean-jsdoc-theme/typedoc`](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc)
plugin. It feeds TypeDoc's reflection tree through the **same** `setu → dwar`
pipeline as the JSDoc build, so a TypeDoc project gets identical output: SSR
HTML, a co-located `.md` per page for LLMs, lazy-hydrated islands, fuzzy search,
and an optional Pagefind index.

Browse the sidebar to see how the theme renders TypeScript-specific shapes:

- **Classes** with constructors, accessors, and methods (`Store`)
- **Interfaces** that lead with an `interface … { … }` declaration block (`Logger`)
- **Type aliases** — both function-type (`Formatter`) and union (`Level`)
- **Enumerations** (`Status`)
- **Object-literal constants** with per-member docs (`LOG_LEVELS`)
- **Overloaded** functions (`createFormatter`)

For the JSDoc-driven counterpart, see the
[JSDoc API example](/clean-jsdoc-theme/api-docs/).
