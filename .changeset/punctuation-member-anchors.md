---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/utils': patch
---

Give members named `$`, `_` or `$$` a real anchor.

A member whose name is only punctuation slugified to an empty anchor, so its
heading rendered with `id=""`, it was missing from the table of contents, and a
`{@link}` to it pointed at the top of the page. Such a member now gets an anchor
built from its name's code points (`$` → `#member-24`, `_` → `#member-5f`),
shared by the heading and the link. Every other member keeps its current
anchor, so existing links are unaffected.
