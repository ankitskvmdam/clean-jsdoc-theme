# examples/basic

End-to-end fixture for `clean-jsdoc-theme` v5. A [`src/`](./src) of
JSDoc-annotated source files — exercising modules, namespaces, classes,
interfaces, mixins, typedefs, constants/enums, and globals, plus tutorials and a
README — and a minimal [`jsdoc.json`](./jsdoc.json) that points `opts.template`
at the workspace `clean-jsdoc-theme` package.

This is also the integration test for the publish bridge in
`packages/clean-jsdoc-theme/src/publish.ts`. If something regresses across setu,
rang, dwar, or the bridge itself, `pnpm run docs` will be the loudest first signal.

## Run

```sh
pnpm install
pnpm run docs
```

That runs `build:theme` (turbo rebuilds the upstream packages) then
`jsdoc -c jsdoc.json`, printing a per-route build report (page/asset counts +
sizes, with gzip) and writing `dist/`:

```
dist/
├── _assets/styles.<buildId>.css
├── _islands/<name>.js          # one ESM chunk per island present on a page
├── pagefind/…                  # Pagefind search index + UI assets
├── index.html                  # the README, rendered as the home page
├── module/…                    # module / namespace / interface / typedef pages
├── <class>/…                   # class & mixin pages (e.g. user/, loggermixin/)
├── global/index.html           # the aggregated globals page
├── tutorials/…                 # guide pages from the --tutorials tree
└── source/…                    # read-only source-file viewer pages
```

Pages are grouped in the sidebar by kind (Modules → Namespaces → Classes →
Interfaces → Mixins → Typedefs → Globals), with Tutorials and Source Files below.

## Inspect visually

Pagefind requires HTTP for its WASM + JSON fetches:

```sh
pnpm dlx serve dist
```

Or use the bundled dev script (jsdoc + nodemon + serve, all concurrent):

```sh
pnpm run dev
```

## What the example is exercising

- **Real JSDoc input** — a taffy collection produced by `jsdoc` against the `src/` files, not a hand-rolled fixture.
- **All documentable kinds** — container kinds, typedefs, and an aggregated globals page, with events/enums/constants rendered as member sections.
- **Slug separation + dedup** — `BaseEntity` lives under `module/coreschema/…` (its longname embeds the module); the module-exports-a-class overlaps (`Queue`, `RetryJob`) collapse to a single page via setu's slug-dedup guard (logged as a skip).
- **Link resolution** — `{@link}` / `@see` cross-references (e.g. `@see base/chains#open`) become real anchors to the target page + member hash; external URLs open in a new tab.
- **Prose surfaces** — the project README becomes the home page; the `--tutorials` tree becomes guide pages.
- **Source viewer** — each documented source file gets a `kind: 'source'` page with a CDN-loaded Monaco viewer, and members link back to `source/<file>#L<n>`.
- **Pre-hydration theme script** — every page sets `data-theme` on `<html>` before the stylesheet link to avoid FOUC.
- **Per-page island markers** — the lazy loader at the bottom of each page imports only the chunks whose markers are present (content pages get sidebar/mobile-nav/toc/cmdk/theme-toggle/settings; code blocks add copy-btn/code-tabs; source pages get code-viewer).
- **Real Pagefind index** — search across all rendered pages, with metadata in `pagefind/pagefind-entry.json`.

## Notes

- `jsdoc.json` uses `"template": "./node_modules/clean-jsdoc-theme/dist"` (path-relative) so JSDoc's `require()` resolves the workspace symlink correctly on Windows. The bare package name also works on POSIX.
- `examples/basic` consumes the theme's **built `dist`**, so `docs` runs `build:theme` first — a change in any upstream package (utils / setu / rang / dwar) won't reach the site without it.
