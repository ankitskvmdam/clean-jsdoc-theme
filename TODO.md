# v5 — root-level work plan

The four boundary packages (`utils`, `setu`, `rang`, `dwar`) plus the JSDoc bridge in `packages/clean-jsdoc-theme/` are now wired end-to-end (170 tests, error-free lint, `examples/basic` builds cleanly). Everything below is what's left at the root and in the adjacent packages.

For architecture context, see [`packages/setu/docs/architecture.md`](./packages/setu/docs/architecture.md) and the per-package READMEs. For a status snapshot of completed work, see [`DONE_SO_FAR.md`](./DONE_SO_FAR.md).

---

## Done since the last snapshot

- ~~P0.1 — Real `publish.ts` bridge in `packages/clean-jsdoc-theme/`~~ — `f7dfa7a`
- ~~P0.2 — CJS export that JSDoc 4 can `require()`~~ — verified via `f7dfa7a`
- ~~P0.3 — `examples/basic` builds v5 end-to-end~~ — `f7dfa7a`
- ~~P1.6 — `setu/src/mdx.ts` `no-useless-escape`~~ — `c12d5f9`
- ~~Frontmatter-as-heading bug in dwar's MDX pipeline~~ — `8993d45`
- ~~`process.chdir(dwarDir)` workaround in publish.ts~~ — `a1fcb04` (dwar default now anchors at its own package dir)

---

## UI / theming follow-ups (from the post-Phase-4 visual pass)

These came out of the Claude-Code-docs-style pass (fonts + navbar). See the "UI / theming pass" section in [`DONE_SO_FAR.md`](./DONE_SO_FAR.md). The changes are in the working tree but **not yet committed**.

### U1. Fix `MobileNav` — completely broken

Deferred deliberately. A stray `return null;` that was disabling it has been removed (so tests pass), but the drawer itself is still broken and needs a real fix. Until then it renders the hamburger but the behavior is not trusted. Owner-flagged as "don't deal with it now."

### U2. Re-add search (CmdK) + theme (ThemeToggle) to the navbar

Both were temporarily removed from the header during the restyle. The island chunks still build, so re-adding is markup-only — do it once the navbar design settles.

### U3. Reconcile sidebar/TOC sticky offset with the new header height

The header is now `h-16` (4rem) but the sidebar/TOC `<aside>` sticky wrappers still use `top-20` (5rem) from the old taller header. Align them so the rails sit flush under the header.

### U4. Commit the UI / theming working-tree changes

Fonts contract + navbar restyle + new CSS utilities are uncommitted. Commit once MobileNav's state is settled (U1/U2) so the commit isn't split awkwardly.

---

## P1 — Quality + CI

### 1. Add CI

No `.github/` directory exists today. Add `.github/workflows/ci.yml` running on push and PR:

```
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
```

Matrix Node 20 + 22. Once CI is green, add an `examples/basic` build step so regressions in the publish bridge surface there too.

### 2. Clean up the `bhasha` lint warning

`packages/bhasha/src/index.ts:1` — `warning  Unused eslint-disable directive (no problems were reported)`. One-line fix; takes the workspace from "0 errors / 1 warning" to fully clean. Easiest to bundle with whatever scope decision lands for bhasha (see P2).

---

## P2 — Content quality + adjacent packages

### 3. Fix the duplicate-class-as-member rendering in `setu`

Surfaced while verifying the `examples/basic` build: every class page has a duplicate `## Other` section at the bottom that re-renders the class doclet itself as if it were a member of the class (e.g. on `user/`, the constructor info appears once under `## Constructor` and again under `## Other → User`). Lives in `packages/setu/src/class-view.ts` (the member enumeration logic is picking up the class doclet itself). Small fix; no pipeline change required.

### 4. Implement (or remove) `@clean-jsdoc-theme/aadesh`

`packages/aadesh/src/cli.ts` is `console.log('clean-jsdoc CLI — Phase 1 stub')`. JSDoc's `-t` flag already works via the publish bridge, so the CLI is no longer a blocker for usability. Decide whether `clean-jsdoc build <jsdoc-config>` is a worthwhile DX win over `jsdoc -c jsdoc.json` and implement or remove accordingly.

### 5. Decide scope for `@clean-jsdoc-theme/bhasha`

i18n package; today only `LocaleFile` and `createEmptyLocale`. Multi-phase project on its own. Decide: defer to v5.1 or fold the extract / merge / translate flow into the v5-alpha scope.

---

## P3 — Release readiness

### 6. Populate `docs-site/`

Currently just a stub README. Dogfood the theme against its own docs — best confidence-check artifact and the eventual home for `ankdev.me/clean-jsdoc-theme/v5/`. Do this once the content-quality issues in P2.3 are fixed.

### 7. Fill in `MIGRATION.md` and `BREAKING_CHANGES.md`

Both are placeholders. Write the real content once the user-facing surface is stable: v4 config → v5 config mapping, named feature parity, what's deprecated.

### 8. Update `package.json.homepage`

Still points to `https://ankdev.me/clean-jsdoc-theme/v4/index.html`. Flip to the v5 path once `docs-site/` ships.

### 9. Add a changeset for `v5.0.0-alpha.0`

Workspace uses `@changesets/cli`. Need a `.changeset/` entry capturing the breaking change before the first alpha publish.

---

## P4 — Chores

### 10. Relax `turbo.json` `test` task

Today: `test` depends on `build`, forcing a full tsup rebuild before vitest. Vitest does its own transform so the build dependency isn't required. Switch to `dependsOn: ["^build"]` (workspace deps only) to speed up `pnpm test`.

### 11. Verify the `clean-jsdoc-theme` name collision

Both the root `package.json` and `packages/clean-jsdoc-theme/package.json` declare `"name": "clean-jsdoc-theme"`. pnpm handles this via workspace placement; confirm there are no install-time warnings and the intent is clear.

### 12. Add a `.gitattributes`

Repo currently doesn't enforce line endings; every git op on a modified file warns `LF will be replaced by CRLF`. Add `* text=auto eol=lf` (or the project preference) so the working tree stays consistent on Windows.

---

## Recommended order for the next session

1. **P1.1 (CI)** — locks in the green-state guarantee before anything else changes.
2. **P2.3** — small, high-visibility content fix; should land before publishing the alpha.
3. **P1.2** — one-line cleanup if bhasha stays.
4. **P3** items as the alpha approaches publish.
5. **P4** chores anywhere they fit.
