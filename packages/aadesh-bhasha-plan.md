# aadesh + bhasha — Localization Plan

Working plan for adding multi-language support to `clean-jsdoc-theme` via two
reserved packages: **bhasha** (pure i18n library) and **aadesh** (CLI that does
the dirty work). Output of a brainstorming session; decisions below are locked,
risks are tracked, work is phased.

---

## 1. The one mental model

Three content types, **one** rule for all of them:

- **Locale is a build dimension, not a runtime toggle.** Each locale is rendered
  to its own static output. The "language switcher" is navigation to another
  URL, not a live DOM swap.
- **Locale = top path segment**, default locale **unprefixed**
  (`/guide`, `/fr/guide`). Matches VitePress / Docusaurus / Starlight.
- **Fallback = same identity in the default locale.** Identity is the path minus
  the locale segment (`fr/guide` ↔ `guide`).
- **Everything resolves at build time** — HTML *and* the co-located `.md`,
  including island strings (they ride the existing `data-island-props` payload).
- **The switcher lives in the navbar**, next to the theme toggle. It's a
  navigation control (link to `/<locale>/<same-page>`), fed by aadesh's
  cross-locale index so it only offers locales the page exists in (else falls
  back).

The three content types:

| Type | Source | Mechanism | Missing → |
| --- | --- | --- | --- |
| **Chrome / UI** | key→string catalog | `t('key')` in rang | fall back to default catalog |
| **API descriptions** | keyed slots from doclets | build-time stamp in setu | fall back to source text |
| **Prose** (guides/tutorials/docs) | per-locale files | directory-per-locale | fall back to default file |

---

## 2. Locked decisions

1. **Translatable allow-list (API):** descriptions and example *prose* are
   translatable. Function/parameter/type names, type strings, enum values, and
   code inside `@example` are **not** — they stay locale-invariant.
2. **Interpolation:** supported from day one — simple named substitution
   (`{count}`). `t: (key, vars?) => string`. **Plurals (ICU-style) are
   deferred.**
3. **Heading links stay in the source language.** Anchors are keyed off the
   source heading text, so they're locale-invariant. Side effect: the switcher
   keeps you on the same section and old deep links survive; cost: English
   anchors in translated URLs (accepted).
4. **aadesh owns the cross-locale index** — the single record of which pages
   exist in which languages. Drives the switcher, fallback detection, and
   hreflang/SEO.
5. **Artifact layout:** committable JSON the user edits and version-controls.
   ```
   clean-jsdoc-theme-artifacts/
   └── locales/
       ├── en.json     # default = skeleton: all keys + source text
       ├── fr.json
       └── hi.json
   ```
   - One file per language, **all keys** (chrome + API) in it.
   - Namespaced inside: `chrome.*` and `api.*` nested objects (no collisions,
     tooling can separate them).
   - Each file carries a `_version` (schema version, for future migrations).
   - Soft-deleted keys live in an `_obsolete` block until `--prune`.
   - The structural template (manifest with slots) is an **internal**
     regenerate-on-build artifact — not committed.
6. **Byte-identical guarantee (a test, not a choice):**
   - Built **without** locales → byte-identical to today's output.
   - Built **with** locales → look and feel identical (layout/styling/structure
     unchanged; only text differs).
7. **Locales are declared in jsdoc opts** — one config source, no separate file.
   `opts.locales` (list) + `opts.defaultLocale` in `jsdoc.json` (and the
   `cleanJsdocTheme` block for TypeDoc), validated through `utils` like every
   other opt. **The user sets these first**; aadesh reads the same opts. Optional
   per-locale display name for the switcher label.
8. **Language switcher placement:** a rang `LanguageSwitcher` in the header
   controls beside `ThemeToggle`, and inside the mobile-nav drawer. Navigation,
   not a toggle.

---

## 3. Package responsibilities

### bhasha — pure **and** browser-safe (isomorphic)

Imported by rang (which bundles into the browser), so **zero `node:*`**.

- Catalog *type* + the default **English catalog** (the canonical key list).
- `useTranslation` hook → `t(key, vars?)`, a **static** lookup with named
  interpolation. **No reactivity** (locale never changes at runtime).
- `LanguageProvider` used as a **static carrier** (immutable value, no setter,
  not Zustand) — scopes the catalog per render on the server, seeds each island
  root in the browser.
- Key scheme for API slots (`longname` + field path), source-hash for staleness,
  fallback chain (active → default → key).
- Validation primitives: catalog shape, markdown-in-slot lint, interpolation
  token parity. (Reuse the diagnostics/suggest machinery from `utils/config`.)

### aadesh — the dirty work (CLI)

All disk I/O, process orchestration, cross-locale state.

- `aadesh extract` — runs the jsdoc/typedoc pipeline → template + synced
  catalogs + report. First run creates; later runs merge (soft-delete to
  `_obsolete`, `--prune` to remove), classify keys, print the report.
- `aadesh prompt` — emits an LLM translation prompt (new + stale keys only,
  exact return-JSON shape, instructions to preserve markdown / `{@link}` / code
  fences / `{var}` tokens, chunked for context limits).
- `aadesh build` — template + filled catalogs → setu stamp → dwar render →
  per-locale sites. Owns the cross-locale index, hreflang, and shared-asset
  dedup.
- `aadesh validate` — preflight (see §5).

**Interactive by default (inquirer), flag-driven for CI.** Every prompt (pick
locales, choose action, confirm `--prune`) has a flag equivalent
(`--locale`, `--prune`, `--yes`, `--strict`) so the CLI runs headless in CI and
never blocks on a prompt. Reads locale config from `jsdoc.json` opts (decision
7), not its own config file.

