# Plan — a standalone `@order` tag for sidebar positioning

> **Status:** future / not started. Captures the design agreed after discovering
> that `@module … order=` can't work (below). Builds directly on the shipped
> `@category … order=N` ordering (`assembleNav` / `buildGroupTree` in
> `packages/setu/src/generate-site.ts`).

## Goal

Let **any** documented symbol — including plain `@module` / `@class` /
`@namespace` symbols that live in their **kind section** (Modules, Classes, …)
rather than a `@category` group — declare its sidebar position with a single tag:

```js
/**
 * @module queue
 * @order 1          // float the `queue` item to the top of its section
 */

/**
 * @module queue/Something
 * @order 1          // make `Something` the first child under the `queue` parent
 */
```

`@order` sets the page's `frontmatter.order`; the sidebar then honors it both for
**top-level position within a section** and for **child position inside a clubbed
parent**.

## Why not `@module queue order=1` (the originally-proposed syntax)

Verified empirically with `jsdoc -X` (JSDoc 4):

| Input | Resulting doclet | Verdict |
|---|---|---|
| `@module queue order=1` | `name: "queue order=1"`, `longname: "module:queue order=1"` | **name corrupted** — breaks slug, links, anchors |
| `@class Widget order=2` | `name: "Widget"`, `order=2` **absent from `tags`** | silently dropped |
| `@module queue` + `@order 1` | `name: "queue"`, `tags: [{title:'order', text:'1'}]` | **clean** — name intact, tag preserved |

`@category` can carry inline `key=value` only because it is an *unknown* tag —
JSDoc hands us its raw text untouched. `@module`/`@class`/`@namespace` are
built-in **name-bearing** tags: trailing text either pollutes the name or
vanishes. So the kv pattern cannot extend to them. A standalone unknown tag
(`@order`) is the only name-safe option, and it survives JSDoc's parser cleanly
(`allowUnknownTags`, as `@category` already relies on).

---

## Scope

- Read a standalone `@order N` block tag → `frontmatter.order` for every
  container page (module/class/interface/mixin/namespace/typedef), independent of
  whether the symbol also carries `@category`.
- Make **clubbing** (`clubNavTree`, gated by `clubSidebarItems`) order-aware:
  - clubbed **parents** sort by the **min `order`** of their members (so
    `@order 1` on any member floats the whole parent up);
  - **children** within a parent sort by `order` then name.
- Define precedence vs. the existing `@category … order=` kv.

**Non-goals (v1):** ordering top-level *sections* themselves (that stays
`sectionOrder`/`docGroups`); multi-key options on `@order`; per-member TOC
ordering within a page.

---

## Current state — verified (as of the `@category` ordering work)

- **`frontmatter.order` already flows** through the nav for `'alpha'` buckets:
  `orderLeafEntries` sorts by `order` then title, and `buildGroupTree.emit` sorts
  sibling leaves **and** branches by effective order (a branch = min order of its
  pages). So once a kind-section page *has* an `order`, leaf/branch ordering is
  already correct **for the non-clubbed path**.
- **Order is only ever set today via `parseCategory`** (the `@category … order=`
  kv). A plain `@module queue` with no `@category` has **no way** to get an
  `order` — this is the gap.
- **Clubbing ignores order.** `clubNavTree`
  (`packages/setu/src/generate-site.ts`) buckets by the label prefix before the
  first `/`, emits **parents in first-seen order**, and sorts **children
  alphabetically** with the bare-prefix `index` child pinned first. It runs on
  `NavNode[]` *after* `buildGroupTree`.
- **The leaf node reaching `clubNavTree` does not carry `order`.**
  `assembleNav` builds each API `GroupedEntry` as
  `leaf: { label, slug }` (no order; the order sits on `GroupedEntry.order`), and
  `buildGroupTree.emit` emits `{ ...e.leaf, group }` — dropping order. **This is
  the main plumbing change**: `order` must be propagated onto the emitted
  `NavNode` so clubbing can read it (or `clubNavTree` must be fed the orders some
  other way).
- **`appendSections` only re-stamps the top-level node's `order`** (to the section
  index, for the mirroring invariant) — nested children keep whatever `order`
  they were emitted with, and the sidebar renders in **array order**. So
  correctness = producing the right array order; the residual `order` field value
  on children is cosmetic.

---

## Design (resolved decisions)

1. **Tag** — a standalone `@order N` block tag. `N` parsed as a finite number;
   missing/non-numeric → unset (sorts last, alphabetical), exactly as an untagged
   page behaves today.
2. **Applies to all container pages**, set in `renderContainerPage` alongside the
   existing `@category` read. Globals/source synthetic pages: unchanged.
3. **Precedence with `@category … order=`** — the inline category `order=` and a
   standalone `@order` are the *same* underlying `frontmatter.order`. If both are
   present, **`@category … order=` wins** (it's the more specific, co-located
   declaration); otherwise whichever is present applies. (Equivalently:
   `frontmatter.order = category.order ?? readOrder(doclet)`.)
