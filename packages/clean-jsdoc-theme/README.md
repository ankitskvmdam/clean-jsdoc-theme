# clean-jsdoc-theme

JSDoc theme entry for v5. A thin bridge that JSDoc invokes via `require()` and that wires the four boundary packages — [setu](../setu) (JSDoc → `SiteManifest`), [dwar](../dwar) (`SiteManifest` → HTML/CSS/JS), and [Pagefind](https://pagefind.app/) (post-write search index) — into a single `publish(data, opts, tutorials)` call.

> v5 is in alpha. To stay on v4, pin `"clean-jsdoc-theme": "^4"` in your `package.json`.

## Install

```sh
pnpm add -D clean-jsdoc-theme jsdoc
```

## Usage

Add a `jsdoc.json` to your project:

```json
{
  "source": {
    "include": ["./src", "./README.md"]
  },
  "plugins": ["plugins/markdown"],
  "opts": {
    "encoding": "utf8",
    "destination": "dist",
    "recurse": true,
    "template": "./node_modules/clean-jsdoc-theme/dist"
  }
}
```

Run JSDoc:

```sh
jsdoc -c jsdoc.json
```

Then serve `dist/` over HTTP (Pagefind requires HTTP for the search index to load):

```sh
pnpm dlx serve dist
```

## What gets generated

The theme emits a page per documented container (class / interface / mixin / module / namespace / typedef), one aggregated **Globals** page, the **README** as the home page, and **tutorials** as guide pages. For each page:

- `<slug>/index.html` — a server-rendered page with a pre-hydration theme script, layout chrome (header / sidebar / TOC / footer), island markers, and the lazy island loader.
- `<slug>/index.md` — the page's Markdown, written verbatim alongside the HTML, so LLMs (and the copy-page button) can fetch the source for any page. Source-viewer pages have none.

Plus, once per build:

- `_assets/styles.<buildId>.css` — combined theme-variable layer + static utility CSS, content-hashed for caching.
- `_assets/search-index.<buildId>.json` — the fuzzy search index the command palette (`Ctrl K`) fetches on first open.
- `_islands/<name>.js` — one ESM chunk per island (`sidebar`, `mobile-nav`, `toc`, `toc-mobile`, `cmdk`, `code-tabs`, `copy-btn`, `copy-page`, `theme-toggle`, `settings`, `code-viewer`). Each page loads only the chunks whose markers are present.
- `pagefind/…` — an optional Pagefind full-text index, built against the on-disk HTML.

When `templates.default.outputSourceFiles` is on (default), every documented source file also becomes a read-only viewer page, with a flat **Source Files** index and a `Source: file:line` link on each member.

`opts.package` (the path to your `package.json` if you pass `--package`) flows into the manifest as `pkg.name` / `pkg.version` / `pkg.repository` / etc. for footer and `<meta>` tags. If not provided, the theme falls back to JSDoc's automatic `kind: 'package'` doclet, then to no metadata.

## Configuration

All keys go under `opts` in `jsdoc.json` (unless noted):

| Key                                     | Type                                            | Description                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `siteName`                              | `string` \| `{ default?, dark?, light?, alt? }` | Header/footer identity + `<title>` suffix. A string, or a per-theme logo set (local images are copied to `_assets/logo-*`).                                              |
| `fonts`                                 | `{ heading?, body?, mono? }`                    | Google Fonts family names for `heading`/`body`; `mono` is a CSS stack.                                                                                                   |
| `sectionOrder`                          | `string[]`                                      | Orders **and** filters the sidebar sections (e.g. `["Classes","Modules","Tutorials"]`).                                                                                  |
| `menu`                                  | `{ id?, title?, link?/href?, icon? }[]`         | Full sidebar top region (built-in `home`/`source` links + external links). Takes precedence over `sectionOrder`'s built-ins.                                             |
| `clubSidebarItems`                      | `boolean`                                       | Club related entries into collapsible `parent → children` groups by path prefix (e.g. all `queue/*` under `queue`). Off by default.                                      |
| `aiPrompt`                              | `string`                                        | Custom prompt for the copy-page "Open in …" actions. `{siteName}`, `{url}`, `{mdUrl}` are substituted; only the prompt + links are sent (the AI fetches `{mdUrl}`).      |
| `copyPage`                              | `boolean` \| `{ enabled?, actions? }`           | The copy-page button. `false` hides it; `actions` is an ordered subset of `["copy","view","claude","chatgpt","perplexity"]` (`[]` = primary button only). On by default. |
| `templates.default.outputSourceFiles`   | `boolean`                                       | Emit source-viewer pages + `Source:` links. On by default.                                                                                                               |
| `templates.default.sourceLinkToComment` | `boolean`                                       | Make `Source:` links land on the doc-comment line instead of the declaration. Off by default.                                                                            |

The default theme uses a light/dark OKLCH palette, system fonts, and the [GitHub Light](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-themes/themes/github-light.json) / [GitHub Dark](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-themes/themes/github-dark.json) shiki themes. Full token + component overrides land before stable.

> **Pagefind is optional.** If `pagefind` isn't installed in the consuming project, the publish step warns and continues without the full-text index (the fuzzy palette still works).

## How it works

`publish.ts` is small by design — every non-trivial concern lives in one of the boundary packages:

```
JSDoc 4 invokes publish(data, opts, tutorials)
  │
  ├── setu.generateSite(data, { pkg, readme, tutorials, sources, … }) → SiteManifest
  │     (one MDX page per container + globals + home + tutorials)
  │
  ├── dwar.render(manifest, { theme, destination }) → RenderResult
  │     (Preact SSR + esbuild island bundles + CSS)
  │
  ├── writeOutputFiles(destination, result.files)
  │     (mkdir -p + writeFile loop; Windows-safe via node:path)
  │
  └── dwar.runPagefindAgainstDir(destination)
        (post-write search index; optional)
```

The CJS bundle dynamic-`import()`s setu and dwar via `file://` URLs because both are ESM-only with `"type":"module"` while JSDoc 4 loads themes via `require()`. The bridge walks `node_modules` from its own location, so it works regardless of where JSDoc was invoked.

See the per-package READMEs for deeper detail:

- [`@clean-jsdoc-theme/utils`](../utils) — type contracts and slug rules
- [`@clean-jsdoc-theme/setu`](../setu) — JSDoc → SiteManifest
- [`@clean-jsdoc-theme/rang`](../rang) — Preact components + island registry
- [`@clean-jsdoc-theme/dwar`](../dwar) — SiteManifest → OutputFile[]

## End-to-end example

[`examples/basic/`](../../examples/basic) is the working reference: a tree of JSDoc-annotated source files in `src/`, tutorials, a `jsdoc.json` exercising the config above, and `pnpm run docs` produces the full `dist/`.

## License

MIT.
