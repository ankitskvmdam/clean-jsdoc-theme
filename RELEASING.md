# Releasing

This monorepo (pnpm@9 + Turborepo) uses [Changesets](https://github.com/changesets/changesets)
to drive versioning and changelogs, and a **tag-based** GitHub Actions workflow
to publish to npm. The default branch is **`master`**.

## What gets published

Everything under `packages/*` is published in **lockstep** — all eight packages
always share one version and ship together:

- `clean-jsdoc-theme` (the unscoped public entry, owned since v4)
- `@clean-jsdoc-theme/utils`
- `@clean-jsdoc-theme/setu`
- `@clean-jsdoc-theme/rang`
- `@clean-jsdoc-theme/dwar`
- `@clean-jsdoc-theme/aadesh`
- `@clean-jsdoc-theme/bhasha`
- `@clean-jsdoc-theme/typedoc`

`examples/*` and `docs-site` are `private: true` and are never published.

### Lockstep: `fixed`, not `linked`

`.changeset/config.json` declares a single **`fixed`** group containing all eight
publishable packages. We chose `fixed` (not `linked`) deliberately:

- **`fixed`** — the packages are *always* the same version and are *always*
  published together, even if a given release only touched one of them. This is
  the simplest mental model for a lockstep suite and makes a single repo-level
  `vX.Y.Z` git tag meaningful: the tag describes the whole suite.
- **`linked`** — packages share a version only when they actually change in the
  same release; untouched packages keep their old version. That breaks the
  "one tag = one suite version" story we want.

`updateInternalDependencies: "patch"` keeps the workspace (`workspace:*`)
dependencies between these packages in sync as versions bump.

> Future option: switch `"changelog"` from `@changesets/cli/changelog` to
> `["@changesets/changelog-github", { "repo": "ankitskvmdam/clean-jsdoc-theme" }]`
> for PR/commit-linked changelog entries. It adds a dev dependency and needs a
> GitHub token at `changeset version` time, so we keep the basic changelog for now.

## During development: add a changeset

Every change that affects a published package needs a changeset. After making
your change, run:

```sh
pnpm changeset
```

This is interactive: pick the affected packages, choose a bump type, and write a
short summary. It writes a markdown file under `.changeset/` — **commit that file
with your change.**

Because all packages are in one `fixed` group, selecting *any* package in the
group bumps the whole group together. Pick the bump type that reflects the
biggest change in the release.

For a change that touches the repo but does **not** need a published version bump
(docs, CI, examples), record that intent explicitly:

```sh
pnpm changeset add --empty
```

### Bump-type guidance (pre-1.0 / `5.0.0-alpha`)

The suite is currently at `5.0.0-alpha.0`. While pre-1.0:

- Semver's pre-1.0 rules are loose, so **be explicit** about intent rather than
  relying on automatic semantics.
- The alpha → beta → stable progression is driven by **prerelease mode**
  (`changeset pre enter` / `pre exit`, see below), not by hand-editing versions.
- Within a prerelease line, a `minor` changeset bumps the prerelease counter
  (e.g. `…-beta.0` → `…-beta.1`). Use `major`/`minor`/`patch` to describe the
  change as you normally would; the prerelease line handles the suffix.

## Cutting a release

Versioning happens **before** tagging — this keeps the process genuinely
tag-based. We do **not** use the Changesets "Version Packages" PR bot.

### 1. Pre-version check ("are we skipping anything?")

```sh
pnpm release:check        # alias for: changeset status --verbose
```

This lists every package and its pending bump (or reports no changesets). Eyeball
it: **if a package you changed shows no bump, add a changeset before versioning.**

In CI, the equivalent gate runs against the base branch:

```sh
pnpm changeset status --since=origin/master --verbose
```

### 2. Apply versions + changelogs

```sh
pnpm version-packages     # = changeset version && pnpm install --lockfile-only
```

`changeset version` consumes the `.changeset/*.md` files, bumps every package in
the `fixed` group to the new version, and updates each package's `CHANGELOG.md`.
The follow-up `pnpm install --lockfile-only` keeps `pnpm-lock.yaml` in sync with
the bumped internal versions. Commit the resulting version bumps, changelogs, and
lockfile change.

### 3. Tag and push

Tag the commit with the new suite version and push the tag:

```sh
git tag v5.0.0
git push origin v5.0.0
```

Pushing a `v*` tag triggers the release workflow (added in a later phase), which
runs the full build/test/typecheck/lint gate and then `changeset publish`.
`changeset publish` only publishes packages whose version isn't already on npm,
so re-running is safe, and it skips `private` packages automatically.

## Prerelease flow (alpha / beta → npm `next`)

To ship prereleases:

```sh
pnpm changeset pre enter beta     # start a prerelease line (creates .changeset/pre.json)
pnpm changeset                    # add changesets as usual
pnpm version-packages             # bumps to x.y.z-beta.N
git tag v5.0.0-beta.1
git push origin v5.0.0-beta.1     # release workflow publishes under the `next` dist-tag
# … iterate: more changesets, version-packages, tag -beta.2, etc.
pnpm changeset pre exit           # when ready for a stable release
```

**Dist-tag rule:** the release workflow derives the npm dist-tag from the git
tag — a tag containing a `-` (e.g. `v5.0.0-beta.1`, `v5.0.0-alpha.0`) publishes
under **`next`**; any other tag (e.g. `v5.0.0`) publishes under **`latest`**.
Commit `.changeset/pre.json` while you're in a prerelease line, and remember to
`pre exit` before cutting the stable release.
