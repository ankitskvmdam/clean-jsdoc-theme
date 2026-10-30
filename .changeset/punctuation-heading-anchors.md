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
  such an emoji now gets a fallback like `#section--26a0_fe0f`, and the
  invisible characters are dropped from mixed text: `## ⚠️ Warning` is now
  `#warning`, and `## 1️⃣ Step` is now `#1-step`. Links to the old, invisible
  anchors stop working.
- **Formatted headings in the table of contents.** For a heading with bold,
  italic, link or inline-code text, the table of contents only read the plain
  text around the formatting, so `## **Bold** title` was listed as `title` and
  linked to `#title` while the heading itself was `#bold-title`. The table of
  contents now reads the whole heading and links to the anchor the page renders.
- **TypeDoc members named with a single space.** A TypeScript property or enum
  member literally named `' '` aborted the TypeDoc build. It now renders with
  the anchor `#member--20`.

The table of contents, the rendered page and `{@link}` always use the same
anchor. Every other heading keeps its current anchor.
