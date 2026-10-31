---
'clean-jsdoc-theme': patch
'@clean-jsdoc-theme/setu': patch
'@clean-jsdoc-theme/utils': patch
'@clean-jsdoc-theme/dwar': patch
'@clean-jsdoc-theme/typedoc': patch
---

Give every heading a visible anchor that the table of contents links to.

- **Headings with no letters or digits.** A member named `$`, `_` or `$$`, or a
  Markdown heading like `## $` or `## 🚀`, got an empty anchor: it rendered with
  `id=""`, and its table-of-contents link (and a `{@link}` to such a member)
  pointed at the top of the page. These now get an anchor built from their
  text's code points: `#section--1f680` for a prose `## 🚀` (a repeat becomes
  `#section--1f680-1`) and `#member--24` for a member `$`.
- **Emoji with a variation selector or keycap.** `## ⚠️`, `## ❤️` or `## 1️⃣`
  used to get an anchor made of invisible characters. A heading that is only
  such an emoji now gets a fallback like `#section--26a0_fe0f`, and the emoji
  presentation characters U+FE0E, U+FE0F and the keycap U+20E3 are dropped
  from mixed text: `## ⚠️ Warning` is now `#warning`, and `## 1️⃣ Step` is now
  `#1-step`. Links to the old, invisible anchors stop working. A heading whose
  anchor was made only of combining marks (`## ゛`) also gets a fallback.
- **Formatted headings in the table of contents.** For a heading with bold,
  italic, link or inline-code text, the table of contents only read the plain
  text around the formatting, so `## **Bold** title` was listed as `title` and
  linked to `#title` while the heading itself was `#bold-title`. The table of
  contents now reads the whole heading and links to the anchor the page renders.
  This includes a footnote reference: `## Intro[^1]` is now listed as `Intro1`
  and links to `#intro1`, the anchor the page always rendered (and the one
  GitHub generates).
- **Hard line breaks in headings.** `## a<br>b` was listed as `ab` linking to
  `#ab` while the page rendered `#a-b`; the table of contents now links to
  `#a-b`.
- **TypeDoc members with no visible name.** A TypeScript property or enum
  member literally named `' '` aborted the TypeDoc build. It now renders with
  the anchor `#member--20`, and is shown as `' '` in the heading, the table of
  contents and search. A name made only of characters that print nothing — a
  no-break space, a zero-width space, a soft hyphen, a lone combining mark, a
  tab, a Braille blank (U+2800), a lone surrogate half — is shown as a quoted
  escape (`'\u00a0'`, `'\u200b'`, `'\t'`, `'\u2800'`, `'\ud800'`), so its
  heading and table-of-contents row are never blank and two such names never
  look the same; the anchor keeps the code points (`#member--200b`). A name
  with any visible character, such as `$` or `a b`, is unchanged.

The table of contents, the rendered page and `{@link}` always use the same
anchor. Any heading whose anchor already contained a letter or digit and none
of U+FE0E/U+FE0F/U+20E3 keeps its anchor byte for byte; all 1,900 headings in
this repo's own docs (en/hi/ja/zh) are unchanged.
