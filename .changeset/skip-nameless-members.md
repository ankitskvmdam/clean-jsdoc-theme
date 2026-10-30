---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Fix a blank member heading for a documented ES `#private` method.

JSDoc can't name an ES private class member, so a doc comment on `#secret() {}`
reached the theme as a member with an empty name and rendered as an empty
heading with no anchor on its class page. Nameless doclets are now left out of
every member list, so they no longer produce a heading, a table-of-contents
entry, a search entry or a link target. Named members are unaffected.
