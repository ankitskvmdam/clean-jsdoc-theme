# Plan: Custom auto-hiding scrollbar (TODO #2 — "hide sidebar scrollbar")

## Goal

Replace the ugly, always-on native scrollbar (the thick gray **track background**
seen in Chrome on Windows) with a thin, custom, **overlay-style** scrollbar that:

- has **no track background** (transparent),
- shows its thumb **while the element is being scrolled** and **hides shortly
  after scrolling stops** (idle auto-hide), and also shows on hover of the scroll
  area (standard affordance),
- applies **globally** to every scrollable element on the page (sidebar rail, TOC
  rail, command palette, dialog body, mobile TOC, source viewer, and the main
  window) — not just the sidebar.

Nothing fancy — this is the conventional docs-site overlay scrollbar.

## Why it needs a tiny bit of JS

On Windows, Chrome renders classic always-visible scrollbars and `::-webkit-scrollbar`
styling is static — there is **no pure-CSS way to hide the thumb when scrolling
stops**. So the idle-hide is driven by a tiny inline script (same pattern as the
existing `dwar/src/heading-anchors.ts` / `theme-script.ts`): one delegated `scroll`
listener that toggles a class on the element being scrolled. CSS shows the thumb
only while that class is present (or on hover).

## Architecture fit

- The scrollbar **CSS is static** (not theme-dependent in structure, only its
  thumb color references a `--clean-*` token), so it belongs in dwar's static
  utility layer: `packages/dwar/styles/tailwind.css` under `@layer base`. It is
  compiled once by `scripts/build-css.mjs` into `src/generated/utility-css.ts`.
  This keeps `render()` pure (no runtime Tailwind). **Do not hand-edit
  `generated/utility-css.ts`** — regenerate it.
- Because `::-webkit-scrollbar` rules without a class prefix apply to *every*
  scrollable element automatically, **no rang component needs to change**. One
  global rule covers all current containers
  (`Layout.tsx:75/81`, `CmdK.tsx:174`, `Dialog.tsx:168`, `TocPopover.tsx:144`,
  `CodeViewer.tsx:298`) plus the window and anything added later.
- The idle-hide script is injected by `dwar/src/html.ts` `renderHtmlDocument`,
  alongside `getHeadingAnchorsScript()`.

## Step-by-step

### 1. Add the scrollbar CSS — `packages/dwar/styles/tailwind.css`

Add a block inside the existing `@layer base { … }` (e.g. after the `hr` rule,
before the Shiki block). Use the `--clean-border` token for the thumb so dark
mode is handled for free (it is rebound under `[data-theme="dark"]`).

```css
  /*
   * Custom overlay scrollbar. Track is always transparent (kills the gray
   * Windows/Chrome track). The thumb is invisible at rest and only paints while
   * the element is actively scrolling (the `.clean-scrolling` class, toggled by
   * the inline scrollbar script — idle-hide can't be done in pure CSS on
   * Windows) or while the scroll area is hovered. Applies to every scrollable
   * element on the page; the document scrollbar is keyed off <html>.
   */
  * {
    scrollbar-width: thin;                       /* Firefox: thin bars */
    scrollbar-color: transparent transparent;    /* Firefox: hidden at rest */
  }
  *:hover,
  .clean-scrolling {
    scrollbar-color: var(--clean-border) transparent; /* Firefox: show thumb */
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 9999px;
    /* transition may be ignored by some Chrome versions on scrollbar parts;
       harmless if so. */
    transition: background-color 0.2s ease;
  }
  *:hover::-webkit-scrollbar-thumb,
  .clean-scrolling::-webkit-scrollbar-thumb {
    background-color: var(--clean-border);
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: var(--clean-fg-muted);
  }
```

Notes for the implementer:
- Keep this in `@layer base` so utilities can still win if ever needed.
- If the global `*` Firefox rule feels too broad in practice, it is acceptable —
  the design is intentionally global. Do not scope it to the sidebar only.
- `--clean-border` and `--clean-fg-muted` are existing theme tokens (see
  `css.ts` / the `@theme inline` map in this same file). Confirm both exist; if
  `--clean-fg-muted` is not emitted, fall back to `--clean-border` for the
  hover-thumb color too.

### 2. Create the idle-hide script — `packages/dwar/src/scrollbar-script.ts`

Mirror the shape of `heading-anchors.ts` exactly (an inline IIFE string + a
`get…Script()` exporter). Behavior: on any `scroll` event (capture phase, since
scroll does not bubble), add `clean-scrolling` to the scrolled element, and remove
it ~700ms after that element last scrolled. Track per-element timers in a `WeakMap`
so scrolling the sidebar does not flash the window scrollbar. The document/window
scroll target is `document` → mark `document.documentElement` (`<html>`).

