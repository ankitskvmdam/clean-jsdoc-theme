# @clean-jsdoc-theme/typedoc

TypeDoc support for [`clean-jsdoc-theme`](https://github.com/ankitskvmdam/clean-jsdoc-theme).
A TypeDoc **plugin** that renders a TypeDoc project through the exact same output
as the JSDoc theme (SSR HTML + co-located `.md` + lazy islands + fuzzy search +
optional Pagefind) by feeding TypeDoc's reflections into the existing
`setu → dwar` pipeline.

> **Status:** alpha. v1 renders a real site end-to-end: classes, interfaces,
> functions/methods, properties/accessors, enums (+ members), type aliases,
> modules/namespaces, comments (summary + block tags), params/returns/throws/
> examples/deprecated/see/category, README home, and source files + `Source:`
> links. Deferred: rich structured TS types (beyond `toString()`), type-parameter
> constraints, overloads (first signature used), re-exports/`Reference`
> reflections, and cross-`extends`/`implements` inheritance.

## Install

```sh
npm install --save-dev @clean-jsdoc-theme/typedoc typedoc
```

`typedoc` is a **peer dependency** — you bring your own TypeDoc.

## Usage

Load the plugin and select its output in `typedoc.json`. Verified against
**typedoc 0.28.x**, a custom output is selected via the `outputs` option:

```jsonc
{
  "entryPoints": ["src/index.ts"],
  "plugin": ["@clean-jsdoc-theme/typedoc"],
  "outputs": [{ "name": "clean-jsdoc-theme", "path": "docs" }]
}
```

Then run:

```sh
typedoc
```

## Options — the `cleanJsdocTheme` block

The plugin declares one namespaced option, `cleanJsdocTheme`, carrying the theme
config (the TypeDoc analog of the JSDoc theme's `opts`):

```jsonc
{
  "plugin": ["@clean-jsdoc-theme/typedoc"],
  "outputs": [{ "name": "clean-jsdoc-theme", "path": "docs" }],
  "cleanJsdocTheme": {
    // Header/footer identity — a string or a logo set { default, dark, light, alt }.
    "siteName": "My Library",
    // Google Fonts for heading/body (existence-checked); mono is a CSS stack.
    "fonts": { "heading": "Fraunces", "body": "Spline Sans", "mono": "Spline Sans Mono" },
    // Ordered sidebar section labels (filters + orders the API sections).
    "sectionOrder": ["Classes", "Interfaces", "Enums", "Typedefs", "Globals"],
    // Full sidebar menu — takes precedence over sectionOrder.
    "menu": [{ "id": "home", "title": "Home", "link": "/" }],
    // Club prefix-grouped sidebar entries into subtrees.
    "clubSidebarItems": true,
    // Copy-page button: boolean or { enabled?, actions? }.
    "copyPage": true,
    // Custom AI prompt for the copy-page button.
    "aiPrompt": "Summarize this page.",
    // Escalate validation errors (bad font / unknown key) to a hard failure.
    "strict": false
  }
}
```

Options are validated up front (`@clean-jsdoc-theme/utils`): a live Google-Font
existence check, unknown-key "did you mean" suggestions, and shape checks. The
build is **resilient by default** — a bad font or a typo only **warns** (a
missing font falls back to the default), and the build continues. Set
`"strict": true` to turn validation errors into a hard failure. A Next.js-style
build report (per-route sizes + gzip) prints after each build.

### How output selection works (typedoc 0.28)

TypeDoc's `Outputs` registry (verified in `typedoc@0.28.19`) selects which output
writer runs, in this precedence:

1. Output **shortcuts** (`--html`, `--json`) — declarations flagged with
   `outputShortcut`. This plugin does not register one.
2. The dedicated **`outputs`** option — an array of `{ name, path, options? }`.
   This is the supported way to select this plugin's output (the example above).
3. `--out <path>` writes the **default** output (`"html"` unless a plugin calls
   `app.outputs.setDefaultOutputName(...)`).

So today, list `{ "name": "clean-jsdoc-theme", "path": "docs" }` in `outputs`.
A future version may also call `setDefaultOutputName('clean-jsdoc-theme')` so a
plain `--out` routes here.
