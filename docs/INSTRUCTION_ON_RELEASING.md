# Instructions on Releasing

An operational, step-by-step walkthrough for publishing the suite — **starting
with alpha prereleases to validate the whole pipeline** before any stable
release. For the reference details (the `fixed` lockstep group, changeset
authoring, prerequisites), see [`RELEASING.md`](./RELEASING.md).

## How the pipeline works

1. You version locally with Changesets — all eight `packages/*` move in lockstep
   (the `fixed` group). Anything outside `packages/` is `private` and is never
   versioned or published.
2. You push a `v*` **git tag**. The tag is the trigger.
3. `.github/workflows/release.yml` checks out the tag, runs the full gate
   (`build` → `test` → `typecheck` → `lint`), then `pnpm changeset publish`.
4. The npm **dist-tag is derived from the tag name**: a tag containing a `-`
   (e.g. `v5.0.0-alpha.1`) publishes under **`next`**; a plain `v5.0.0`
   publishes under **`latest`**.
5. `changeset publish` only publishes versions not already on npm, so it is
   idempotent (safe to re-run) and skips `private` packages automatically.

**Safety property:** alpha/beta tags publish under `next`, never `latest`, so
existing `npm install clean-jsdoc-theme` (v4) users are untouched while you test.

## One-time prerequisites

1. **npm access** — the publishing identity can publish the
   `@clean-jsdoc-theme/*` scope **and** the unscoped `clean-jsdoc-theme`
   (owned since v4 — the riskiest first publish).
2. **`NPM_TOKEN` secret** — create an npm **automation** token with publish
   rights and add it as the repo secret `NPM_TOKEN` (Settings → Secrets and
   variables → Actions). The release workflow wires it to `NODE_AUTH_TOKEN`
   (the variable `actions/setup-node`'s generated `.npmrc` authenticates with).
3. **Push your branch + workflows to GitHub** — the Actions only run once the
   workflow files are on GitHub.

## Step 0 — dry-run locally first (no publish)

Validate the mechanics before any tag:

```sh
pnpm release:check                                   # what would version-bump
pnpm build && pnpm test && pnpm typecheck && pnpm lint   # the gate the workflow runs
pnpm -r publish --dry-run --no-git-checks            # packs every package, prints what WOULD publish — never uploads
```

If the dry-run lists all eight packages with no errors, the mechanics are sound.

## Step 1 — publish the first alpha

The suite is at `5.0.0-alpha.0`. Enter a prerelease line and cut the first alpha:

```sh
pnpm changeset pre enter alpha       # creates .changeset/pre.json — commit it
pnpm changeset                       # pick any package (the fixed group bumps all), a bump type, a summary
pnpm release:check                   # eyeball the pending bump
pnpm version-packages                # changeset version + lockfile sync → 5.0.0-alpha.1 + CHANGELOGs
git add -A && git commit -m "release: v5.0.0-alpha.1"
git tag v5.0.0-alpha.1
git push origin <branch> --follow-tags    # pushes the commit AND the tag
```

Pushing the `v5.0.0-alpha.1` tag fires `release.yml` → gate → `changeset publish
--tag next` → all eight packages land on npm under `@next`, with provenance.

## Step 2 — verify

```sh
npm dist-tag ls clean-jsdoc-theme            # expect: next: 5.0.0-alpha.1
npm view @clean-jsdoc-theme/typedoc@next version
npm install clean-jsdoc-theme@next           # in a scratch project
```

Also confirm the Actions run is green and the provenance attestation appears on
npmjs.com.

## Iterating + graduating to stable

- **More alphas:** `pnpm changeset` → `pnpm version-packages` → tag
  `v5.0.0-alpha.2` → push. Repeat.
- **To stable:** `pnpm changeset pre exit`, commit, then `pnpm version-packages`
  → `5.0.0`, tag **`v5.0.0`** (no `-`) → publishes under **`latest`**. That is
  the moment v4 users begin receiving v5 — do it only when confident.

## Notes

- **Branch:** the release workflow triggers on the *tag* regardless of branch,
  so an alpha cut from `v5` works. But CI (`ci.yml`) and the changeset
  `--since=origin/master` gate key off `master` — merge `v5` → `master` before
  the stable release for a clean story.
- **Scope is `packages/` only.** `.changeset/config.json` sets
  `privatePackages: { version: false, tag: false }`, so `examples/*` and
  `docs-site` are never versioned, changelogged, prompted, tagged, or published.
- **Smaller first canary (optional):** instead of all eight at once, publish one
  package by hand to validate auth/provenance, then do the full tag-driven flow:
  ```sh
  pnpm build
  cd packages/utils && npm publish --tag next --provenance
  ```
