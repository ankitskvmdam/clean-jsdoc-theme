# Docs ↔ code bugs (handoff)

Issues found while translating `docs-site/` into Hindi/Japanese, **validated
against the codebase (the source of truth)**. Each entry is a handoff: fix the
code (or decide the docs are wrong), then update the documentation at the listed
location(s) — including the `hi`/`ja` overlays once the English source is fixed.

How to read an entry:

- **Where (code):** the file/function that is the source of truth.
- **Claim (docs):** what the documentation currently says.
- **Reality (code):** what the code actually does.
- **Action:** fix code or fix docs.
- **Docs to update after fix:** every page that repeats the claim (English +
  `docs.hi/` + `docs.ja/`), so translations don't drift from a corrected source.
- **Status:** open / fixed-code / fixed-docs / wontfix.

---

<!--
Template — copy per finding:

## BUG-NNN: <short title>

- **Severity:** low | medium | high
- **Where (code):** `packages/.../file.ts:line` — `symbol`
- **Claim (docs):** "<quote>" — `docs-site/docs/.../page.md`
- **Reality (code):** <what actually happens>
- **Action:** <fix code | fix docs>
- **Docs to update after fix:** `docs-site/docs/.../page.md` (+ `docs.hi/`, `docs.ja/`)
- **Status:** open
-->

## BUG-001: heading slugs strip all non-ASCII → broken anchors/TOC for hi/ja pages

- **Severity:** high (blocks correct localized output)
- **Where (code):** `packages/utils/src/site/slug-rules.ts:33` — `slugifyHeading`
  (and `slugifyPath:61`, `slugifySourcePath:87`) use `[^a-z0-9\s-]` /
  `[^a-z0-9]`, which drop every non-ASCII letter after NFKD.
- **Reality (code):** Devanagari/Japanese headings produce empty or degenerate
  slugs. Verified:
  - `slugifyHeading('पैकेज')` → `""`
  - `slugifyHeading('आपको क्या मिलता है')` → `""` (→ `"-1"` after the per-page
    dedup counter)
  - `slugifyHeading('प्रोज़ और API एक ही साइट में')` → `"api"` (only the Latin
    token survives)
  - `slugifyHeading('パッケージ')` → `""`
  Because setu (TOC) and dwar (anchor ids) share this function + the per-page
  registry, the two still *agree* (so TOC jump-links technically resolve), but
  the anchors are meaningless (`#`, `#-1`, …) and any **author-written** in-page
  link (e.g. `[…](#the-packages)`) no longer matches a translated heading.
- **Action:** fix code — make the slugifiers Unicode-aware (e.g. keep
  `\p{L}\p{N}` via a `u`-flag regex instead of `[a-z0-9]`; lowercasing is a
  no-op for scripts without case, which is fine). Then heading anchors, the
  TOC, the heading-hover copy-link, and `#fragment` links all work in every
  language.
- **Docs to update after fix:** none (undocumented internal behavior). But note:
  translated pages that use in-page `#fragment` links need those fragments
  rewritten to the (now non-empty) translated slug once this lands — I am
  avoiding fragile in-page anchors in `docs.hi/` / `docs.ja/` until it does.
- **Status:** open
