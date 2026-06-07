# Plan: Render all JSDoc kinds

> Handoff for a remote session. Execute this **before**
> [`plan-link-resolution.md`](./plan-link-resolution.md) — link resolution needs
> every target to have a page, so all kinds must render first.

## Context

setu currently generates **`kind: 'class'` pages only** (plus README → home,
tutorials → guides, source-file viewers). Every other documented kind —
modules, namespaces, interfaces, mixins, typedefs, and globals — is silently
dropped. This blocks `{@link}`/`@see` resolution (targets like
`{@link module:documents/probe.find}` or `base/chains#open` have no page to point
at) and leaves most of a real codebase undocumented.

The page-side plumbing is **already wired**:
- `PageKind` (`packages/utils/src/site/page.ts`) already includes
  `module | namespace | mixin | interface | typedef | global`.
- The nav grouping `KIND_GROUPS` (`packages/setu/src/generate-site.ts`) already
  maps every one of those kinds to a sidebar group, in display order
  (Modules → Namespaces → Classes → Interfaces → Mixins → Typedefs → Globals).

So **all missing work is on setu's generation side**, where these hardcode
`kind: 'class'`:
- `getCanonicalClassDoclet`, `getAllMembersOfClass` — `packages/setu/src/doclet.ts`
- `getClassView` — `packages/setu/src/class-view.ts`
- `enumerateClassLongnames`, `buildClassPage` — `packages/setu/src/generate-site.ts`
- the class-only build loop in `generateSite` — `packages/setu/src/index.ts`

## Decisions (locked this session)

1. **ContainerView** — generalize the class view/renderer into one
   kind-parametric path covering class/interface/mixin/module/namespace. **Not**
   per-kind copy-paste files. Class keeps its constructor-params special case.
   Typedef + globals get small dedicated builders that reuse the shared pieces.
2. **Globals** — **one aggregated "Globals" page**; each global symbol is a
   section on it (synthetic container). One nav entry.
3. **events / enums / constants** — rendered as **member sections within their
   parent page only**. No standalone pages this round (they're already bucketed by
   `bucketClassMembers`).

## Constraint: keep all 118 existing setu tests green

Existing tests/imports reference `getClassView`, `classViewToMdast`,
`getCanonicalClassDoclet`, `getAllMembersOfClass`, `enumerateClassLongnames`,
`buildClassPage`. **Keep every one of these as a thin alias/delegation** to the
generalized function. The class-rendering output must stay byte-identical after
the refactor (phase 2 is a pure refactor).

---

## Implementation

### 1. Generalize doclet helpers — `packages/setu/src/doclet.ts`

- `getCanonicalClassDoclet(collection, longname)` →
  `getCanonicalDoclet(collection, longname, kind?)`: query by longname (+ optional
  kind), keep the existing documented/most-populated selection logic. Re-export
  `getCanonicalClassDoclet` as `(c, ln) => getCanonicalDoclet(c, ln, 'class')`
  (still used by `walkAugmentsChain`).
- `getAllMembersOfClass(collection, longname)` →
  `getMembersOf(collection, longname)`: drop the `kind:'class'` guard (redundant —
  callers check the canonical doclet first); body becomes just
  `collection({ memberof: longname }).get()`. Keep `getAllMembersOfClass` as an
  alias.

### 2. ContainerView — `packages/setu/src/class-view.ts`

- Add `ContainerView` = current `ClassView` shape + a `kind: PageKind` field.
- `getContainerView(collection, longname, kind, options)`: composes the canonical
  doclet + `bucketClassMembers([...own, ...inherited])`.
  - Inheritance walk (`walkAugmentsChain` / `getInheritedMembers`) runs **only for
    class and interface** (the kinds that `@augments`/`@extends`). Other containers
    use own members only.
  - `constructorParams` populated **only for class** (`canonical.params`); empty
    array otherwise.
- `getClassView` becomes `getContainerView(collection, longname, 'class', options)`.
- `bucketClassMembers` and `shadowKey` are kind-agnostic — reuse unchanged.

### 3. Renderer — `packages/setu/src/mdast/class-view.ts`

- `classViewToMdast` → `containerViewToMdast(view, options)`: same flow
  (title → `classRelationsBlocks` → `sourceLinkBlock` → `docletBlocks` with the
  existing `skip: ['params','returns','yields','throws']` set → `memberSections`),
  with one change: emit the **Constructor** section only when
  `view.constructorParams.length > 0` (class only). Empty relations/member sections
  already drop out via `hideEmptySections`.
