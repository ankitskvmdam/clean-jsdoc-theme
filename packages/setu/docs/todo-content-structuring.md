# TODO: Content Structuring (sidebar)

Captured for later. Tracking upstream feature request:
[ankitskvmdam/clean-jsdoc-theme#203](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/203).

## What is being asked

The original issue bundles three related requests for the sidebar:

1. **Group by kind at the top level.** Headings such as Classes, Namespaces, Mixins, Global, Modules, Interfaces, Typedefs — not one flat list.
2. **Nest by `longname` hierarchy within a group.** A nested namespace such as `ParentNamespace.Child` should render as a collapsible child of `ParentNamespace`, not as a sibling.
3. **Multiple independent "taxonomies" / source sets.** A single sidebar that contains several independently-documented bodies (e.g. `Plugins`, `Modules`, `Main`) as separate top-level sections, with the option to cross-link between them.

The requester's sketch:

```
Classes                >
Namespaces             >
  | -- ParentNamespace >
      | -- Child
Global                 >
________________________

Plugins*               >
Modules*               >
```

`Plugins*` and `Modules*` are separate `source` sets — distinct JSDoc runs over different script trees — that the user wants to surface side-by-side in one navigable sidebar, with cross-references where appropriate.

## Planned shape for setu

Split the responsibility:

- **Setu (per collection):** produce a `SidebarTree` — a plain data structure grouped by `kind` at the top, nested by `memberof` within each group. No MDX, no HTML.
- **Renderer (across collections):** call setu once per source set, label each result, and compose the final UI. Cross-collection slug uniqueness is handled at this layer (e.g. `plugins/Foo`, `modules/Bar`).

Sketch of the per-collection output:

```
SidebarTree
├── group: "Classes"      → flat list (members optionally nested under each class)
├── group: "Namespaces"   → tree, nested via memberof
├── group: "Modules"      → tree, nested by module path
├── group: "Mixins"       → flat list
├── group: "Interfaces"   → flat list
├── group: "Typedefs"     → flat list
└── group: "Global"       → scope: 'global' leftovers
```

Each node carries: `label`, `longname`, `kind`, `slug` (via `NameRegistry`), `children`.
Empty groups are dropped.

Proposed API:

```ts
getSidebar(collection: TJSDocSaltyCollection<TDoclet>, options?: {
  registry?: NameRegistry;      // shared across calls for slug uniqueness
  includeUndocumented?: boolean;
  includeGlobal?: boolean;
}): SidebarTree
```

## Notes / open questions

- **Pivot for nesting is `memberof`, not splitting on `.`** — `.`, `/`, `:`, `~` all carry meaning in `longname`s, so string-splitting is fragile. `memberof` is authoritative.
- **Member-level entries** (methods/fields under each class) in the sidebar tree: undecided. Issue #203 doesn't require them.
- **Cross-collection links** rely on the renderer assigning globally-unique slugs; setu only needs to keep its own slugs internally consistent.
