# Issue #333 — Index name clash + render-error diagnostics

**Date:** 2026-06-20
**Issue:** https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/333
**Status:** Implemented (2026-06-23) — both fixes landed with tests; see "Implementation notes" below

## Background

Issue #333 is a v4→v5 migration report. Five points were triaged in the issue
thread; two are concrete engineering work items addressed by this spec:

1. **Index name clash** (confirmed bug): the home page and a documented symbol
   named `index` resolve to the same output path; the symbol's page silently
   overwrites the home page.
2. **Render-error diagnostics** (the reporter's live blocker): the Globals page
   fails MDX compilation with `global: Could not parse expression with acorn`,
   and the reporter cannot find *where* the problem is — the build prints only
   the slug and a terse message, with no location or source context.

The other three points (events-as-section, externals→Globals, file-naming) are
out of scope here.

Both fixes preserve the existing resilience guarantees: a page that fails to
compile is still skipped and reported, never thrown; the build never aborts on
one bad page.

---

## Fix 1 — Index name clash

### Root cause

`packages/dwar/src/html.ts`, `htmlPathFor()`:

```ts
export function htmlPathFor(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  if (clean === '' || clean === 'index') return 'index.html'; // <-- bug
  return `${clean}/index.html`;
}
```

The `clean === 'index'` branch maps **both** the empty/root slug (the home page,
slug `''`) and the literal slug `'index'` to `index.html`.

A documented container named `index` (class / module / namespace / interface /
mixin) gets its slug from `slugifyPath(splitLongnameForSlug(longname))`, which
yields the string `'index'`. setu emits this as a normal page with a distinct
slug, so it is *not* caught by the `claimedSlugs` collision set in
`packages/setu/src/index.ts` (that set compares slug **strings**, and `''` ≠
`'index'`). Both pages survive into the manifest.

At write time, dwar maps both pages to the path `index.html`. The home page is
pushed first (`pages.push(home)`), the API pages after, so the `index`-named
container's page is written **second and clobbers the home page's
`index.html`**. This is exactly the reporter's symptom; their `@alias` rename is
a workaround that changes the symbol's longname so its slug is no longer
`'index'`.

`mdPathFor` derives from `htmlPathFor`, so the companion `.md` files collide the
same way.

There is an explicit test asserting the current (buggy) behavior:
`packages/dwar/src/__tests__/html.test.ts:163` —
`expect(htmlPathFor('index')).toBe('index.html')`. This confirms the collapse was
intentional design, not an accident; it is the design that backfires.

### Resolution (approved option: own `/index/` directory)

Drop the `clean === 'index'` branch so only the empty/root slug maps to root:

```ts
export function htmlPathFor(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  if (clean === '') return 'index.html';
  return `${clean}/index.html`;
}
```

Result:

| slug      | output path         | URL       |
| --------- | ------------------- | --------- |
| `''`      | `index.html`        | `/`       |
| `'index'` | `index/index.html`  | `/index/` |
| `'foo'`   | `foo/index.html`    | `/foo/`   |

- Home keeps the site root.
- A symbol named `index` lands at `/index/` like any other container — no data
  loss, no rename, fully deterministic.
- The slug string `'index'` already flows consistently through nav, the search
  index, and the link registry; only the final path mapping was collapsing it,
  so no other layer needs to change.
- `mdPathFor` follows automatically (it derives from `htmlPathFor`).

### Why not the alternatives

- **Auto-suffix the slug (`index-1`)**: keeps the collapse but produces an
  uglier, less predictable URL and requires a special case in setu's slug
  assignment. Rejected.
- **Home wins, skip the `index` page + warn**: simplest, but *loses* the
  symbol's documentation page entirely — the same pain the reporter hit.
  Rejected.

### Files touched

- `packages/dwar/src/html.ts` — remove the `clean === 'index'` branch in
  `htmlPathFor` (one line). `mdPathFor` needs no change.

### Tests

- `packages/dwar/src/__tests__/html.test.ts`
  - Update the existing case (line ~163): `htmlPathFor('index')` →
    `'index/index.html'` (rename the test description accordingly).
  - Add `mdPathFor('index')` → `'index/index.md'`.
  - Keep `htmlPathFor('')` → `'index.html'` and `mdPathFor('')` → `'index.md'`.
- Regression test (in dwar's render/index tests): a manifest containing **both**
  a home page (slug `''`) and a container page with slug `'index'` emits two
  **distinct** output paths (`index.html` and `index/index.html`), and the home
  page's contents are not overwritten.

### Risk / compatibility

- This changes the URL of any site that documents a symbol literally named
  `index`: previously it (incorrectly) sat at `/` and clobbered home; now it
  sits at `/index/`. This is a strict correctness improvement — the previous
  behavior was a broken home page.
- No other slug is affected (the branch only ever matched the exact string
  `'index'`). Docs at nested paths like `foo/index` are unaffected (the guard
  matched only the bare `'index'`, and `deriveDocMeta` already maps a root
  `index.md` to slug `''`, not `'index'`).

---

## Fix 2 — Render-error diagnostics

### Root cause

`packages/dwar/src/index.ts`, the per-page render `task` catch (~line 586):

```ts
} catch (err) {
  return {
    ok: false,
    error: { slug: page.slug, message: err instanceof Error ? err.message : String(err) },
  };
}
```

`compileMdxToComponent(page.body, …)` runs MDX's `evaluate`. On a parse failure
it throws a **`VFileMessage`** (extends `Error`). Verified shape for the
`acorn` case:

```
name:    "3:38"
message: "Could not parse expression with acorn"
reason:  "Could not parse expression with acorn"
line:    3
column:  38
place:   { line: 3, column: 38, offset: 46 }
```

The catch keeps only `err.message`, discarding `.line` / `.column` / `.place`.
The bridge (`packages/clean-jsdoc-theme/src/publish.ts:1846`) then prints just:

```
  - global: Could not parse expression with acorn
```

So the location data **exists** but is thrown away — which is exactly why the
reporter has no way to find the offending content on a large aggregated page
like Globals.

### Line-number fidelity

`compileMdxToComponent` compiles `escapeStrayBraces(preprocessJsdocInlineTags(page.body))`.
Both transforms are **line-count preserving**:

- `preprocessJsdocInlineTags` replaces `{@tag …}` with an inline code span
  **within a line** (no newline added/removed).
- `escapeStrayBraces` replaces `{`/`}` with `\{`/`\}` **within a line**, and
  passes fenced/inline code and frontmatter through unchanged.

Therefore `err.line` from the cleaned source maps **1:1** to the authored
`page.body` line. The column may shift by the number of escapes inserted earlier
on the same line, so the caret column is **best-effort**; the line is exact.
This is sufficient to locate the problem and avoids the complexity of a full
source map (YAGNI).

### Resolution

Surface the location and a code-frame snippet through the existing
`RenderError` channel.

**`packages/utils/src/site/render.ts`** — extend `RenderError` with optional,
back-compatible fields:

```ts
export interface RenderError {
  slug: string;
  message: string;
  /** 1-based source line of the failure, when the error carries a position. */
  line?: number;
  /** 1-based source column of the failure (best-effort — see spec). */
  column?: number;
  /** A few numbered lines of `page.body` around the failure, with a caret. */
  snippet?: string;
}
```

**`packages/dwar/src/index.ts`** — in the `task` catch, detect a positioned
error (presence of a numeric `line`) and enrich the `RenderError`:

- Read `line` / `column` off the thrown error (narrow via a small type guard,
  e.g. `typeof (err as { line?: unknown }).line === 'number'`).
- Build the snippet from `page.body` with a helper
  `codeFrame(body: string, line: number, column?: number, context = 2): string`:
  - Split `body` into lines.
  - Emit lines `[line-context, line+context]`, each prefixed with a
    right-aligned 1-based line number and ` | `.
  - Under the offending line, emit a caret (`^`) row aligned to `column` (when
    `column` is known), using the same gutter width.
- Leave `message` as the raw reason (`err.message`); add `line`, `column`,
  `snippet`.
- When the error carries no position (non-VFileMessage failures), behavior is
  unchanged — only `slug` + `message`.

`codeFrame` is a pure local helper in `dwar/src/index.ts` (or a small sibling
module if it grows); it has no dependencies and is unit-testable in isolation.

**`packages/clean-jsdoc-theme/src/publish.ts`** (~line 1842) — when the optional
fields are present, print location + indented snippet:

```
clean-jsdoc-theme: 1 page(s) failed to render and were skipped:
  - global (line 142:38): Could not parse expression with acorn
      140 | ## someGlobal
      141 |
      142 | Returns a value where {x: y} maps keys.
          |                       ^
```

When `line` is absent, fall back to the current `  - <slug>: <message>` form.

**`packages/typedoc/src/write-site.ts`** — the TypeDoc bridge consumes the same
`RenderResult.errors`. If it prints them with its own formatter, mirror the
same location + snippet formatting there so both bridges behave identically. (If
it shares a printer, no change.)

### Files touched

- `packages/utils/src/site/render.ts` — three optional fields on `RenderError`.
- `packages/dwar/src/index.ts` — enrich the catch; add `codeFrame` helper.
- `packages/clean-jsdoc-theme/src/publish.ts` — richer skipped-page print.
- `packages/typedoc/src/write-site.ts` — mirror the print (only if it has its
  own error printer).

### Tests

- `codeFrame` unit tests: numbered gutter, context window clamped at file
  start/end, caret alignment with and without a `column`, multi-digit line
  numbers (gutter width).
- dwar render test: a page whose `body` contains a deliberately MDX-hostile
  expression produces a `RenderError` with `line`, `column`, and a `snippet`
  that includes the offending line; the build still succeeds (page skipped, not
  thrown).
- Back-compat: a `RenderError` without a position still serializes/prints in the
  legacy `slug: message` form.

### Scope guards (YAGNI)

- No change to the skip-don't-throw resilience.
- No attempt to **auto-fix** the offending content — improving
  `escapeStrayBraces` robustness is a separate effort.
- No source map between cleaned and authored text — line-exact + best-effort
  caret column is enough to locate the problem.

---

## Implementation notes (2026-06-23)

Both fixes landed as specified, with one intentional refinement to Fix 2's
print path:

- **Shared printer instead of duplicated formatting.** Rather than re-implementing
  the location + snippet formatting in each bridge, the print logic lives once in
  `packages/utils/src/site/render.ts` as `formatRenderError(error, indent?)`. Both
  bridges call it (`publish.ts` adds it to its dynamic-import allowlist; `write-site.ts`
  imports it directly), so they print identically by construction — the spec's
  "mirror the same formatting" goal, but without the drift risk of two copies.
- `codeFrame` is exported from `dwar/src/index.ts` (so it's unit-testable) and used
  in the per-page render catch, guarded by `isPositionedError` (numeric `line`).
- The MDX-hostile construct exercised by the dwar render test is an angle-bracket
  autolink (`<https://example.com>`): it survives the brace-escaping pre-pass and
  fails `acorn` with a positioned `VFileMessage`, matching the reporter's symptom.

Verified: `utils` + `dwar` test suites pass (incl. the new `codeFrame`, index-clash,
diagnostics, and `formatRenderError` back-compat cases); `utils`/`dwar`/`clean-jsdoc-theme`/`typedoc`
typecheck and lint clean.

## Out of scope

- Events as a separate sidebar section (issue point 1).
- Externals folded into the Globals "Other" section / v4 parity (issue point 2).
- The v5 file-naming change (issue point 3) — by design, not a bug.
- Improving `escapeStrayBraces` / `preprocessJsdocInlineTags` to *prevent* the
  acorn failure (separate effort; Fix 2 only makes the failure locatable).