4. **Clubbed parent order** — a parent's sort key is the **min `order`** across
   its members (unset → +∞). Mirrors how `buildGroupTree` already orders branch
   nodes. Tiebreak: first-occurrence order (today's behavior), so an unordered
   section is byte-identical.
5. **Clubbed child order** — children sort by `order` then name. The bare-prefix
   `index` child leads **only among unordered children** (i.e. `index` keeps its
   pin unless an explicit `@order` pulls a sibling ahead). So
   `@order 1` on `queue/Something` places `Something` first, even ahead of the
   bare `queue` module's `index` entry.
6. **Backward compatible** — with no `@order`/`order=` anywhere, every member has
   `order = +∞`, all ties resolve to today's first-seen/alphabetical rules →
   byte-identical nav. Guard with an exact-match test.

---

## Implementation sketch

### setu — `packages/setu/src/generate-site.ts`
- **`readOrder(doclet)`** — sibling to `parseCategory`: find the first
  `@order` tag, parse its `text` to a finite number, else `undefined`.
- **`renderContainerPage`** — set `frontmatter.order = category?.order ??
  readOrder(view.doclet)` (decision 3). (`parseCategory` already yields
  `category.order`.)
- **Propagate order onto the emitted leaf** so clubbing can see it. In
  `buildGroupTree.emit`, emit `{ ...e.leaf, group, ...(e.order !== undefined ?
  { order: e.order } : {}) }`. Keep it conditional so the no-order path adds no
  `order` key (protects `toEqual` boundary tests).
- **`clubNavTree`** — make order-aware:
  - bucket as today (label prefix before first `/`);
  - compute each parent's min child `order`; **sort parents** by (minOrder,
    first-seen-index);
  - **sort children** by (order ?? +∞, then `index`-first tiebreak, then name).
  - A single-entry prefix stays flat (unchanged), but its `order` now participates
    in the parent-level sort of the section.
- Confirm `assembleNav` passes `order` through for docs/tutorials unchanged
  (docs already sort by `frontmatter.order`; tutorials stay tree-ordered).

### utils — `packages/utils/src/site/page.ts`
- Doc note only: `frontmatter.order` may now originate from a standalone `@order`
  tag as well as `@category … order=` / doc frontmatter.

### bridge / rang
- **No change.** `@order` is an unknown tag the doclet already carries; rang
  renders nav array order.

---

## Test plan
- **setu unit:**
  - `@order 3` on a plain `@module` → `frontmatter.order === 3`; non-numeric/blank
    → unset.
  - precedence: `@category X order=1` + `@order 9` → order `1`.
  - clubbing — parent float: a section with clubbed `queue` (members `queue`,
    `queue/Queue`, `queue/types`); `@order 1` on one member floats `queue` above
    an alphabetically-earlier sibling parent (`auth`).
  - clubbing — child order: `@order 1` on `queue/Something` makes `Something` the
    first child, ahead of the bare `queue` `index` child.
  - `index`-first preserved when no child carries `@order`.
- **Boundary (regression guard):** a collection with **no** `@order`/`order=` and
  `clubSidebarItems: true` → byte-identical nav to today (`toEqual`).
- **e2e:** annotate a couple of `examples/basic` modules with `@order` and confirm
  the clubbed Modules section reorders.

## Files
| File | Change |
|---|---|
| `packages/setu/src/generate-site.ts` | `readOrder`; set `frontmatter.order` in `renderContainerPage`; propagate `order` onto emitted leaves; order-aware `clubNavTree` |
| `packages/setu/src/__tests__/sidebar-groups.test.ts` | `@order` parsing, precedence, clubbed parent/child ordering, `index`-first, boundary |
| `packages/utils/src/site/page.ts` | doc note: `order` may come from `@order` |
| `ARCHITECTURE.md` | note `@order` in the setu "Sidebar nav" section |
| `examples/basic/src/**` | optional: demo `@order` on a clubbed section |

## Verification
```sh
pnpm --filter @clean-jsdoc-theme/setu run typecheck
pnpm --filter @clean-jsdoc-theme/setu run test
cd examples/basic && pnpm run docs   # eyeball the clubbed Modules order
```
Confirm: plain `@module` + `@order` reorders within its section; `@order` on a
`prefix/Child` makes it the first child; no-`@order` collection unchanged.

## Open questions / deferred
- Should `@order` also influence **top-level section** order, or stay
  `sectionOrder`-only? (Currently deferred — `@order` positions *within* a section
  only.)
- A matching `@order` for **docs/tutorials** is already covered by frontmatter
  `order`; no new surface needed there.
- Possible later unification: treat `@order` as the canonical ordering tag and
  deprecate the `@category … order=` kv in favor of co-locating `@order` — decide
  once both are in use.
