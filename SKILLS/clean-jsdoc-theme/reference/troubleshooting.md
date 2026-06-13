# Troubleshooting & common gotchas

- **Descriptions render as raw text / Markdown not formatting (JSDoc):** you're
  missing `plugins: ["plugins/markdown"]`. It's required.
- **`@category` / `@order` / `@iframe` do nothing:** set
  `tags.allowUnknownTags: true` in `jsdoc.json`. JSDoc strips unknown tags otherwise.
- **A step's/tab's code block or list renders flat:** add **blank lines** around
  the inner content — each body is re-parsed as Markdown.
- **`@category Getting Started` made two nested groups:** spaces don't nest, only
  `/` does. `Getting Started` is one flat group whose name contains a space. Use
  `Core/Parsing` to nest.
- **A guide group appears after Classes/Modules even though I listed it first:**
  `docGroups` always appends doc groups after API sections — use `sectionOrder` to
  interleave.
- **Full-text search empty when opening `index.html` from disk:** Pagefind needs
  HTTP. Serve the folder (`npx serve dist`).
- **An embed didn't appear:** the URL must be `https://` or protocol-relative
  `//`. `http://` and relative paths are dropped (with a warning).
- **A page silently missing:** a page that fails to MDX-compile is skipped and
  reported in `RenderResult.errors` (the bridge logs it) — check the build output;
  it never aborts the whole build.
- **A bad font name or unknown option only warned:** that's the default
  (resilient). Use `strict: true` to fail the build instead.
- **A doc's slug collides with an API/home/tutorial slug:** the doc is skipped and
  logged (kind precedence: module > namespace > class > interface > mixin > typedef).
