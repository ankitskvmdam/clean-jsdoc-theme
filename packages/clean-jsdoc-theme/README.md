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

For every documented `kind: 'class'` doclet, the theme emits:

- `<slug>/index.html` — a server-rendered page with a pre-hydration theme script, layout chrome (header / sidebar / TOC / footer), island markers, and the lazy island loader.
- `_assets/styles.<buildId>.css` — combined theme-variable layer + static utility CSS, content-hashed for caching.
- `_islands/<name>.js` — seven ESM chunks (one per island: `sidebar`, `toc`, `cmdk`, `code-tabs`, `copy-btn`, `theme-toggle`, `mobile-nav`). The page loads only the chunks whose markers are present.
- `pagefind/…` — the Pagefind search index, built against the on-disk HTML.

`opts.package` (the path to your `package.json` if you pass `--package`) flows into the manifest as `pkg.name` / `pkg.version` / `pkg.repository` / etc. for footer and `<meta>` tags. If not provided, the theme falls back to JSDoc's automatic `kind: 'package'` doclet, then to no metadata.

## What's covered today

- **Classes only.** Modules / mixins / namespaces / interfaces / typedefs / globals are deferred — each one lands as a mechanical addition in setu (`*-view.ts` + `mdast/*-view.ts` + a `generateSite` hook).
- **Fixed default theme.** Light palette, system fonts, the [GitHub Light](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-themes/themes/github-light.json) / [GitHub Dark](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-themes/themes/github-dark.json) shiki themes. Configurable tokens and component overrides land before stable.
- **Pagefind is optional.** If `pagefind` isn't installed in the consuming project, the publish step warns and continues without the search index.

## How it works

`publish.ts` is small by design — every non-trivial concern lives in one of the boundary packages:

```
JSDoc 4 invokes publish(data, opts, tutorials)
  │
  ├── setu.generateSite(data, { pkg }) → SiteManifest
  │     (one MDX page per documented class)
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

[`examples/basic/`](../../examples/basic) is the working reference: eight JSDoc source files in `src/`, a minimal `jsdoc.json`, and `pnpm run docs` produces a 27-file `dist/`.

## License

MIT.
