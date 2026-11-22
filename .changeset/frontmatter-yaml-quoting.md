---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Quote frontmatter values that a YAML parser would misread (#384).

The frontmatter in each page's `.md` companion now double-quotes any value a
plain YAML scalar can't carry. A description like `See #123 for details` used
to be cut off at the ` #`, which YAML reads as a comment. Values that end in
`:`, have leading or trailing whitespace or control characters, or look like a
boolean, null, number or date (`true`, `yes`, `404`, `2001-12-14`) are quoted
too, so they read back as the same string. The rendered HTML is unchanged.
