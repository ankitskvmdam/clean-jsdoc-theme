---
"clean-jsdoc-theme": patch
"@clean-jsdoc-theme/utils": patch
"@clean-jsdoc-theme/setu": patch
"@clean-jsdoc-theme/rang": patch
"@clean-jsdoc-theme/dwar": patch
"@clean-jsdoc-theme/typedoc": patch
"@clean-jsdoc-theme/bhasha": patch
---

Code playgrounds, a favicon option, and a refreshed code block.

- **Playgrounds (#329).** Open an `@example` (or a code fence) in **CodePen**,
  **JSFiddle**, or **CodeSandbox**, prefilled — bringing back and generalizing
  v4's `codepen` feature. A code block's header gains an "Open Code in" dropdown;
  it's fully client-side (form POST / parameterized link — no backend, no API
  key). Configure with `opts.playground` (`enableForAllExamples`, `providers`,
  and site-wide per-provider options) and the `@playground` block tag (provider
  selection, `none`/`off`, plus `filename=` and `highlight=` for the rendered
  block). Works in prose too — a ` ```js playground ` fence or a `<playground>`
  container — and through both the JSDoc and TypeDoc bridges.

- **Favicon.** New `favicon` option — a path to an image the theme copies to a
  content-hashed asset and links as `<link rel="icon">` (with the right `type`).
  Restores the v4 option v5 had dropped, and is the way to ship an SVG favicon
  (browsers auto-discover only a root `favicon.ico`).

- **Refreshed code block.** Each block now has a header bar (a `CODE`/filename
  label plus copy and the playground dropdown), per-line highlighting, and
  configurable code-chrome colors (`codeHeaderBg` / `codeHeaderFg` /
  `codeHighlightBg` under `colors` / `darkColors`) that stay legible in light and
  dark.
