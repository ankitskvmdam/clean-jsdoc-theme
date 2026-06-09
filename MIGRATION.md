# Migration Guide

## Staying on v4

Pin the v4 major version in your `package.json`:

```json
{
  "devDependencies": {
    "clean-jsdoc-theme": "^4"
  }
}
```

v4 will continue to receive security patches for 12 months after v5 ships.

## Upgrading to v5

_Details coming when v5 stable lands. Alpha/beta releases publish under the `next` tag._

### New: a docs content directory (`opts.docs`)

v5 adds a prose-first **docs site** built from a directory of Markdown/HTML
files, where the **filesystem layout drives the URL and the sidebar grouping**.
Point JSDoc at it with `opts.docs` in `jsdoc.json`:

```json
{
  "opts": {
    "docs": "./docs",
    "docGroups": ["Getting Started", "Guides", "Reference"],
    "defaultDocGroup": "Docs"
  }
}
```

- **Slugs are clean and unprefixed** — the relative path: `docs/getting-started.md`
  → `/getting-started`, `docs/guides/advanced.md` → `/guides/advanced`.
- **Groups come from the directory** (humanized: `guides/` → "Guides"), and the
  doc-group sidebar sections render in `opts.docGroups` order. A doc with no
  group lands in `opts.defaultDocGroup`.
- **Per-file YAML frontmatter overrides** the defaults — `title`, `group`,
  `order`, `slug`, `hidden`:

  ```markdown
  ---
  title: Advanced Usage
  group: Guides
  order: 2
  ---
  ```

- The root **`docs/index.md` becomes the home page**, overriding the package
  README; with no `index.md`, the README home is used as before.

See `docs-site/` for a complete working example.

### Tutorials are unified into the docs pipeline (no change required)

Legacy **`--tutorials` keep working exactly as before** — same `tutorials.json`
hierarchy, same `tutorials/<name>` URLs, same "Tutorials" sidebar group. Under
the hood they now flow through the same builder as `opts.docs` (via a thin
adapter), but the output is byte-identical, so no migration is needed.

New docs sites should prefer `opts.docs` + frontmatter over `--tutorials` +
`tutorials.json`: frontmatter replaces the separate JSON config, and the
directory layout (rather than a flat tutorials dir) drives nesting and grouping.
The two can coexist — a project may have both a `--tutorials` tree and an
`opts.docs` directory.
