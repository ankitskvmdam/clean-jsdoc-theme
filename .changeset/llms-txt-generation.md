---
'clean-jsdoc-theme': minor
'@clean-jsdoc-theme/utils': minor
'@clean-jsdoc-theme/dwar': minor
'@clean-jsdoc-theme/typedoc': minor
---

Add `llmsTxt` — generate an [llmstxt.org](https://llmstxt.org) index for your docs.

Set `llmsTxt: true` (with `siteUrl`) and the build emits `llms.txt` at the output
root — your project name, a summary, then one section per sidebar group where each
entry links a page's companion Markdown rather than its HTML — plus `llms-full.txt`
with every page concatenated. Accepts `{ full?: boolean, api?: boolean | 'index' }`:
`full: false` skips the concatenated file, `api: 'index'` lists API pages without
descriptions and omits their bodies from `llms-full.txt`, and `api: false` leaves API
pages out of both. Source-file viewer pages are never listed, and each locale of a
localized build gets its own file.

The TypeDoc plugin now also falls back to TypeDoc's own `hostedBaseUrl` when
`cleanJsdocTheme.siteUrl` is unset (the theme-specific key wins if both are set, with
a warning), so `sitemap.xml` and `llms.txt` work without repeating the URL.

`siteUrl` is now validated up front: a malformed value, or `llmsTxt` enabled without
a usable site URL, reports a warning instead of silently producing nothing (and fails
the build under `strict`). A `siteUrl` carrying a path while `basePath` is unset now
warns too, since that path is dropped from emitted URLs. Option warnings are also
re-printed after the build report, so they can't scroll away behind the build log.
