# @clean-jsdoc-theme/typedoc

TypeDoc support for [`clean-jsdoc-theme`](https://github.com/ankitskvmdam/clean-jsdoc-theme).
A TypeDoc **plugin** that renders a TypeDoc project through the exact same output
as the JSDoc theme (SSR HTML + co-located `.md` + lazy islands + fuzzy search +
optional Pagefind) by feeding TypeDoc's reflections into the existing
`setu → dwar` pipeline.

> **Status:** alpha, under active development. Phase 1 (plugin scaffold + a no-op
> placeholder output) only. The reflection → doclet adapter and the
> `setu → dwar` wiring land in later phases.

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

### How output selection works (typedoc 0.28)

TypeDoc's `Outputs` registry (verified in `typedoc@0.28.19`) selects which output
writer runs, in this precedence:

1. Output **shortcuts** (`--html`, `--json`) — declarations flagged with
   `outputShortcut`. We do not register one in phase 1.
2. The dedicated **`outputs`** option — an array of `{ name, path, options? }`.
   This is the supported way to select this plugin's output (the example above).
3. `--out <path>` writes the **default** output (`"html"` unless a plugin calls
   `app.outputs.setDefaultOutputName(...)`).

So today, list `{ "name": "clean-jsdoc-theme", "path": "docs" }` in `outputs`.
A future version may also call `setDefaultOutputName('clean-jsdoc-theme')` so a
plain `--out` routes here.
