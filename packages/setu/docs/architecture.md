# Architecture: `@clean-jsdoc-theme/setu`

Reference doc for humans and LLMs working on the setu package. Read this
before adding features, refactoring, or extending the renderer.

For background on the JSDoc data model itself, see
[`how-jsdoc-works.md`](./how-jsdoc-works.md). For deferred work, see
[`todo-content-structuring.md`](./todo-content-structuring.md).

---

## Purpose and scope

Setu turns a JSDoc 4 doclet collection into MDX strings ready for a
documentation renderer (Astro, Next.js, anything that eats MDX).

**In scope.** Doclet validation; doclet querying (members, ancestors,
shadowing); building structured "views" per documentable kind (class today;
module, mixin, namespace, interface, global later); turning views into
mdast trees; serializing mdast to MDX strings with frontmatter.

**Out of scope.** HTML, CSS, JSX, Astro components, file writing on disk
(callers do that), URL resolution for `{@link}` (later pass), sidebar /
navigation (separate component — see
[`todo-content-structuring.md`](./todo-content-structuring.md)).

---

## Pipeline

```
                    ┌─ validate ─┐
salty collection ──►│  doclet DB │──► query layer ──► view layer ──► mdast layer ──► MDX string
                    └────────────┘     doclet.ts       class-view.ts   mdast/*.ts      mdx.ts
                          ▲                                                             │
                          │                                                             ▼
                       schema in                                                  output to caller
                  @clean-jsdoc-theme/utils
```

Each arrow is a function boundary. Layers above only know about the layer
directly below. No layer reaches across.

---

## Module map

| Path | Owns |
|---|---|
| `src/validate.ts` | Narrows `unknown` → typed salty collection. Throws on shape mismatch. |
| `src/helper.ts` | Tiny string helpers (e.g. `makeStringSafeForOSFilename`). |
| `src/name-registry.ts` | `NameRegistry`: assigns unique filesystem-safe slugs to longnames. |
| `src/doclet.ts` | Doclet **queries** (`getAllMembersOfClass`, `getCanonicalClassDoclet`) and the **visibility filter** (`filterDoclets`). Kind-agnostic. |
| `src/class-view.ts` | Builds a `ClassView` from a collection + longname. Includes inheritance walking (`walkAugmentsChain`, `getInheritedMembers`), shadowing, bucketing. |
| `src/mdast/builders.ts` | Compact mdast node constructors (`p`, `h`, `code`, `ul`, …). Pure. |
| `src/mdast/from-html.ts` | HTML → mdast blocks/inline via turndown + `mdast-util-from-markdown`. |
| `src/mdast/doclet.ts` | Per-doclet mdast helpers: description, params, returns, examples, deprecation, metadata, plus composer `docletBlocks(doclet, options)`. Kind-agnostic, reusable across views. |
| `src/mdast/class-view.ts` | Class-page mdast composition: title, relations, constructor section, member sections. |
| `src/mdx.ts` | mdast Root → MDX string via `mdast-util-to-markdown`, plus frontmatter. |
| `src/index.ts` | Public entry point (currently placeholder). |
| `src/__tests__/` | Vitest specs alongside source. |
| `scripts/preview-class.ts` | Generates `preview/<longname>.mdx` for visual inspection. |

---

## Layered architecture

### 1. Schema layer (`@clean-jsdoc-theme/utils`)

Zod schemas for doclets (`DocletSchema`, `PackageDocletSchema`,
`DocletListSchema`, …) and inferred TypeScript types (`TDoclet`,
`TDocletParam`, `TJSDocSaltyCollection<T>`). When JSDoc emits a field
not yet in the schema (e.g. `isEnum`, `tutorials`), add it here first.

### 2. Validation (`validate.ts`)

`validateCollectionOrThrow(collection)` is an **assertion function**: on
return, TypeScript narrows the argument to a typed salty collection. Any
downstream code can then assume the shape. Throws with an actionable
error citing the first zod issue when validation fails.

### 3. Query layer (`doclet.ts`)

Thin wrappers over the salty query API. Each function takes a typed
collection and returns plain doclet arrays — no views, no mdast.

- `getAllMembersOfClass(collection, longname)` — `memberof: longname` query, gated by the class actually existing.
- `getCanonicalClassDoclet(collection, longname)` — picks the merged record from JSDoc's typical 2–3 class doclets for the same longname (the one without `undocumented: true`).
- `filterDoclets(doclets, options)` — visibility filter (`includeUndocumented`, `includePrivate`). Shared by every consumer.

When adding queries for other kinds, keep them here. Pattern: `getX(collection, ...) → TDoclet[]`.

### 4. View layer (`class-view.ts`, future: `module-view.ts`, …)

A **view** is the structured payload for one page. It is the boundary
between "JSDoc model" and "render model". Today only `ClassView`
exists. The pattern, for any new kind:

