# docs-site

The dogfood documentation site for `clean-jsdoc-theme`. It builds a **prose-first**
docs site from `docs/` using the theme's new docs pipeline (`opts.docs` +
frontmatter), so the published site doubles as a real-world regression check for
the docs-directory feature.

Build it:

```sh
pnpm --filter @clean-jsdoc-theme/docs-site run docs
```

This runs `build:theme` (turbo, rebuilding the upstream package graph) then
`jsdoc -c jsdoc.json`, emitting the site to `dist/`. The root `docs/index.md`
becomes the home page; `docs/*.md` become grouped, clean-slug pages.
