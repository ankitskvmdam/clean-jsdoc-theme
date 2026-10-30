---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/typedoc': patch
---

Fix a blank member heading for a member with an empty name.

JSDoc can't name an ES private method (instance or static), so a doc comment on
`#secret() {}` reached the theme as a member with an empty name and rendered as
an empty heading with no anchor on its class page. TypeDoc does the same for a
TypeScript property declared as `'': number`. Members with an empty name are now
left out of every member list in both the JSDoc and TypeDoc themes, so they no
longer produce a heading, a table-of-contents entry, a search entry or a link
target. Named members are unaffected.