```
getKindView(collection, longname, options): KindView | null
  ├── pick canonical doclet (handling JSDoc's duplicate-doclet quirks)
  ├── gather own members (filtered)
  ├── walk relations (augments for class; implements; mixes; …)
  ├── collect inherited members + shadow against own
  └── bucket members by role
```

For `ClassView`, the small pieces are all separately exported and unit-tested:

- `shadowKey(doclet)` — pure key for "two members shadow each other?".
- `bucketClassMembers(members)` — pure: flat list → buckets.
- `walkAugmentsChain(collection, longname)` — BFS ancestor longnames; cycle-safe.
- `getOwnClassMembers(collection, longname, options)` — own, filtered, with `inheritedFrom` set on JSDoc-fabricated inherited doclets.
- `getInheritedMembers(collection, longname, options, shadowedBy)` — ancestor members not in `shadowedBy`; closer ancestor wins.
- `getClassView(collection, longname, options)` — composer.

When implementing `ModuleView`, `MixinView`, `NamespaceView`, etc., reuse the building blocks where they generalize (`bucketClassMembers` may work as-is; `walkAugmentsChain` is class-only; the `getOwn…` + dedup pattern carries over).

### 5. mdast layer (`mdast/*`)

mdast (Markdown AST) is the canonical intermediate representation. Three
sub-layers, each with a clear boundary:

#### 5a. `builders.ts` — node constructors

Tiny pure functions returning mdast nodes (`p`, `h`, `code`, `inlineCode`,
`strong`, `emphasis`, `link`, `ul`, `ol`, `li`, `hr`, `html`, `root`).
No business logic. Add new builders here when a new node type is needed.

#### 5b. `from-html.ts` — HTML ingestion

JSDoc emits HTML in `description`, `summary`, `classdesc`, `deprecated`
(when given a reason string), and `params[].description`. `from-html.ts`
exports two paths:

- `htmlToMdastBlocks(html)` — block-level (paragraphs, lists, code blocks).
- `htmlToMdastInline(html)` — pulls inline content out of a single paragraph for embedding in list items, cells, etc.

Pipeline: `turndown` (HTML → markdown string) → `mdast-util-from-markdown` (markdown string → mdast). `{@link}` and other JSDoc inline tags pass through as literal text — URL resolution is a deferred pass.

#### 5c. `doclet.ts` — per-doclet helpers (**reusable**)

Functions in this file work on any doclet kind. They take a `TDoclet`
(plus options) and return mdast blocks. This is the layer to extend when
adding rendering for new fields.

Small focused helpers:

- `descriptionBlocks` / `summaryBlocks`
- `examplesBlocks` (handles `@example`)
- `inheritedFromParagraph`
- `deprecationBlock`
- `paramsList` (with **nested-param** handling for `options.timeout`-style)
- `returnsList` / `yieldsList` / `throwsList`
- `metadataList` (since, version, see, todo, author, tutorials, requires)
- `typeExpressionInline` / `typeExpressionString`

Composer:

- `docletBlocks(doclet, options)` — assembles all of the above into the standard per-doclet body. Accepts a `skip` set (`'params'`, `'returns'`, …) so callers can suppress sections they're surfacing elsewhere (e.g. the Constructor section in a class page).

#### 5d. `class-view.ts` — class-page composition

Takes a `ClassView` and emits an mdast `Root`. Composed of:

- `defaultSections(buckets)` — section order.
- `memberBlocks(member, options, headingLevel)` — one member → heading + body.
- `memberSections(sections, options)` — N sections, empty ones dropped.
- `classRelationsBlocks(doclet)` — extends/implements/mixes lines.
- `classViewToMdast(view, options)` — top-level.