---

## 4. The flow (extract → translate → compile)

Standard i18n loop, two tracks.

- **Catalog track (chrome + API):** extract → merge/sync → report → translate →
  validate → build.
- **Prose track (files):** author per-locale file → fallback if missing. Nothing
  to extract; only coverage is reported.

```
# prerequisite: declare opts.locales + opts.defaultLocale in jsdoc.json
aadesh extract        # 1. build template + sync per-locale JSON + report
                      # 2. (re-run) merge: new / stale / obsolete keys, soft-delete
aadesh prompt         # 3. optional: generate LLM prompt for untranslated/stale
<user edits JSON / authors prose files>
aadesh validate       # 4a. preflight gate (resilient by default, --strict)
aadesh build          # 4b. stamp + render → per-locale sites
                      # 5. user has the localized site
```

(Interactive by default via inquirer; each step also takes flags for CI.)

**Report classifies, not just counts:** new (needs translation), stale (source
hash changed), obsolete (symbol gone), per-locale coverage %, and prose gaps
("fr: 3 guides missing"). Reuse the existing Next.js-style build-report
formatting.

**Determinism:** `extract` is idempotent — stable key ordering and
serialization, so a no-change run produces a zero git diff.

---

## 5. Validation phase

Posture mirrors the theme's existing `opts.strict`: **resilient by default,
`--strict` escalates.** The rule of thumb: **a gap is a warning, a malformation
is an error.**

- **Prose:** missing translation → warn ("using default"). Malformed directory
  layout (wrong/missing locale segment, file that maps nowhere) → error.
- **API / chrome:** missing or empty keys → warn + coverage count. Broken
  markdown-in-slot, or a translated value that **drops/renames a `{var}` token**,
  or unknown keys → error, reported **against the key** (fail fast before a full
  N-locale render).

---

## 6. Phases

Blast radius is uneven, so phase the work.

- **Phase 0 — bhasha core** *(pure/isomorphic, low risk, unblocks all)*
  Catalog type, default EN catalog, `t` + interpolation, provider (static
  carrier), key scheme, source-hash, validation primitives.
- **Phase 1 — rang refactor to `t`** *(big, invasive)*
  Every hardcoded string → key. **Write the byte-identical default test first.**
  Watch: island-provider seeding per root; attributes (`aria-label` / `title` /
  `placeholder` / `alt`); concatenated JSX → one keyed template; non-component
  utils (`toc-utils`, `search-utils`) get the catalog threaded, not a hook.
  Also build the `LanguageSwitcher` component (header controls beside
  `ThemeToggle` + mobile-nav); it renders from a list of locales passed in —
  the real cross-locale index arrives in Phase 3.
- **Phase 2 — setu template/slot + stamp** *(two-phase build)*
  Emit a locale-independent template with `{ key, sourceText }` slots at the
  manifest/mdast level (not MDX-string tokens); stamp per locale; serialize →
  dwar.
- **Phase 3 — aadesh CLI**
  extract / sync / prune / report / prompt / build / validate, interactive
  (inquirer) + CI flags, reads `jsdoc.json` locale opts, cross-locale index
  (feeds the switcher + hreflang), shared-asset dedup (content-hash makes this
  near-free: same bytes → same name → write once, all locales point at it).
- **Phase 4 — docs** — write the aadesh + bhasha architecture into the repo's
  `docs/` (root), matching the existing `ARCHITECTURE.md` style: the pipeline
  change, the two-track flow, the artifact layout, and the locked decisions.
- **Later** — prose track polish, RTL (`dir="rtl"` + logical CSS; the curved
  right-rail TOC assumes LTR), glyph/font coverage for CJK / Devanagari / Arabic.

---

## 7. Risk register

**Highest blast radius:**

- **No-localization output must stay byte-identical.** The rang refactor touches
  every component; any drift regresses *all* existing users. Guard with a test
  written before Phase 1.
- **Shared assets across locales.** CSS + island JS are locale-independent;
  emit once and point every locale at them (content-hash dedup), or output size
  and build time scale linearly for nothing.
- **Cross-locale index.** No single `SiteManifest` holds it today; the switcher,
  fallback, and hreflang all depend on it. aadesh must own it.

**API translation:**

- **Key stability under refactor.** Keys ride `longname`; rename/move orphans
  them. Source-hash catches content drift, not identity drift → soft-delete +
  obsolete report so a rename doesn't silently drop work.
- **Markdown-in-slot is a translator contract.** A broken `{@link}` / fence
  fails the page compile; dwar skips+reports, but validate at stamp time so the
  error names a key.
- **Partial translation is the normal state.** Fallback must be visible
  (coverage report), or pages look done while half-default.

**Chrome / rang:**

- The cost is the refactor, not the JSON.
- Extraction gotchas: interpolated/concatenated JSX, attributes, non-component
  code.

**Prose:**

- **Group labels won't translate** (humanized dir name) — resolve via per-locale
  frontmatter `group`.

**Reach (if "all languages" is literal):**

- **RTL** layout work; **glyph coverage** of heading/body fonts per script.

---

## 8. Open / deferred

- Plurals (ICU) — deferred; simple `{var}` interpolation only for now.
- Whether the structural template is ever committed (default: no, regenerate).
- RTL + font/glyph coverage — later phase.
- `aadesh build --locale <x>` subset builds for preview (nice-to-have).
