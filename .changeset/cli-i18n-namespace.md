---
'@clean-jsdoc-theme/aadesh': minor
---

CLI: localization commands moved under `clean-jsdoc i18n`; `build` stays
top-level.

The localization authoring verbs are now grouped: `clean-jsdoc i18n extract`,
`clean-jsdoc i18n prompt`, and `clean-jsdoc i18n validate`. `clean-jsdoc build`
is unchanged — it renders your site with or without locales, so it stays a
top-level command. All flags are identical; only the command path changed. The
interactive menu now offers the `i18n` group + `build`, and the
"save to package.json" feature emits the namespaced form. The top-level
namespace is reserved for future command groups.
