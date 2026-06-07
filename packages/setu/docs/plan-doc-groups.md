# Plan: group doc / README pages in the sidebar

> Handoff for a future session. **Not yet decided** — this doc lays out the
> research and every option per decision so the approach can be picked later.
> No code has been written. Sibling plans:
> [`plan-render-all-kinds.md`](./plan-render-all-kinds.md) (done),
> [`plan-link-resolution.md`](./plan-link-resolution.md) (done).

## Goal

Build the dogfood **`docs-site/`** from a collection of README / Markdown files,
organized into **named, ordered sidebar groups** (e.g. "Getting Started",
"Guides", "Concepts", "Reference") — instead of every Markdown page landing under
the single hardcoded "Tutorials" group.

The docs site is **prose-first** (mostly Markdown), optionally alongside API
pages. The core missing capability: a way to assign each doc page to a sidebar
group and order the groups.

---

## Current state — what blocks it

The Markdown path today:

```
JSDoc opts.tutorials dir
  → JSDoc tutorial resolver tree (titles + children from tutorials.json)
  → bridge normalizeTutorials()            packages/clean-jsdoc-theme/src/publish.ts
  → setu TutorialInput[]                   { name, title, content, type, children }
  → buildTutorialPages()                   packages/setu/src/guide-view.ts
  → Page[] + NavNode[]
```

Key facts (verified):

- **`buildTutorialPages` hardcodes one group.** Every tutorial page is emitted
  with `group: TUTORIALS_GROUP` (`'Tutorials'`), slug `tutorials/<name>`, kind
  `'guide'`, and an incrementing `order`. The JSDoc child hierarchy is flattened
  depth-first into that single group. (`packages/setu/src/guide-view.ts`,
  `buildTutorialPages` / `buildTutorialPage`.)
- **The rendering layer already supports arbitrary flat groups.**
  - `NavNode` (`packages/utils/src/site/manifest.ts`) already has `group?: string`
    and `order?: number`.
  - rang's `Sidebar` (`packages/rang/src/components/Sidebar.tsx`, `groupNav`)
    already buckets entries by their `group` label, **in the order setu emits
    them**, and renders a bold group title per bucket. Ungrouped entries (empty
    group) render with no title.
  - ⇒ For **flat** named groups, **no dwar/rang change is needed**. The only gap
    is that setu never assigns a group other than 'Tutorials'.
- **Sidebar renders ONE level only.** `groupNav` is single-level and `NavLink`
  **ignores `NavNode.children`** — nested nav trees are not rendered today. Flat
  groups work out of the box; nested sub-sections require a Sidebar change.
- **API pages** group by kind via `KIND_GROUPS` in
  `packages/setu/src/generate-site.ts` (Modules → Namespaces → Classes →
  Interfaces → Mixins → Typedefs → Globals). The nav emit order in
  `generateSite` (`packages/setu/src/index.ts`) is: Home (README) → API pages →
  Tutorials → Source Files.
- **Tutorial content arrives RAW.** `normalizeTutorials` passes `.content`
  verbatim (`.type` says markdown vs html). JSDoc's `plugins/markdown` does **not**
  touch tutorial files (it only renders doclet descriptions), so any YAML
  frontmatter in a `.md` reaches setu intact and can be parsed there. (The README
  home page, by contrast, arrives as pre-rendered HTML via `opts.readme`.)
- **JSDoc tutorial config** (`tutorials/tutorials.json`) maps `name → { title,
  children }`. JSDoc's resolver attaches `title` and builds the `children` tree;
  whether *extra* keys (e.g. a custom `group`) survive onto the `Tutorial` object
  passed to `publish` is **unverified** and likely not — see Option C below.

---

## Decision 1 — where grouping config comes from

### Option A — per-file YAML frontmatter  *(recommended)*

Each `<name>.md` declares its own placement:

```markdown
---
title: Getting Started
group: Guides
order: 10
---
# … body …
```

