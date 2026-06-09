---
title: Configuration
group: Getting Started
order: 2
---

# Configuration

Another root-level page, pinned into the **Getting Started** group via frontmatter
so it sits alongside [Getting Started](/getting-started) rather than in an
ungrouped bucket. `order: 2` keeps it after that page.

## docs options

| Option            | Meaning                                                  |
| ----------------- | -------------------------------------------------------- |
| `docs`            | Directory the bridge walks for Markdown/HTML content.    |
| `docGroups`       | Explicit top-level group order in the sidebar.           |
| `defaultDocGroup` | Group label for a doc with no frontmatter/directory group. |

Slugs are the relative path with no prefix, so this file lives at
`/configuration`.
