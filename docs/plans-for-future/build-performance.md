# Plan: build performance

The v5 pipeline is noticeably slower than a bare `jsdoc` run (~1s vs ~15–20s on
a tiny project). The stage narrator added to `publish.ts` (`opts.progress`) makes
the breakdown visible. On the `docs-site` fixture (8 pages, 13 islands):

```
✓ Loading renderer        4.4s
✓ Validating options      1ms
✓ Reading sources & docs  16ms
✓ Generating pages        203ms
✓ Rendering site          19.8s    ← dominant
✓ Writing files           167ms
✓ Indexing search         107ms
```

Two stages own essentially all the time: **Rendering site** and **Loading
renderer**. Everything else is already negligible.

---

## 1. Island bundling — the big one (`dwar/src/islands-bundle.ts`)

**Root cause.** `bundleIslands` runs **one `esbuild.build()` per island in a
sequential `for` loop** (13 islands today), and each build **inlines Preact +
rang from scratch**. The asset report shows the cost twice over:

- Every island chunk is ~**414.5 KB** — they are all carrying their own copy of
  Preact + shared rang code. 13 × 414.5 KB ≈ **5.1 MB** of JS output, ~97 KB
  gzip *each* on the wire.
- 13 sequential full bundles (each re-parsing + re-minifying Preact) is the bulk
  of the 19.8s render stage.

The current inline-Preact strategy is a deliberate choice (see the file header:
it avoids the "shipping a separate shared runtime that all chunks pin to the same
version" coordination problem). That concern is real *across* independent builds
— but it evaporates **within a single build**, where every chunk shares the exact
same bundled Preact.

**Proposed fix — one split build instead of 13 inline builds.** Replace the loop
with a single `esbuild.build()` using multiple `entryPoints` (one virtual entry
per island) + `splitting: true`, `format: 'esm'`, `outdir`. esbuild then hoists
the common code (Preact + shared rang) into a shared chunk that each island chunk
imports. Expected impact:

- **Build time:** ~12× redundant Preact parse/minify work eliminated → the render
  stage should drop dramatically (most of it is this loop).
- **Output size:** ~5.1 MB → roughly (one ~shared chunk + 13 thin island chunks).
  Big download win for end users, not just build speed.
- The browser side already lazy-imports only the chunks present on a page
  (`islands-loader.ts`); ESM import dedup means a shared chunk loads once and is
  reused. The loader's per-island chunk map will need to account for the emitted
  shared chunk (and the page must allow it to load).

**Open questions / care points:**
- esbuild's `splitting` emits hashed shared-chunk names; the loader + the
  `_islands/<name>.js` path convention must absorb that (or pin names).
- Keep `render()` pure — bundling stays in-memory (`write: false`,
  `outputFiles`), as today.
- Verify SSR markers + hydration still line up when islands share a chunk.

**Fallback (lower effort, partial win).** If a single split build proves fiddly,
at minimum `Promise.all` the 13 builds instead of `for await` to parallelize
across esbuild's worker pool. This cuts wall-clock but does **not** fix the 5.1 MB
duplication — #1 (splitting) is strictly better and should be preferred.

## 2. Cache island bundles across builds

Island source only changes when **rang/dwar** change — never per docs build. Yet
every `jsdoc` run re-bundles all 13 from scratch. A content-hash-keyed on-disk
cache (e.g. under `node_modules/.cache/clean-jsdoc-theme`, keyed on the rang/dwar
versions or a hash of the island entry sources) would make warm rebuilds skip the
island stage almost entirely.

This is the **highest-leverage win for the `pnpm run dev` watch loop**, where
`jsdoc` re-runs constantly but the islands are unchanged 99% of the time. Pairs
well with #1 (cache the single split build's output).

## 3. "Loading renderer" 4.4s — defer the heavy deps

The 4.4s is the dynamic `import()` of setu/dwar/rang/utils, which transitively
evaluates esbuild, `@mdx-js/mdx`, and shiki at module-load time. Options:
- Warm the loads **in parallel** with `Reading sources & docs` / pkg resolution
  (they don't depend on each other), overlapping the cost.
- Lazy-import the heaviest leaves (esbuild, shiki) only at first use inside dwar,
  so a build that errors early never pays for them.

Smaller than #1, but it's ~20% of total wall-clock on small projects where the
render itself is fast.

## 4. Per-page MDX compile parallelism (minor)

dwar compiles + runs MDX per page inside `render()`. On large projects this grows
linearly; the pages are independent and could compile concurrently (bounded
pool). Low priority while #1 dominates, but worth revisiting once island bundling
is fixed and page count is the limiting factor.

---

### Suggested order

1. **#1 split build** — biggest single win for both build time *and* output size.
2. **#2 bundle cache** — transforms the dev/watch experience.
3. **#3 deferred deps** — trims the fixed startup cost.
4. **#4 MDX parallelism** — only once page count is the bottleneck.