```ts
/**
 * Inline client script: idle auto-hide for the custom scrollbar.
 *
 * On Windows/Chrome native scrollbars are always visible and ::-webkit-scrollbar
 * styling is static, so the "show while scrolling, hide when it stops" behavior
 * can't be done in CSS. This adds a single delegated `scroll` listener (capture
 * phase — scroll events don't bubble) that marks the element being scrolled with
 * the `clean-scrolling` class and removes it ~700ms after it last scrolled. The
 * CSS (see tailwind.css @layer base) paints the thumb only while that class is
 * present (or on hover). Per-element timers (WeakMap) so scrolling one container
 * never flashes another's scrollbar. The document scroll target is `document`,
 * whose scrollbar lives on <html>, so that case marks documentElement.
 */

const SCROLLBAR_SCRIPT =
  `(function(){` +
  `var IDLE=700;var timers=new WeakMap();` +
  `function onScroll(e){` +
  `var el=e.target;` +
  `if(el===document||el===window)el=document.documentElement;` +
  `if(!el||!el.classList)return;` +
  `el.classList.add('clean-scrolling');` +
  `var prev=timers.get(el);if(prev)window.clearTimeout(prev);` +
  `timers.set(el,window.setTimeout(function(){el.classList.remove('clean-scrolling');},IDLE));` +
  `}` +
  `document.addEventListener('scroll',onScroll,true);` +
  `}());`;

export function getScrollbarScript(): string {
  return SCROLLBAR_SCRIPT;
}
```

### 3. Wire the script into the HTML shell — `packages/dwar/src/html.ts`

- Import it: `import { getScrollbarScript } from './scrollbar-script';`
- In `renderHtmlDocument`, emit it next to the heading-anchors script near
  `</body>`:

```ts
    `<script>${getHeadingAnchorsScript()}</script>` +
    `<script>${getScrollbarScript()}</script>` +
```

(Order doesn't matter relative to heading-anchors; both are plain delegated
listeners. Keep both before `</body>`.)

### 4. Regenerate the static CSS

The CSS change only takes effect after the utility layer is recompiled:

```sh
pnpm --filter @clean-jsdoc-theme/dwar run build:css
```

This rewrites `packages/dwar/src/generated/utility-css.ts`. Commit the
regenerated file (it is checked in). A full `pnpm --filter
@clean-jsdoc-theme/dwar run build` also does this (it runs `build:css` before
`tsup`).

### 5. Build + verify end-to-end

```sh
pnpm build
cd examples/basic
pnpm run docs
pnpm dlx serve dist
```

Manual checks (Chrome on Windows is the target that exposed the bug):
- The gray scrollbar **track background is gone** on the sidebar rail.
- The sidebar thumb is **invisible at rest**, appears **while scrolling**, and
  **fades/disappears ~0.7s after** you stop.
- Hovering the sidebar shows the thumb too.
- Same behavior on: the main window, the right-rail TOC, the `Cmd-K` results
  list, an open settings/mobile-nav dialog, the mobile TOC popover, and the
  source-code viewer page.
- Dark mode: thumb color tracks the theme (uses `--clean-border`).
- Firefox sanity check: thin bars, transparent track, no layout breakage (FF
  won't idle-hide — that's expected and acceptable).

## Scope / non-goals

- **Global** by design — applies to all scroll containers, not just the sidebar.
- No new dependency (no OverlayScrollbars or similar). Plain CSS + ~12-line inline
  script, consistent with the existing `theme-script` / `heading-anchors` pattern.
- No `render()` purity violation — CSS is in the prebuilt static layer; the script
  is a static string injected into the shell.

## Files touched

- `packages/dwar/styles/tailwind.css` — scrollbar rules in `@layer base`.
- `packages/dwar/src/scrollbar-script.ts` — **new**, inline idle-hide script.
- `packages/dwar/src/html.ts` — import + inject the script.
- `packages/dwar/src/generated/utility-css.ts` — **regenerated** (not hand-edited).

## Risks / notes

- `transition` on `::-webkit-scrollbar-thumb` is honored inconsistently across
  Chrome versions; the show/hide still works without it (just no fade). Fine.
- The global `*` Firefox `scrollbar-color` rule is broad but intentional. If a
  specific embedded third-party iframe needs native scrollbars, that's out of
  scope (iframes have their own document).
- Confirm `--clean-fg-muted` is emitted by `css.ts`; if not, reuse
  `--clean-border` for the thumb-hover color.
```