- Keep `classViewToMdast` as an alias delegating to `containerViewToMdast`.
- `docletBlocks` (`packages/setu/src/mdast/doclet.ts`) is already kind-agnostic and
  was just extended to render every block tag (params, properties, returns, yields,
  throws, type, default, fires, listens, modifiers, relations, this, alias,
  summary, metadata). Typedef pages render their `type`/`properties`/params/returns
  through it with **no change**.

### 4. Page builders + enumeration — `packages/setu/src/generate-site.ts`

- Add `enumerateLongnamesByKind(collection, kind)` — same dedup +
  `undocumented`-skip logic as `enumerateClassLongnames`, parametric on kind. Keep
  `enumerateClassLongnames` as `(c) => enumerateLongnamesByKind(c, 'class')`.
- `buildClassPage` → `buildContainerPage(collection, longname, kind, sourceLink)`:
  set `frontmatter.kind = kind`; slug via the existing
  `slugifyPath(splitLongnameForSlug(longname))` (already splits on `:` so
  `module:foo/bar` → `module/foo-bar`, distinct from a `foo/bar` class).
  Keep `buildClassPage` as an alias passing `'class'`.
- Add `buildGlobalsPage(collection): Page | null`:
  - `filterDoclets(collection({ scope: 'global' }).get())` minus kinds that get
    their own page (`class`, `interface`, `mixin`, `module`, `namespace`,
    `typedef`).
  - `bucketClassMembers` the remainder.
  - Render a synthetic `ContainerView` (`{ doclet: { kind:'global', name:'Globals' },
    augments: [], constructorParams: [], ...buckets }`) via `containerViewToMdast`.
  - `slug: 'global'`, `frontmatter: { title: 'Globals', kind: 'global' }`.
  - Return `null` when there are no globals.

### 5. Orchestration — `packages/setu/src/index.ts`

- Replace the class-only loop in `generateSite` with:
  1. For each container kind in
     `['module','namespace','class','interface','mixin']`:
     `enumerateLongnamesByKind` → `buildContainerPage`.
  2. Typedef pages (`enumerateLongnamesByKind(collection, 'typedef')`).
  3. `buildGlobalsPage(collection)`.
- Push all into `pages`. `buildNav` already buckets by `frontmatter.kind` in
  `KIND_GROUPS` order — no nav change. README, tutorials, and source pages are
  unchanged.
- Update the `generateSite` doc comment (drop "API pages cover `kind: 'class'`
  only today").
- **Dedup guard for the module-exports-a-class overlap.** The fixture's
  `base/chains` is declared `@module base/chains` + `@constructor` + `@exports
  base/chains`, so JSDoc may emit both a `module:base/chains` doclet and a class
  doclet for the same symbol. Dedup emitted pages by slug; if both exist, prefer
  the documented container and skip the duplicate (log it, don't crash).

### 6. Docs + tests

- Update `ARCHITECTURE.md` (setu section): replace the "API coverage today:
  `kind: 'class'` only" paragraph with the new coverage — container kinds
  (class/interface/mixin/module/namespace) + typedef pages + one aggregated globals
  page; events/enums/constants as member sections.
- Tests in `packages/setu/src/__tests__/`:
  - `getContainerView` across kinds (module/namespace/interface/mixin), asserting
    member bucketing and that `constructorParams` is empty for non-class.
  - `buildGlobalsPage` (present when globals exist; `null` when none).
  - A `generate-site`/`index` test asserting module/namespace/interface/mixin/
    typedef pages appear with the correct `frontmatter.kind` and slug shape, and
    that the duplicate-slug guard fires for `base/chains`.
  - All 118 existing tests must still pass.

---

## Suggested execution phases (sequential, one subagent per phase)

1. **Handoff docs** — already done (this file + `plan-link-resolution.md`).
2. **Refactor** — generalize `doclet.ts`, `class-view.ts`, `mdast/class-view.ts`
   behind aliases. Pure refactor: class output byte-identical, all tests green.
3. **Container kinds** — enable module/namespace/interface/mixin in
   `generate-site.ts` + `index.ts`; add the dedup guard. Test.
4. **Typedef** pages. Test.
5. **Globals** page. Test.
6. **Docs + e2e** — ARCHITECTURE.md update + fixture build.

---

## Verification

```sh
pnpm --filter @clean-jsdoc-theme/setu run typecheck   # clean
pnpm --filter @clean-jsdoc-theme/setu run test        # 118 existing + new, all green

# End-to-end (fixture exercises modules, a mixin, namespaces, typedefs, globals):
cd examples/basic && pnpm run docs && pnpm dlx serve dist
```

Confirm `dist/` now contains module/namespace/interface/mixin/typedef pages and a
`global/` page, all reachable from the sidebar under their groups; spot-check that
`base/chains`, `documents/*`, and `mixins/*` render with members bucketed
(methods/fields/events) and that no symbol crashes or produces a duplicate page.