When adding `moduleViewToMdast`, `mixinViewToMdast`, etc., reuse `docletBlocks`, `memberBlocks`, `memberSections`. The section taxonomy and any kind-specific blocks (e.g. a module's "Exports" header) live in the new file.

### 6. MDX serialization (`mdx.ts`)

- `toMdx(tree, { frontmatter })` — wraps `mdast-util-to-markdown` with the project's serializer config (`-` bullets, ATX headings, fenced code, etc.) and prepends YAML frontmatter.
- `classViewToMdx(view, options)` — convenience: `getClassView` → `classViewToMdast` → `toMdx` with a default class frontmatter.

Frontmatter is built and prepended as a string; we don't use `mdast-util-frontmatter` to keep dependency surface small.

---

## Key types (quick reference)

| Type | From | Role |
|---|---|---|
| `TDoclet` | utils | One JSDoc doclet. Open shape — most fields optional. |
| `TDocletParam` | utils | Param / return / yield / throw record. |
| `TJSDocSaltyCollection<T>` | utils | Wrapped taffy DB; callable for queries. |
| `FilterDocletsOptions` | `doclet.ts` | `{ includeUndocumented?, includePrivate? }`. |
| `ClassMember` | `class-view.ts` | `TDoclet` + optional `inheritedFrom: string`. |
| `MemberBuckets` | `class-view.ts` | Bucketed members by role. |
| `ClassView` | `class-view.ts` | `{ doclet, augments, constructorParams, …buckets }`. |
| `DocletBlocksOptions` | `mdast/doclet.ts` | Subheading level, example lang, `skip` set. |
| `ClassViewToMdastOptions` | `mdast/class-view.ts` | Extends `DocletBlocksOptions` with page-level knobs. |
| `Root`, `Paragraph`, `Heading`, … | `mdast` | Standard mdast nodes. |
| `NameRegistry` | `name-registry.ts` | Assigns unique filesystem-safe slugs. |

---

## Extension guide

### Adding a new view (e.g. `ModuleView`)

1. **Query helpers in `doclet.ts`.** If you need a new query (e.g. "all top-level doclets of a module"), add it here. Keep it kind-agnostic where possible.
2. **`src/module-view.ts`.** Define `ModuleView` + `getModuleView(collection, longname, options)`. Reuse `filterDoclets` and `shadowKey` where they apply. If the bucketing differs from classes, write a `bucketModuleMembers` similar in shape to `bucketClassMembers`.
3. **`src/mdast/module-view.ts`.** `moduleViewToMdast(view, options)`. Reuse `docletBlocks` for per-member bodies and `memberSections` for layout. Add module-specific blocks (e.g. exports table) inline.
4. **`src/mdx.ts`.** Add `moduleViewToMdx(view, options)` mirroring `classViewToMdx`. Use a kind-appropriate default frontmatter.
5. **Tests.** A `__tests__/module-view.test.ts` for the view layer and a `__tests__/mdx-module-view.test.ts` for end-to-end mdx.
6. **Preview.** `scripts/preview-module.ts` (or extend `preview-class.ts` to dispatch on kind).

### Adding a new per-doclet field

The new field flows through three places:

1. Add it to `DocletSchema` in `packages/utils/src/doclet-schema.ts`, then rebuild utils (`pnpm --filter @clean-jsdoc-theme/utils build`).
2. Add an extractor or builder in `src/mdast/doclet.ts` (e.g. `licenseBlock`, `authorList`).
3. Wire it into `docletBlocks` behind a section name so callers can `skip` it.

### Adding a new mdast node type

Add a builder in `src/mdast/builders.ts`. Keep it minimal — just the type-safe constructor. Any composition logic lives elsewhere.

---

## Conventions

**File granularity.** One responsibility per file. Don't grow `class-view.ts` to also cover modules. Don't put mdast builders in `class-view.ts`.

**Function granularity.** Small, named, separately testable. If a function does more than one thing, split it. The "composer" pattern (small helpers + a composer that wires them) is used in both `class-view.ts` and `mdast/doclet.ts`.

**Pure where possible.** Builders, formatters, and extractors should be pure. Query helpers depend on the collection but are otherwise pure.

**No I/O in `src/`.** File writing, network, env reads live in scripts or in the caller. Setu returns strings.

**Errors at the boundary.** `validate.ts` throws; downstream code assumes valid input. If a helper hits a "shouldn't happen" case, return `null` or empty arrays rather than throwing.

**Tests live next to source.** `src/foo.ts` → `src/__tests__/foo.test.ts`. Use the `getJSDocTaffyData()` factory for real-world cases; build small synthetic fixtures inline when the shared fixture doesn't cover the scenario (e.g. inheritance — the shared fixture has no `augments`).

**Frontmatter is prepended as a string.** Don't pull in `mdast-util-frontmatter` unless we need to round-trip MDX with frontmatter through the mdast pipeline.

**JSDoc HTML stays HTML until ingestion.** Never parse HTML by hand. Always go through `from-html.ts`.

---

## What exists today

- ✅ Validation (`validate.ts`)
- ✅ Filename slugging (`helper.ts`, `name-registry.ts`)
- ✅ Class queries + canonical doclet picker (`doclet.ts`)
- ✅ `ClassView` with inheritance walking, shadowing, bucketing (`class-view.ts`)
- ✅ mdast builders, HTML ingestion, per-doclet helpers (`mdast/*`)
- ✅ Class-page mdast composition + MDX serialization (`mdast/class-view.ts`, `mdx.ts`)
- ✅ Preview CLI (`scripts/preview-class.ts`)

## What's next (in rough priority order)

- `ModuleView` + module-page mdast + MDX
- `MixinView` (likely a thin variant of `ClassView`)
- `NamespaceView`
- Globals view (everything `scope: 'global'` not absorbed by another view)
- `{@link Foo}` URL resolution pass (depends on a slug map for cross-doclet refs)
- Sidebar tree (see [`todo-content-structuring.md`](./todo-content-structuring.md))
- Interface view (`kind: 'interface'`)
- Typedef view (`kind: 'typedef'`)
- Tutorials passthrough

---

## Related docs

- [`how-jsdoc-works.md`](./how-jsdoc-works.md) — JSDoc data model background.
- [`todo-content-structuring.md`](./todo-content-structuring.md) — deferred sidebar feature spec.