- `group` — sidebar group label. Missing → a configurable default
  (`defaultDocGroup`, falling back to today's "Tutorials").
- `order` — sort key within the group (missing → resolve order, then title).
- `title` — overrides the JSDoc/tutorials.json title (optional).

Group **display order** comes from a small central list (frontmatter can't
express global group ordering deterministically), e.g. in `jsdoc.json`:

```jsonc
"opts": { "docGroups": ["Getting Started", "Guides", "Reference"] }
```

Groups not listed sort after the listed ones, alphabetically.

**Pros:** scales to many files; metadata lives with content; no central registry
to keep in sync as files are added/removed; natural for a "bunch of README files."
**Cons:** needs a frontmatter parser + strip step in setu (the `---` block would
otherwise render as a thematic break); group order still needs the small central
`docGroups` list.

### Option B — central config only

A single map in `jsdoc.json` lists each group and its ordered members:

```jsonc
"opts": {
  "tutorialGroups": [
    { "label": "Getting Started", "tutorials": ["getting-started", "configuration"] },
    { "label": "Guides",          "tutorials": ["advanced-usage", "markdown-examples"] }
  ]
}
```

Group order = array order; intra-group order = `tutorials` array order;
unlisted tutorials → default group.

**Pros:** no frontmatter parsing; one obvious place to see the whole nav; no
dependence on JSDoc internals. **Cons:** must be hand-maintained and kept in sync
with the files; verbose for large doc sets.

### Option C — extend `tutorials.json`

Add a `group` key per entry in JSDoc's existing config:

```jsonc
{ "getting-started": { "title": "Getting Started", "group": "Guides" } }
```

**Pros:** familiar to JSDoc users; one file. **Cons:** **depends on JSDoc
surfacing the extra `group` key** through its tutorial resolver onto the object
`publish` receives — **must be verified first** (JSDoc's `Tutorial` typically
exposes only `name`/`title`/`content`/`type`/`children`/`parent`). If it doesn't
survive, the bridge would have to read `tutorials.json` itself, duplicating
JSDoc's file discovery. Higher risk.

### Option D — hybrid (frontmatter + central override)

Frontmatter for assignment (Option A), with `tutorialGroups` (Option B) able to
**override/pin** specific pages and define group order. Most flexible, most
surface area. Probably overkill for v1.

> **Recommendation:** Option A (frontmatter + `docGroups` order list). Best fit
> for "a bunch of README files," no JSDoc-internal dependence.

---

## Decision 2 — grouping depth

### Option A — flat named groups  *(recommended)*

One level: group label → list of pages. Works with the current Sidebar **with no
rendering change**. Covers the large majority of docs sites.

### Option B — nested sub-sections

Group → subgroup → pages (collapsible tree). Requires:
- A Sidebar rewrite to render `NavNode.children` recursively (with expand/collapse
  state — likely a new or extended island).
- A richer nav model in setu (build a `children` tree instead of a flat grouped
  list).
Larger scope; defer unless genuinely needed. JSDoc's tutorial `children` tree
could feed this later (the data is already preserved in `TutorialInput.children`).

---

## Decision 3 — URL slugs

### Option A — keep `tutorials/<name>`  *(recommended, lowest risk)*

No change to slug logic; pages stay at `/tutorials/<name>`. The link-registry and
`slugifyPath` are untouched.

### Option B — clean / group-scoped slugs

Drop the `tutorials/` prefix so docs sit at `/<name>` or `/<group>/<name>`. Nicer
URLs for a docs-first site, but needs:
- Slug generation changes in `buildTutorialPage`.
- A check against collisions with API slugs and the home slug.
- The link-registry to register the new slugs (it builds from the emitted pages,
  so this mostly follows automatically — but verify cross-links + Pagefind paths).

> (User noted this one is "already answered" — confirm the intended choice when
> picking up. Defaulting to Option A in the writeup until then.)

---

## Implementation sketch (assuming Option A / flat / keep-slugs)

### setu — `packages/setu/src/guide-view.ts`
- Add `parseFrontmatter(raw): { data: Record<string, unknown>; body: string }` —
  extract a leading `---\n…\n---\n` YAML block, parse it, return the remaining
  body. Strip it **before** `markdownToMdastBlocks` so it never renders. (Choose a
  tiny YAML reader; the repo already pulls in remark/mdast tooling — a
  frontmatter-aware remark plugin or a minimal hand parser both work. Keep it
  dependency-light.)
- `buildTutorialPages(tutorials, resolveLink?, opts?)` — `opts` carries
  `docGroups?: string[]` and `defaultDocGroup?: string`. Per page: read
  `group`/`order`/`title` from frontmatter (falling back to tutorials.json title
  and the current 'Tutorials' group). Compute group order from `docGroups`
  (listed first in order, then unlisted alphabetically); within a group sort by
  `order` then title.
- **Emit pages group-by-group in final order**, so the Sidebar's emit-order
  bucketing produces the intended group sequence. Set `NavNode.group` + `order`.
  Keep `kind: 'guide'`.

### utils — `packages/utils/src/site/...`
- Extend the setu-side `GenerateSiteOptions` (in `packages/setu/src/index.ts`)
  with `docGroups?: string[]` and `defaultDocGroup?: string`. No `NavNode` change
  (group/order already exist). (If we prefer the option type to live in utils,
  add it there and re-export.)

### bridge — `packages/clean-jsdoc-theme/src/publish.ts`
- Read `opts.docGroups` / `opts.defaultDocGroup` (and `opts.tutorialGroups` if
  Option B/D is chosen) and thread into `generateSite(...)` opts. `normalizeTutorials`
  already forwards raw `.content`, so frontmatter needs no bridge change.

### orchestration — `packages/setu/src/index.ts`
- Pass the new opts into `buildTutorialPages`. (Optional, future: make the nav
  section order — API vs docs vs source — configurable for a docs-first site. Out
  of scope for v1; today docs render after API and before source.)

### docs-site — `docs-site/`
- `docs-site/jsdoc.json`: `template` → built theme (`../packages/clean-jsdoc-theme/dist`
  or the workspace package), `tutorials` → a `docs/` dir of README files, `readme`
  → a landing README (home page), `siteName`, and `docGroups` order.
- Author the docs as grouped Markdown with frontmatter.
- `docs-site/package.json` `docs` script (mirroring `examples/basic`): turbo
  `build:theme` → `jsdoc -c jsdoc.json`. Optionally wire into the root turbo
  pipeline for dogfooding.

---

## Test plan
- **setu unit:** `parseFrontmatter` (valid block, no block, malformed); group/order
  assignment from frontmatter; fallback to default group + resolve order when
  absent; group ordering honors `docGroups` then alphabetical.
- **Integration:** a fixture tutorial set with frontmatter groups → `generateSite`
  manifest nav has the expected group labels, group order, and intra-group order;
  pages with no frontmatter fall into the default group.
- **e2e:** `docs-site` build → the rendered sidebar shows the named groups in order.
- All existing setu tests stay green (the no-frontmatter path must be byte-identical
  to today's single-'Tutorials' behavior).

## Files
| File | Change |
|---|---|
| `packages/setu/src/guide-view.ts` | frontmatter parse/strip; group/order assignment in `buildTutorialPages` |
| `packages/setu/src/index.ts` | `GenerateSiteOptions` += `docGroups` / `defaultDocGroup`; thread into `buildTutorialPages` |
| `packages/clean-jsdoc-theme/src/publish.ts` | read `opts.docGroups` (+ `tutorialGroups` if chosen) → setu opts |
| `packages/setu/src/__tests__/…` | frontmatter + grouping tests |
| `docs-site/jsdoc.json`, `docs-site/docs/*.md`, `docs-site/package.json` | the actual dogfood site |
| `ARCHITECTURE.md` | note the doc-grouping option in the setu section |
| (Option B sidebar nesting only) `packages/rang/src/components/Sidebar.tsx` | recursive `NavNode.children` rendering — **defer** |

## Verification
```sh
pnpm --filter @clean-jsdoc-theme/setu run typecheck
pnpm --filter @clean-jsdoc-theme/setu run test
cd docs-site && pnpm run docs && pnpm dlx serve dist
```
Confirm the sidebar shows the named groups in `docGroups` order, each with its
pages in the intended order, and that a frontmatter-less file still lands in the
default group.

---

## Open decisions to confirm next session
1. **Config source** — Option A (frontmatter + `docGroups`) / B (central
   `tutorialGroups`) / C (extend `tutorials.json`, needs JSDoc verification) / D
   (hybrid). *Leaning A.*
2. **Depth** — flat groups (no Sidebar change) vs nested sub-sections (Sidebar
   rewrite). *Leaning flat for v1.*
3. **Slugs** — keep `tutorials/<name>` vs clean/group-scoped slugs. *User said
   "already answered" — capture the chosen scheme here.*
4. **Nav section order** — for a docs-first site, should doc groups precede API
   groups? (Today: Home → API → docs → source.) Optional follow-up.
