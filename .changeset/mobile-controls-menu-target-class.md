---
"clean-jsdoc-theme": patch
"@clean-jsdoc-theme/utils": patch
"@clean-jsdoc-theme/setu": patch
"@clean-jsdoc-theme/rang": patch
"@clean-jsdoc-theme/dwar": patch
"@clean-jsdoc-theme/typedoc": patch
"@clean-jsdoc-theme/bhasha": patch
---

Mobile header fix and restored `target`/`class` menu options.

- **Search + language switcher now stay visible on mobile.** The header search
  trigger was wrapped in a `hidden … md:flex` desktop-only container, so the
  search icon disappeared below the `md` breakpoint. Search (and the
  always-present language switcher) are pulled out of that wrapper so both stay
  visible on every breakpoint; theme/settings remain desktop-only since the
  mobile nav drawer already hosts them.

- **`target` and `class` are back on menu entries.** Both options were dropped
  from the v5 menu object and are now re-introduced as optional fields, threaded
  through the whole pipeline (opts schema, setu, the JSDoc + TypeDoc bridges, and
  rang's sidebar). `target` overrides the link target (external links still
  default to `_blank`, and the `noopener` rel is dropped when the target isn't
  `_blank`); `class` is merged onto the rendered link. Both apply to external and
  built-in/internal entries and are omitted when unset, so existing menus stay
  byte-identical.
