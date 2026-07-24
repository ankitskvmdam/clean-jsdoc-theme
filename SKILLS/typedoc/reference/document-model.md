# TypeDoc sidebar, document model & rendering

The TypeDoc output matches **default TypeDoc's** structure, not the JSDoc
template's. All of this is **flavor-gated and automatic** — setu's `generateSite`
takes `flavor: 'typedoc'`, and the JSDoc document model is untouched. None of it
needs configuration.

Contents: [The sidebar](#the-sidebar) · [The document model](#the-document-model) ·
[Signature rendering](#signature-rendering) · [TypeDoc-specific rendering](#typedoc-specific-rendering) ·
[`docs` vs `projectDocuments`](#docs-vs-projectdocuments).

---

## The sidebar

The TypeDoc sidebar is a **module / folder hierarchy**, mirroring TypeDoc's own
default theme. It is **not** the JSDoc template's flat top-level kind sections
(Classes, Interfaces, Enumerations, …).

- **Top level** = your documents first, then folders and modules, alphabetically.
  There are **no** top-level kind sections.
- **Folders** come from your source's directory structure. A folder with a
  single child is **merged** into that child (`compactFolders`) — a lone
  `Component` under `base/` shows as `base/Component`, not two nested levels.
- **Each module is a clickable, expandable node**: clicking the label opens the
  module's own page; the chevron reveals its members.
- **Members nest under their module**, ordered by **kind** — Enumerations →
  Classes → Interfaces → Type Aliases → Variables → Functions — then
  alphabetically. There are no per-kind sub-headings in the sidebar itself (kind
  grouping still appears on the module's own page body).
- **Namespaces** inside a module nest the same way.

### What the sidebar levers do (and don't) do here

> **`@category`, `@order`, `sectionOrder`, and `clubSidebarItems` do NOT reshape
> the TypeDoc API sidebar.** The module hierarchy owns it, matching TypeDoc's own
> defaults (where category/group-driven navigation is opt-in). Restoring a
> category/group-driven TypeDoc nav is **not currently configurable**.

They are still accepted and validated (the writer even canonicalizes
JSDoc-style `sectionOrder` labels like `Enums`/`Typedefs` → `Enumerations`/`Type
Aliases`), but under the module-hierarchy model they don't move API entries.

> **`collapsibleSidebarSections` is the exception — it DOES apply under TypeDoc.**
> It only toggles whether the top-level section headers collapse (chevron +
> `localStorage`); it doesn't reshape or reorder the hierarchy, so it's fully
> compatible with the module-hierarchy sidebar.

**What still works for structuring a TypeDoc site:**

- **Prose doc groups** — `docGroups` (order) + a doc page's frontmatter
  `group` / `order`. Doc-group sections render **before** the API hierarchy.
- **The `menu` top region** — custom pinned links above the sidebar.
- Native **`projectDocuments`** pages (see below) appear as documents at the top.

---

## The document model

Under `flavor: 'typedoc'`, setu matches default TypeDoc's page structure:

- **Standalone pages** for **enums, top-level functions, and variables** — each in
  its own kind section (a "Pass 1b" alongside the container pass). A
  function/variable that is a *member* of a class/interface/enum stays inside its
  owner.
- **Type aliases** are labelled **"Type Aliases"** (JSDoc calls them "Typedefs").
- **Class pages** use TypeDoc section labels: **Constructors / Properties /
  Accessors / Methods** (accessors routed by the adapter's `isAccessor` flag).
- **Enum pages** render an **"Enumeration Members"** section.
- **Module / namespace pages** are a kind-grouped **index of links** to their
  exports — not inlined member bodies (which is the JSDoc behaviour).
- **Generics** render a structured **"Type Parameters"** section (from the
  doclet's `typeParams`, populated by the TypeDoc adapter).

### Declaration blocks

Every standalone page **leads with the symbol's full declaration** as a
`<Signature>`, mirroring default TypeDoc's overview:

- A **variable** shows its value type (an object-literal `const` pretty-printed
  multiline, e.g. `HTTP_STATUS: { OK: 200; … }`).
- A **type alias** shows `Name = …` (function-type → arrow form
  `Name<T> = (p: P) => R`, object-literal → `{ … }`, else the type string).
- An **interface** shows the `interface Name<T> extends … { member; … }` body,
  built from its member buckets.

An **object-literal value** (a type alias, or a `const … as const` variable) has
its members recovered onto `properties[]` by the adapter — the same path JSDoc's
`@property` list uses — so it renders as a **Properties** section with each
member's own doc comment, and the redundant inline "Type" section is dropped.

### Overloads

**Overloaded** functions and methods render **every call signature**. The adapter
keeps the first signature on the doclet and carries the rest on `overloads[]`
(`reflection.signatures[1..]`). setu keeps the member heading a bare name and
stacks one inline `<Signature>` per overload — each with its own Type Parameters
/ Parameters / Returns and its own description — while the shared
description/examples render once. (JSDoc never sets `overloads`, so single-signature
members are unchanged.)

---

## Signature rendering

**This one is cross-cutting — it applies to both JSDoc and TypeDoc.** A
member / constructor / function heading shows the **full TypeScript signature**
(`addChild(child: Component): void`), built by setu from each doclet's
`typeParams` / `params` / `returns` types and highlighted **inline with shiki**
(a coloured `<code>`, not a heavyweight code-block card). The `name` still drives
the TOC/anchor, so `#name` is unchanged. Standalone signatures (a top-level
function/variable page, each overload) use the same highlighter through a
sibling `<Signature>` element.

---

## TypeDoc-specific rendering

Beyond the sidebar and page model, the TypeDoc output renders things the JSDoc
template can't, because they come from TypeDoc's own analysis:

- **Inheritance & relationships.** Class and interface pages get a **Hierarchy**
  list (the ancestor chain), an **Implements** section, and an **Implemented By**
  section. Individual members get captions — **Inherited from …**,
  **Overrides …**, **Implementation of …** — pointing at the related symbol.
- **`@group`.** Recognized as a sibling to `@category`. It's parsed, but — like
  `@category` — it does **not** drive the default TypeDoc sidebar.
- **`@inheritDoc`.** A member documented with `{@inheritDoc Target}` (or a bare
  `@inheritDoc` on an overriding/implementing member) shows the target's
  description and parameter/return docs in its place. TypeDoc resolves the
  reference; the theme renders the result — matching default TypeDoc semantics.
- **Async modifier badge.** Methods that are `async` (or return a `Promise`) show
  an **async** modifier badge next to their signature.
- **Object-literal type expansion.** An inline object-literal type — on a
  parameter, a return type, or a type alias/variable — expands into a **property
  table**: one row per member (name, type, optional flag, description). Type
  references inside the table stay **linked** to their documented pages.

---

## `docs` vs `projectDocuments`

Two ways to attach hand-written Markdown pages to a TypeDoc site — they both end
up as ordinary pages in the same sidebar/search:

- **`cleanJsdocTheme.docs`** — the theme's own prose-docs directory. Works
  **identically for JSDoc and TypeDoc**: the filesystem layout drives the URL and
  sidebar group, with per-file frontmatter overrides (see the umbrella skill's
  [`content-and-sidebar.md`](../../clean-jsdoc-theme/reference/content-and-sidebar.md)).
- **`projectDocuments`** — TypeDoc's **own native** input
  ([typedoc.org/options](https://typedoc.org/options/input/#projectdocuments)),
  only available to the TypeDoc output. Each `DocumentReflection` becomes one
  page (its `name` is the slug, its content rendered through the same pipeline).

They're **merged**, de-duped by path, with the `docs` directory **winning** a
collision (the explicit directory is the more deliberate authoring surface).
Pick `docs` for a shared, tool-agnostic guides folder; `projectDocuments` if
you're already organizing docs the TypeDoc-native way. Note `projectDocuments`
pages aren't run through the local-image resolver (their image paths are already
TypeDoc-resolved), whereas `docs` images route through the `_assets/` pipeline.
