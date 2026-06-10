# Contributing

Thanks for contributing to `clean-jsdoc-theme`! This is a pnpm@9 + Turborepo
monorepo. The default branch is **`master`**.

## Getting started

```sh
pnpm install
pnpm build        # turbo run build (build first — test/typecheck depend on artifacts)
pnpm test         # turbo run test
pnpm typecheck    # turbo run typecheck
pnpm lint         # turbo run lint
pnpm format       # prettier --write .
```

See `ARCHITECTURE.md` for how the packages fit together (utils → setu → rang →
dwar, plus `clean-jsdoc-theme`, `aadesh`, `bhasha`, `typedoc`).

## Pull requests

- Branch off `master`.
- Keep `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check` green.
- **Add a changeset** for any change that affects a published package (see below).

## Releasing

We use [Changesets](https://github.com/changesets/changesets) for versioning and
changelogs, and a tag-based release. The full process lives in
[`RELEASING.md`](./RELEASING.md). The essentials:

### Add a changeset with your change

Every change that affects a published package needs a changeset:

```sh
pnpm changeset
```

Pick the packages, choose a bump type (`patch` / `minor` / `major`), write a
summary, and **commit the generated `.changeset/*.md` file** with your change.

All eight publishable packages (`clean-jsdoc-theme` + the seven
`@clean-jsdoc-theme/*` packages) are in one **`fixed`** lockstep group, so they
always share a version and ship together; selecting any of them bumps the whole
suite. For repo changes that don't need a published bump (docs, CI, examples),
use `pnpm changeset add --empty`.

While the suite is pre-1.0 (`5.0.0-alpha`), be explicit about bump type; the
alpha → beta → stable progression is driven by prerelease mode
(`changeset pre enter beta` / `pre exit`) — see `RELEASING.md`.

### Maintainers: cut a release

```sh
pnpm release:check        # changeset status --verbose — eyeball pending bumps; nothing skipped?
pnpm version-packages     # changeset version && pnpm install --lockfile-only — bump + changelog
git commit -am "release vX.Y.Z"
git tag vX.Y.Z
git push origin vX.Y.Z    # pushing the v* tag triggers the release workflow
```

A tag containing `-` (e.g. `vX.Y.Z-beta.1`) publishes under npm `next`; otherwise
`latest`. Full details, including the prerelease flow and the `fixed`-group
rationale, are in [`RELEASING.md`](./RELEASING.md).
