---
'@clean-jsdoc-theme/typedoc': patch
---

JSDoc-only options set in `cleanJsdocTheme` (`colors`, `darkColors`, `customCss`,
`customJs`, `customCssFile`, `customJsFile`, `hashCustomAssets`, `progress`,
`readme`, `tutorials`) now warn that the TypeDoc flavor ignores them
(`opts/unsupported-in-typedoc`). Before, `colors`/`darkColors`/`readme`/`tutorials`
were reported as unknown keys, so a strict build failed on them, and the rest
were ignored without a word. Neither this warning nor the note that
`cleanJsdocTheme.siteUrl` overrides a different `hostedBaseUrl` fails a strict
build. A `hostedBaseUrl` with a sub-path and no `basePath` still does.
