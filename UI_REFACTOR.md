# UI Refactor — session notes

Status of the UI work on the `v5` branch. **All changes below are in the working tree and _not yet committed_.** Scope: mostly `packages/rang`, with the minimal `dwar` / `utils` edits needed to keep the build green.

---

## TL;DR — is shadcn/ui implemented?

> **No. shadcn/ui is NOT implemented.** No shadcn components, no Radix UI, no `react` → `preact/compat` alias, no `components.json`, no `cn()` helper.

What _was_ done is the agreed prerequisite: **adopt real Tailwind v4** as the CSS engine while keeping every component in **Preact**. The components are still hand-written Preact, now styled by real Tailwind instead of a hand-rolled CSS dictionary.

The shadcn **look** (porting shadcn's markup + class patterns onto our Preact components, by hand) is the **not-yet-started** follow-up.

---

## What changed this session

| # | Change | Status |
|---|--------|--------|
| 1 | **Removed `MobileNav`** completely (component, export, island, tests) | ✅ Done |
| 2 | **Added `lucide-preact`** icon dependency to `rang` | ✅ Done |
| 3 | **Fixed layout**: navbar + footer now share the content `max-w-screen-2xl` width; removed navbar bottom border + footer top border | ✅ Done |
| 4 | **Header controls** (Claude-style, right-aligned): Search, Theme toggle, Settings — all hydrated islands with Lucide icons | ✅ Done |
| 5 | **Settings dialog** with real controls: **Font size** (S/Default/L) + **Line spacing** (Compact/Default/Relaxed), persisted to `localStorage`, applied pre-paint | ✅ Done |
| 6 | **CSS engine → real Tailwind v4** (replaced the hand-rolled dictionary) | ✅ Done |
| — | **shadcn/ui component port** | ⬜ Not started |
| — | **Tailwind Preflight** (currently off to minimize visual change) | ⬜ Off by choice |

---

## Header controls (#4)

Three hydrated islands, right-aligned in the navbar:

- 🔍 **Search** — `CmdK` (existing), restyled to an icon button. Opens the command palette; `Ctrl/Cmd+K` still works.
- ☀️/🌙/🖥️ **Theme** — `ThemeToggle` (existing), now a single icon button that **cycles** light → dark → system; icon reflects the current mode.
- ⚙️ **Settings** — **new** `Settings` island. Opens a dialog (full a11y: `role="dialog"`, Esc, click-outside, focus management).

## Settings dialog (#5)

| Control | Options | How it applies |
|---------|---------|----------------|
| Font size | Small / Default / Large | Sets `<html>` `font-size` (`15px` / default / `18px`); rem-based CSS scales globally |
| Line spacing | Compact / Default / Relaxed | Sets `--clean-line-height` CSS variable, consumed by body + content paragraphs |

Both persist to `localStorage` and are **re-applied before first paint** by dwar's pre-hydration script (so returning visitors see no flash/reflow). Extensible — adding another control is one more `SegmentedControl` block + a key in the pre-hydration script.

---

## CSS architecture (#6) — real Tailwind, zero user burden

The key design constraint: **`render()` must stay pure** (no `fs`, no async pipeline) and **users must never configure Tailwind**.

```
THIS REPO's build:
  build-css.mjs  →  Tailwind v4 CLI scans rang/src + dwar/src
                 →  writes src/generated/utility-css.ts   (utilities inlined as a string)
  tsup           →  bundles that string into dist/index.js

USER's `jsdoc` build:
  render()  →  buildThemeVariableCss(tokens)  +  UTILITY_CSS   (plain string concat, pure)
```

- **Tailwind runs ONCE, at our build** — never at the consumer's `jsdoc` run.
- Users still just run `jsdoc -c jsdoc.json`. **No `tailwind.config`, no `components.json`, nothing.**
- The utility layer is fully determined by component source; only the `:root { --clean-* }` + `[data-theme="dark"]` token block is dynamic per user theme.
- Components stay Preact and keep using `bg-[var(--clean-bg)]` etc. Real Tailwind is a **superset** of the old dictionary, so nothing that worked broke — and previously **inert** classes (`md:flex-row`, footer stacking, …) now actually render.

---

## Files touched

**`packages/rang`**
- `components/Settings.tsx` — new (icon trigger + dialog + font-size/line-spacing controls)
- `components/CmdK.tsx`, `components/ThemeToggle.tsx` — restyled to icon buttons (Lucide)
- `components/MobileNav.tsx` — deleted
- `components/Header.tsx`, `components/Footer.tsx`, `components/Layout.tsx` — layout/width fixes
- `islands.ts`, `index.ts` — registry/exports (drop mobile-nav, add settings)
- `__tests__/` — removed `mobile-nav`, added `settings`, rewrote `theme-toggle`
- `package.json` — added `lucide-preact`

**`packages/dwar`**
- `styles/tailwind.css` — new (Tailwind v4 input)
- `scripts/build-css.mjs` — new (compiles + codegens the utility CSS)
- `src/generated/utility-css.ts` — generated (committed; rebuilt on build)
- `src/css.ts` — dropped hand-rolled dictionary; composes `buildThemeVariableCss + UTILITY_CSS`
- `src/layout.tsx` — header islands; width fix; dropped MobileNav
- `src/theme-script.ts` — pre-hydration now also applies font-size + line-spacing
- `src/islands-bundle.ts`, `src/islands-loader.ts`, `src/index.ts` — island lists (drop mobile-nav, add settings)
- `src/__tests__/render.test.ts` — island chunk counts
- `package.json` — `build` runs `build-css.mjs && tsup`; added `tailwindcss` + `@tailwindcss/cli`

**`packages/utils`**
- `src/site/islands.ts` — `IslandName` / `IslandPropsMap`: drop `mobile-nav`, add `settings`

---

## Verification

- `pnpm typecheck` — ✅ 13/13
- `pnpm lint` — ✅ 7/7
- `pnpm test` — ✅ utils 14 · setu 102 · rang 32 · dwar 24
- `pnpm --filter @clean-jsdoc-theme/dwar run smoke` — ✅ renders 3 pages; CSS carries the token block + full utility layer

> ⚠️ Tests can't vouch for pixels. Eyeball `packages/dwar/preview/` (or `examples/basic`) in a browser before committing.

---

## Next steps (not done)

1. **shadcn-style markup port** — lift shadcn's component structure + class patterns onto the Preact components (start with the Settings **Dialog** + **Button**/icon-button styles). No React/Radix — just the look.
2. **Turn on Tailwind Preflight** once verified in a browser (one line in `styles/tailwind.css`).
3. **Component-override classes** — a user-supplied custom MDX component with brand-new classes won't be in the pre-built CSS. Add a `safelist` or documented escape hatch later.
4. **Refresh docs** — `rang/README.md` + `clean-jsdoc-theme/README.md` still list the old island set (mobile-nav / "seven keys").
5. **Commit** the working-tree changes.
