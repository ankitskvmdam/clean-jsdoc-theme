---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/utils': patch
---

Stop a single HTML tag of several million characters from failing the build (#382).

A description holding one unclosed tag about 7 MB or longer, together with a
`<!--`, made the HTML comment scan throw `RangeError: Maximum call stack size
exceeded`. The scan now reads such a tag to the end of the input, as a browser
does, in time that grows in step with its size. The output for every other
input is unchanged.
