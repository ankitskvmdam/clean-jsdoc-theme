---
'@clean-jsdoc-theme/rang': patch
---

Fix the mobile "On this page" table of contents collapsing on long pages. Once a
page had more headings than fit the list's 50vh cap, every row was squeezed down
to 12px — clipping and overlapping the heading text instead of scrolling. Rows
now keep their natural 32px height and the list scrolls as intended.
