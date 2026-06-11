# Plan: build performance — IMPLEMENTED (2026-06-11)

The v5 pipeline was noticeably slower than a bare `jsdoc` run (~1s vs ~15–20s on
a tiny project). The stage narrator in `publish.ts` (`opts.progress`) makes the
breakdown visible. **All items below are now implemented.** The result on the
`docs-site` fixture (warm, two `jsdoc` passes per `docs` run):

| Stage | Before | After |
|---|---|---|
| Loading renderer | 4.4s | ~2.1s ← now dominant |
| Validating options | 1ms | 1ms |
| Reading sources & docs | 16ms | ~2ms (overlaps the load) |
| Generating pages | 203ms | ~50–100ms |
| **Rendering site** | **19.8s** | **~0.2–0.6s** |
| Writing files | 167ms | ~25ms |
| Indexing search | 107ms | ~70ms |

`render()`'s "Rendering site" stage went from the ~19.8s bottleneck to ~0.2–0.6s.
Total wall-clock is now dominated by the fixed ~2.1s renderer module load (see
the open frontier at the bottom).

> **Note on ordering.** The investigation overturned the original priority. The
> plan ranked the island bundle cache (#2) second *because* island bundling was
> the 19.8s cost. Once the split build (#1) cut bundling to ~0.5s, re-measurement
> showed the render stage was dominated by a **one-time `@shikijs/rehype` init**
> (~4.3s) that the plan never identified — fixing that (see §0) was the real win.
> Items are kept in their original numbering; status is marked inline.

---

## 0. Shiki language set — the real render bottleneck ✅ DONE

**Not in the original plan; found by bisecting the render stage after #1 landed.**
With the island split build done, "Rendering site" was still ~4.8s even on a
1–2 page build — i.e. a *fixed* cost, not per-page work. Empirical bisection
(throwaway probes, removed after measuring) pinned it precisely:

- `@mdx-js/mdx` core + `remark-frontmatter` + `remark-gfm`: all <20ms.
- `shiki`'s `getSingletonHighlighter({themes, langs:['js']})`: ~60ms.
- **`@shikijs/rehype`, configured without an explicit `langs` option: ~4.3s cold**
  (216ms warm). It eagerly loads shiki's **entire bundled language registry —
  235 languages** — on the first highlight.
- Passing an explicit `langs` array to the same plugin: **4669ms → 155ms cold.**

**Fix (`dwar/src/mdx.ts` + `index.ts`).** `render()` now scans every page body
for the code-fence languages actually used (`collectUsedLangs`), filters them to
shiki's known ids/aliases (built once from `bundledLanguagesInfo`), and passes
exactly that set as `rehypeShiki`'s `langs`. Only the languages in use are
loaded; unknown / `text` fences fall back to plain text as before
(`fallbackLanguage: 'text'`), so **no highlighting fidelity is lost** and output
stays byte-identical for every language a page uses. Measured: **"Rendering
site" ~4.8s → ~0.6s (~8×)**, confirmed shiki markup still present across the
output. This is the single largest win after #1.

## 1. Island bundling — one split build ✅ DONE

**Root cause (verified).** `bundleIslands` ran **one `esbuild.build()` per island
in a sequential loop** (12 islands), and each chunk imported `ISLAND_REGISTRY`
from rang, which statically references all 12 components — so esbuild couldn't
tree-shake, and **every chunk bundled all 12 components + Preact**. Result:
12 × ~405 KB ≈ **4.74 MB** of JS output and ~5.9s of redundant bundle time.

**Implemented.** `bundleIslands` now runs **one split build** (`splitting: true`,
all islands as entry points via a virtual-entry esbuild plugin, `outdir` +
`write:false`). esbuild hoists the shared runtime (Preact + the rang registry)
into a single `chunk-<hash>.js` that each thin entry imports via relative ESM.
Every emitted file is **content-hashed** (`[name]-[hash].js` / `chunk-[hash].js`)
so chunks cache-bust independently; the loader (`getIslandsLoaderScript`) is
handed the real `name → hashed-href` map instead of assuming `_islands/<name>.js`.

**Measured impact:** output **4.74 MB → ~0.40 MB** (one ~404 KB shared chunk +
12 sub-KB entry chunks), bundle time **~5.9s → ~0.5s**. The browser lazy-imports
only the chunks for islands present on a page; the shared chunk loads once and is
reused across islands and pages.

> **Phase 1b (still open, optional).** Even split, the shared chunk holds *all 12*
> components because each entry imports the whole `ISLAND_REGISTRY`. If each entry
> imported only its own component (dropping the registry indirection in the chunk
> entry), esbuild could split per-component and a page would download only the
> components it hydrates. Splitting removed the build-time duplication and most of
> the wire cost; 1b would trim the remaining per-page payload. Low priority — the
> per-page payload is already small.

## 2. Cache island bundles across builds ✅ DONE

Island source only changes when **rang/dwar/preact** change — never per docs
build — yet every run re-bundled from scratch. Implemented an opt-in,
content-hash-keyed on-disk cache:

- `RenderOptions.islandCacheDir?: string` (a plain dir string, so utils never
  imports a dwar type). When set, `bundleIslands` reads/writes
  `<cacheDir>/islands-<key>.json`. Omitted (unit tests, the dwar smoke script) →
  `render()` stays **pure** (no disk touch), as before.
- **Key** = sha256 over the island entry sources + the contents of rang's
  compiled `dist/index.js` (rang ships a single bundled file, so its content
  captures every component change) + the preact version. Keying on rang's
  *content* (not its version) means a dev-loop edit to rang → rang rebuild → new
  key → fresh bundle, so the cache **can't go stale**.
- Resilient: every cache fs/crypto/resolve op is best-effort; any error falls
  back to a fresh build and never throws out of `bundleIslands`.
- Both bridges (`publish.ts`, `typedoc/write-site.ts`) pass
  `<project>/node_modules/.cache/clean-jsdoc-theme`.

**Measured:** warm-cache "Rendering site" ~190–240ms vs ~580ms cold (shaves the
~0.4s esbuild bundle); output byte-identical. Biggest benefit is the
`jsdoc --watch`/dev loop, where the bundle is unchanged 99% of the time.

## 3. Overlap the renderer load with project I/O ✅ DONE (reframed)

The original idea — "lazy-import the heavy leaves (esbuild, shiki)" — turned out
to be a non-issue: measured import costs are `esbuild` ~10ms, `shiki` ~2ms,
`@shikijs/rehype` ~92ms; only `@mdx-js/mdx` (~461ms) is notable, and deferring it
just shifts the cost to first compile (no net win). The ~2.1s "Loading renderer"
is broad module-graph evaluation, not one fixable leaf.

**Implemented** the part that genuinely helps and scales: `publish.ts` now starts
the project file-reading I/O (`resolvePkg`, `collectSourceFiles`, `collectDocs`)
**concurrently with** the renderer load, awaiting it at the existing stages. The
collectors don't need setu/dwar/utils, so on large projects (hundreds of source
files) the reads overlap the multi-second load instead of running after it. On
the tiny `docs-site` fixture the reads are ~2ms so the saving is negligible
there, but it's correct and scales. (TypeDoc's bridge imports the packages
directly — no separate load stage — so this applies to the JSDoc bridge.)

