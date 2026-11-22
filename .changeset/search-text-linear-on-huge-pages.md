---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/dwar': patch
---

Keep search-index extraction fast on very large pages (#383).

Building the search text and excerpt of a page with several million characters
slowed down far more than its size: 8 MB of whitespace-heavy text took about
2 seconds. It now takes about 0.1 seconds, and the time grows in step with the
page. The output is unchanged.
