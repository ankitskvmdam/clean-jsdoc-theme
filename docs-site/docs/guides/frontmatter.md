---
title: Frontmatter Reference
group: Reference
order: 1
---

# Frontmatter Reference

This page lives in `docs/guides/`, so its directory-derived group would be
**"Guides"** — but its frontmatter sets `group: Reference`, **overriding** the
directory. It therefore renders under the **Reference** sidebar section even
though it sits in the `guides/` folder on disk. This proves frontmatter `group`
wins over the directory default.

## Recognized keys

| Key      | Effect                                                       |
| -------- | ------------------------------------------------------------ |
| `title`  | Page + nav label. Falls back to the humanized filename.      |
| `group`  | Sidebar section. Falls back to the humanized directory path. |
| `order`  | Sort order within the group.                                 |
| `slug`   | Override the URL (defaults to the relative path).            |
| `hidden` | Render the page but keep it out of the sidebar.              |