## 4. Per-page MDX compile parallelism ✅ DONE (scales with page count)

`render()` now compiles pages through a bounded-concurrency worker pool
(`mapWithConcurrency`, limit `min(8, cpus-1)`) instead of a sequential loop, with
**order-preserving assembly** so `files` / `search` / the search-index JSON stay
byte-identical and deterministic. No shared-mutable state across page renders
(island ids are per-call locals; `@shikijs/rehype` uses a cached singleton
highlighter; `@mdx-js/mdx evaluate()` makes independent module instances).

On small/medium fixtures this is **neutral**, because — as §0 found — the render
stage's cost is fixed init plus ~0.07s/page incremental, not parallelizable bulk.
The win scales with page count, so it pays off on large projects. (This matches
the original plan's "revisit once #1 is fixed and page count is the limiting
factor.")

---

## Open frontier: "Loading renderer" ~2.1s

With render down to ~0.2–0.6s, total wall-clock is now dominated by the fixed
~2.1s cost of dynamically importing setu/dwar/rang/utils and evaluating their
module graphs (preact, `preact-render-to-string`, the unified/remark/rehype
chain, `@mdx-js/mdx` ~461ms). This is paid fresh on every `jsdoc` process,
including each dev-loop rerun, and can't be cached in-process. Reducing it would
mean trimming the import graph or a persistent renderer process (e.g. a watch
daemon that keeps the modules warm and re-renders on change) rather than
re-spawning `jsdoc` each time. Out of scope for this round; it's the next
bottleneck if build time is revisited.
