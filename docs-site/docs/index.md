---
title: clean-jsdoc-theme
---

# clean-jsdoc-theme

Welcome to the **dogfood docs site** for `clean-jsdoc-theme` — this very page is
authored as a Markdown file (`docs/index.md`) and rendered by the theme itself.
Because it is the root `index.md`, the docs pipeline promotes it to the site
**home page** (slug `''`), overriding the package README.

## What this site exercises

- A root `index.md` that becomes the home page.
- Root-level pages with clean, unprefixed slugs (e.g. `/getting-started`).
- Grouped pages whose group comes from their **directory** (`guides/*`,
  `reference/*`).
- Frontmatter that **overrides** the directory-derived group, title, and order.
- A **frontmatter-less** file that falls back to its folder's humanized group and
  a humanized title.

Head to [Getting Started](/getting-started) to see the clean slug in action.
