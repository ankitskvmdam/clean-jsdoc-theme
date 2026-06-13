# Kickoff prompt — Phase 0 (bhasha core)

Paste this to the implementer in Claude Code, with `aadesh-bhasha-plan.md` in the
repo (or in context).

---

Work on a new branch `feat/bhasha-core`. Commit in small, logical chunks with no
Claude attribution (the repo's `.claude/settings.json` sets
`attribution.commit`/`pr` to empty). After each chunk, stop and let the
`code-reviewer` subagent review before continuing.

Implement **Phase 0** from `aadesh-bhasha-plan.md`: the `bhasha` package core.
bhasha must be **pure and browser-safe** — zero `node:*` (rang bundles it into
the browser). Deliverables:

1. **Catalog type** + the default **English catalog** (the canonical key list).
   Namespaced `chrome.*` and `api.*`. Export the type derived from the EN catalog
   so `t` keys are compile-checked.
2. **`useTranslation` hook → `t(key, vars?)`** — a *static* lookup with simple
   named interpolation (`{count}`). No reactivity, no store. Memoizable.
3. **`LanguageProvider`** used as a static carrier: immutable value, no setter.
   Must work for SSR (scoped per render) and seed an island root in the browser.
4. **Key scheme** for API slots: `longname` + field path. **Source-hash** helper
   for staleness.
5. **Fallback chain:** active → default → key.
6. **Validation primitives:** catalog shape, markdown-in-slot lint, interpolation
   token parity. Reuse `utils/config` diagnostics + `suggest.ts` patterns; do not
   re-invent them.

Constraints:
- Do **not** touch rang/setu/dwar yet — Phase 0 is bhasha-only.
- Add vitest coverage for `t` interpolation, fallback order, token-parity
  validation, and source-hash stability.
- Keep everything tree-shakeable and isomorphic; add a lint/grep guard that fails
  if `node:*` appears in bhasha.

When the package builds, typechecks, lints, and tests green, summarize what
changed and hand off to the reviewer.
