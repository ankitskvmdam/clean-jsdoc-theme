---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
---

Stop the HTML comment scan from failing on a single tag of several million characters (#382).

The scan threw `RangeError: Maximum call stack size exceeded` on such a tag,
closed or not, when the text also held a `<!--`. It now reads the tag in time
that grows in step with its size, and its output for every other input is
unchanged. Other scans can still fail on a single tag beyond about 8 MB; that
is tracked separately.
