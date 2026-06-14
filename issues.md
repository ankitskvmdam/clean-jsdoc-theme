# Bug: TOC active item scrolls out of view in long tables of contents

> **Status: fixed** (`packages/rang`). See [Resolution](#resolution) at the bottom.

## Summary

The right-hand Table of Contents (TOC) does not scroll to keep the currently-active item visible. On pages with long TOCs that exceed the viewport height, the active item indicator can sit far below or above the visible scrollable region, leaving the user with no visual indication of where they are in the page.

## Where

`@clean-jsdoc-theme/ui` — the ported Fumadocs TOC component. (File path to be confirmed; whoever picks this up should grep for `TableOfContents` or the ported component name.)

## Steps to reproduce

1. Open any clean-jsdoc-theme page that has a long list of headings — long enough that the TOC overflows its container (e.g., a class page with many methods, or any page with 30+ entries).
2. Scroll the **main content** down so that headings near the bottom of the page become active.
3. Observe the right-side TOC.

**Expected:** the highlighted active item stays comfortably visible within the TOC's scrollable area, with reasonable breathing room above and below it.

**Actual:** the TOC does not scroll automatically. The active item ends up off-screen (either above or below the visible portion of the TOC), so the user can't tell which heading they're on without manually scrolling the TOC.

## Reference implementation

The behavior we want matches what Stately.ai uses on their docs:

- Reference: https://stately.ai/docs/examples
- Stately is built on Fumadocs, and their TOC is the unmodified Fumadocs core component.

We've ported the same Fumadocs TOC into `clean-jsdoc-theme`, but the auto-scroll behavior is not working correctly in our port. So this is most likely a regression introduced during the port — either a missing effect, a missing ref, an incorrect scroll-container assumption, or a missing IntersectionObserver / scroll listener.

## Root cause hypothesis

Fumadocs' TOC keeps the active item visible by listening for changes to the active heading and, when that happens, programmatically scrolling the TOC's own scroll container so the active item lands in a comfortable position. In our port, either:

1. The scroll-into-view logic was dropped during the port, or
2. The scroll container reference is wrong (we may be scrolling the page, or nothing), or
3. The active-item state is updating but the scroll effect isn't wired to it, or
4. The "is the TOC overflowing?" check is missing, so we never opt into scrolling.

A diff against Fumadocs' upstream TOC source would surface this in minutes — that's the recommended first step.

## Desired behavior (precise)

When the active TOC item changes:

1. **Check if the TOC scroll container is actually scrollable** (i.e., `scrollHeight > clientHeight`). If not, do nothing.
2. **Compute the active item's position** relative to the TOC's visible area.
3. **If the active item is within the comfortable visible band, do nothing.** The comfortable band is the middle of the TOC — roughly from 30% to 70% of the visible height.
4. **If the active item is outside the comfortable band** (above 30% or below 70%), scroll the TOC so the active item lands near the top of the comfortable band — specifically at `min(30%, top_padding)` from the top of the visible area.

Phrased as pseudocode:

```
on activeItemChange(item):
  const toc = ref.current
  if !toc || toc.scrollHeight <= toc.clientHeight: return

  const itemTop = item.offsetTop - toc.offsetTop
  const visibleTop = toc.scrollTop
  const visibleHeight = toc.clientHeight
  const comfortableTop = visibleTop + visibleHeight * 0.30
  const comfortableBottom = visibleTop + visibleHeight * 0.70

  if itemTop >= comfortableTop && itemTop <= comfortableBottom:
    return  // already in the comfortable band

  // Scroll so the item lands near the top of the comfortable band
  const targetScrollTop = itemTop - Math.min(visibleHeight * 0.30, COMFORTABLE_PADDING)
  toc.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
```

`COMFORTABLE_PADDING` should be a small absolute value (e.g., 24–32px) to prevent the active item from sitting flush against the top edge on very tall TOCs.

## Edge cases to handle

- **TOC fits without overflow** → no auto-scroll, ever.
- **First page load with a deep-linked anchor** (`#some-heading`) → on mount, run the auto-scroll once so the deep-linked active item is centered without animation (`behavior: 'instant'` or no smooth scroll).
- **User has manually scrolled the TOC** → we should still auto-scroll on active item change. Don't try to detect user intent and pause auto-scroll; that's surprising behavior. The Stately/Fumadocs behavior just always tracks the active item, and that's what users expect.
- **Smooth scrolling and prefers-reduced-motion** → use `behavior: 'smooth'` by default, but respect `prefers-reduced-motion: reduce` and switch to `'instant'`.
- **Active item is nested** (sub-heading inside a parent) → the same logic applies; we measure from the actual rendered DOM element regardless of nesting.

## Acceptance criteria

1. On a page with a TOC that overflows its container, scrolling the page main content keeps the active TOC item visible within the comfortable band (30–70% of TOC visible height).
2. On a page with a TOC that fits without overflow, no scroll-jump occurs.
3. Deep-linked navigation (URL with `#heading`) lands with the active TOC item already visible — no flash of an out-of-view active item.
4. Behavior visually matches https://stately.ai/docs/examples (open dev tools, scroll the page, watch the TOC track).
5. Respects `prefers-reduced-motion`.
6. No layout shift in the main content area when the TOC scrolls.

## Suggested implementation path

1. **Diff our TOC against Fumadocs upstream.** Find the exact effect or hook we dropped during the port. This is almost certainly the fastest path — Fumadocs already solved this well.
2. If the upstream code isn't easy to extract, implement the logic in the pseudocode above using an `IntersectionObserver` to detect active heading changes and a `useEffect` (or equivalent for Astro/vanilla) that scrolls the TOC container.
3. Add a single integration test (Playwright) that loads a page with many headings, scrolls to the bottom, and asserts the active TOC item is within the visible portion of the TOC container.

## Non-goals (out of scope for this fix)

- Redesigning the TOC visually
- Changing TOC item indentation / nesting behavior
- Sticky-header offset tuning (separate concern)
- Adding TOC progress indicators / "X of Y" hints

## Priority

Medium. Functionally usable today, but breaks the UX on any long page — which for an API reference theme is most class pages. Worth fixing before next public release.

---

A few small notes on what I changed from your draft, in case you want to keep tightening these tickets in the future:

- **Used "active item" instead of "highlighted item" consistently.** Both work, but "active" is the conventional term in TOC code and in Fumadocs' own source — it'll save the implementer a step when grepping.
- **Made the 70%/30% rule explicit and symmetric.** Your original framing said "when active item is at 70% of view." I interpreted that as "if it's outside the 30–70% comfortable band, scroll." That's the standard pattern Stately uses. If you actually meant something different, the pseudocode is the place to correct — just edit it.
- **Added the "first load with deep link" edge case.** This catches a really common bug in TOC scroll behavior that's easy to forget.
- **Added the `prefers-reduced-motion` requirement.** Free accessibility win that takes one line of code.
- **Phrased the scroll target as `min(30%, COMFORTABLE_PADDING)` in absolute pixels.** Your original wording was `min(30%, top)`, which could mean a couple of things — I picked the interpretation that prevents the active item flushing to the very edge on tall TOCs. If you meant something else, edit the pseudocode.

---

## Resolution

The TOC lives in **`@clean-jsdoc-theme/rang`**, not `ui` (`packages/rang/src/components/TOC.tsx` — the curved-rail desktop rail). The scroll-spy (`useActiveHeadings`) was intact; the dropped piece was exactly the hypothesis in the ticket — the **scroll-into-view effect** that keeps the active item in the container.

**What changed**

- `packages/rang/src/components/toc-utils.ts` — two new helpers:
  - `computeTocScrollTop(itemTop, scrollTop, clientHeight, scrollHeight, padding?)` — pure (no DOM) implementation of the ticket's pseudocode: returns `null` when not scrollable or when the item is already in the 30%–70% comfortable band, else the target `scrollTop` that lands the item `min(30%, 24px)` below the top, clamped to `[0, maxScroll]`. Pure so it's unit-tested directly.
  - `getScrollParent(el)` — finds the nearest `overflow-y: auto|scroll|overlay` ancestor (the sticky wrapper the Layout puts the TOC in). The scroll container is an **ancestor** of the rail, not the rail's own list — that wrong-container assumption was hypothesis #2 in the ticket.
- `packages/rang/src/components/TOC.tsx` — a `useEffect` keyed on `activeIds` that measures the first active anchor's top in the scroller's content coordinates (via `getBoundingClientRect`, robust to the `<h2>`/`<nav>` sitting between the list and the scroller) and calls `scroller.scrollTo`.

**Acceptance criteria**

1. ✅ Overflowing TOC keeps the active item in the 30–70% band as the page scrolls.
2. ✅ Non-overflowing TOC never scroll-jumps (`computeTocScrollTop` → `null`).
3. ✅ Deep-linked `#heading` — first alignment runs with `behavior: 'instant'` (tracked by a `didInitialAlign` ref), so no flash of an out-of-view active item; later changes animate.
4. ⚠️ Matches Stately/Fumadocs behavior by construction; not visually diffed in a browser here.
5. ✅ Respects `prefers-reduced-motion: reduce` (forces `'instant'`).
6. ✅ No main-content layout shift — only the TOC's own scroll container is scrolled.

**Tests**: unit coverage for `computeTocScrollTop` (band, above/below, clamping, `min(30%, padding)`, custom padding) added to `packages/rang/src/__tests__/toc-utils.test.ts`; full rang suite green (154 tests), `tsc --noEmit` clean, `rang` dist rebuilt.

**Not done**: the suggested Playwright integration test (criteria #3/#4 visual). The repo has no Playwright/browser-test harness, so adding one is its own task — flagging rather than scaffolding a new framework here. The mobile `TocPopover` (its own `max-h-[50vh]` scroller) was left alone: it's outside the ticket's scope, auto-closes on navigation, and shows a single current item rather than a span.
