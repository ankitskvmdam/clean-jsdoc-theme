---
title: Getting Started
group: Getting Started
order: 1
---

# Getting Started

This is a **root-level** docs page. It carries no directory, so its slug is the
clean, unprefixed `/getting-started` (no `tutorials/` prefix). Its `group` and
`order` come straight from this page's YAML frontmatter.

## Install

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

## Point JSDoc at a docs directory

```json
{
  "opts": {
    "template": "node_modules/clean-jsdoc-theme",
    "docs": "./docs",
    "docGroups": ["Getting Started", "Guides", "Reference"],
    "destination": "dist"
  }
}
```

Every `*.md` under `docs/` becomes a page. The filesystem layout drives the URL
and the sidebar grouping; per-file frontmatter can override `title`, `group`,
and `order`.
