---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/dwar': patch
---

Give guide, tutorial and README pages a description (#370).

A docs page's frontmatter `description` was dropped, and pages without one got
none, so they had no <meta name="description">, search subtitle or llms.txt
summary. The frontmatter value is now carried through; otherwise the first prose
paragraph is used (plain text, inline tags reduced to their label, footnote
markers and link-only rows skipped, max 300 characters).

The companion `.md` output no longer applies `basePath` to text inside a page's
frontmatter: a description quoting `<Link href="/x">` stays as typed, and a
lone code fence in a frontmatter value no longer pairs with a fence in the body
and leaves the links between them without the base.
