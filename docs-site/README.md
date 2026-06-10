# docs-site

The documentation site for `clean-jsdoc-theme`, built **with the theme itself**.
Prose pages live in `docs/` (rendered via `opts.docs` + frontmatter) and the API
reference is generated from the sample module in `src/`.

> 🚧 Work in progress — an early preview while the v5 docs are rebuilt.

Build it:

```sh
pnpm --filter @clean-jsdoc-theme/docs-site run docs
```

This runs `build:theme` (turbo, rebuilding the upstream package graph) then
`jsdoc -c jsdoc.json`, emitting the site to `dist/`. The root `docs/index.md`
becomes the home page; the other `docs/*.md` files become grouped pages, and the
`src/` JSDoc comments produce the API reference.
