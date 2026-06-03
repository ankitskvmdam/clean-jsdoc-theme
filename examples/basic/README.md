# examples/basic

Minimal end-to-end fixture for `clean-jsdoc-theme` v5. Eight JSDoc-annotated source files in [`src/`](./src) (three documented classes — `User`, `DataProcessor`, `BaseEntity` — plus modules, typedefs, constants, and utilities) and a minimal [`jsdoc.json`](./jsdoc.json) that points `opts.template` at the workspace `clean-jsdoc-theme` package.

This is also the integration test for the publish bridge in `packages/clean-jsdoc-theme/src/publish.ts`. If something regresses across setu, rang, dwar, or the bridge itself, `pnpm run docs` will be the loudest first signal.

## Run

```sh
pnpm install
pnpm run docs
```

That runs `jsdoc -c jsdoc.json` and produces a 27-file `dist/`:

```
dist/
├── _assets/styles.<buildId>.css
├── _islands/{sidebar,toc,cmdk,code-tabs,copy-btn,theme-toggle,mobile-nav}.js
├── pagefind/…              # Pagefind search index + UI assets
├── dataprocessor/index.html
├── module/coreschema/baseentity/index.html
└── user/index.html
```

Three class pages match the three `@class` doclets in `src/`. Modules, typedefs, and utility globals are intentionally not rendered yet — see the architecture doc's "What's next" section.

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

- **Real JSDoc input** — taffy collection produced by `jsdoc -c jsdoc.json` against eight files, not a hand-rolled fixture.
- **Class-only page emission** — confirms setu's `generateSite` correctly enumerates `kind: 'class'` doclets and dedupes JSDoc's multi-doclet quirks.
- **Slug separation** — `BaseEntity` lives at `module/coreschema/baseentity/` (because the doclet's longname embeds the module), while `User` and `DataProcessor` are at the root.
- **Pre-hydration theme script** — every page sets `data-theme` on `<html>` before the stylesheet link to avoid FOUC.
- **Five SSR island markers per page** — `mobile-nav`, `cmdk`, `theme-toggle`, `sidebar`, `toc`. The lazy loader at the bottom of each page imports only the chunks whose markers are present.
- **Real Pagefind index** — search across all three pages with metadata exposed via `pagefind/pagefind-entry.json`.

## Notes

- `jsdoc.json` uses `"template": "./node_modules/clean-jsdoc-theme/dist"` (path-relative) so JSDoc's `require()` resolves the workspace symlink correctly on Windows. The bare package name also works on POSIX.
- One known content-quality issue: each class page renders a duplicate `## Other` section at the bottom that re-renders the class doclet itself as if it were a member of the class. The pipeline issue is in setu's `class-view`, not the bridge.
