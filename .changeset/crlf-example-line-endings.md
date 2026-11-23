---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
---

Keep the line breaks of an `@example` written in a CRLF source file (#369).

JSDoc turns each `\r\n` of a comment into a lone `\r`, and TypeDoc keeps the
`\r\n`. Either way the example's lines were joined by `\r` in the `.md` page and
`llms-full.txt`, highlighted as one line in the HTML, and an example written
with its own code fence was fenced twice. Doclet text is now normalised to `\n`
before pages are built, so a CRLF checkout (Windows, `core.autocrlf=true`)
builds the same site as an LF one.

Translation slots get the same source text and hash on both. A catalog
extracted from a CRLF checkout without JSDoc's markdown plugin will see its
multi-line descriptions marked as changed once.
