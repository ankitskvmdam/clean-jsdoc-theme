# Content pages, the sidebar model & cross-references

Contents: [The docs directory & frontmatter](#the-docs-directory--frontmatter) ·
[The sidebar model](#the-sidebar-model) ·
[Cross-references & source links](#cross-references--source-links).

## The docs directory & frontmatter

Point `opts.docs` at a directory. Each `.md`/`.markdown`/`.html`/`.htm` file
becomes one page; `node_modules`, `.git`, and dotfiles are skipped. The filesystem
drives the URL and sidebar group:

| Field | Derivation (first match wins) |
| --- | --- |
| `slug` | frontmatter `slug` → slugified relative path with **no prefix**; `index` → `""` |
| `title` | frontmatter `title` → humanized basename |
| `group` | frontmatter `group` → humanized **directory** path → `defaultDocGroup` |
| `order` | frontmatter `order` |
| `hidden` | frontmatter `hidden` (default `false`; hidden = rendered but kept out of the sidebar) |

So `guides/Advanced Setup.md` → `/guides/advanced-setup` in group **Guides**;
`guides/setup/install.md` → nested group **Guides/Setup**. A root `index.md` is
the home page and **overrides `readme`**.

Frontmatter is a leading `---` block of **flat `key: value` scalars only** — no
nested YAML, lists, or multi-line values. A malformed/unterminated block is
treated as no frontmatter.

```markdown
---
title: Advanced Setup
group: Guides
order: 2
slug: guides/advanced
hidden: false
---

# Advanced Setup
```

## The sidebar model

One engine, several levers. Every navigable entry — API symbol, guide page,
tutorial — carries a **`group` path** (the bold top-level title, optionally a
`/`-nested branch) and an optional **`order`** (within-group sort key). That single
abstraction is why a guide and a class can share a sidebar group.

Where they come from:

| Source | `group` | `order` |
| --- | --- | --- |
| API symbol | `@category`, else kind label (Classes, …) | `@category … order=`, else `@order` |
| Guide page | frontmatter `group`, else directory, else `defaultDocGroup` | frontmatter `order` |
| Tutorial | the tutorial hierarchy (`Tutorials/<parent>/…`) | resolved tree order |

The levers:

1. **`@category` / `@order`** (source tags — see [authoring.md](authoring.md)) —
   group and order API symbols.
2. **`/`-paths nest** — first segment = bold top-level title, deeper segments =
   collapsible branches. Works from `@category`, frontmatter `group`, or directory.
3. **Leaf-vs-branch order:** within a level, sort by effective order ascending (a
   branch's effective order = the **min `order` of any page inside it**, so
   `order=1` on one nested page floats its whole subgroup up); ties → leaves
   before branches; then first-seen. No-order entries sort last, then alphabetical.
4. **`clubSidebarItems`** — collapse kind-label buckets by the prefix before the
   first `/` in their label (`queue`, `queue/Queue` → a `queue` parent; the bare
   `queue` becomes an `index` child). Mutually exclusive with `@category` nesting.
5. **`sectionOrder`** — order the top-level sections (kind labels + group names in
   one list). Omitted kind labels are dropped; category/doc groups are appended.
6. **`docGroups` / `defaultDocGroup`** — order doc-group sections (appended after
   API sections unless also named in `sectionOrder`); fallback group for ungrouped docs.
7. **`menu`** — a top region above the sections, each with an icon.

Mixing guides interleaved with API kinds (Classes between two prose groups) needs
`sectionOrder`; `docGroups` alone always appends doc groups after API sections.

## Cross-references & source links

- **`{@link}` / `{@linkcode}` / `{@linkplain}`** inline tags and **`@see`** block
  tags resolve to real cross-page anchors. setu builds a link registry from the
  pages it actually generates (two-pass, so forward references resolve), rewriting
  namepaths → page-slug + `#member` anchor.
- External URLs (`http(s)://`, `mailto:`) link directly (and `https://` opens in a
  new tab). Unresolved namepaths fall back to inline code (the look JSDoc text had).
- A **bare short name** (`{@link BaseEntity}`) resolves only when unambiguous
  across the whole registry — ambiguous names refuse to guess.
- Every documented member gets a `Source: file:line` link (default on) landing on
  the declaration line; the source-viewer page opens Monaco to that exact line.
