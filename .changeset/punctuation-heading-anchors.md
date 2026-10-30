---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/dwar': patch
---

Give headings made only of punctuation or emoji a real anchor.

A heading whose text has no letters or digits, such as a member named `$`, `_`
or `$$`, or a Markdown heading like `## $` or `## 🚀`, got an empty anchor. It
rendered with `id=""`, its table-of-contents link pointed at the top of the page,
and a `{@link}` to such a member did too. These headings now get an anchor built
from their text's code points: `#section--1f680` for a prose `## 🚀` (a repeat
becomes `#section--1f680-1`) and `#member--24` for a member `$`. The table of
contents, the rendered page and `{@link}` all use the same anchor. Every other
heading keeps its current anchor, so existing links are unaffected.
