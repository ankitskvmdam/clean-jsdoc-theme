# @clean-jsdoc-theme/aadesh

The **CLI for clean-jsdoc-theme** — localization is its first area. aadesh does
the disk-bound, process-orchestrating work the pure, browser-safe core
[`@clean-jsdoc-theme/bhasha`](../bhasha) deliberately can't: spawning your
JSDoc/TypeDoc pipeline, reading and writing the committable locale catalogs, and
rendering one static site per locale.

The published binary is **`clean-jsdoc`**. Localization authoring lives under the
**`i18n`** command group (`clean-jsdoc i18n …`); **`build`** is top-level because
it renders your site whether or not you use multiple locales. The top-level
namespace is reserved for future command groups.

> You only need aadesh to ship **multiple languages**. A single-language site is
> built directly by JSDoc (`jsdoc -t clean-jsdoc-theme`) or the TypeDoc plugin —
> no CLI required.

## Install

```sh
pnpm add -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh
```

## The workflow

Locale is a **build dimension**, not a runtime toggle: each language renders to
its own static output (the default locale unprefixed, the others under
`/<locale>`), and the language switcher is navigation between them. aadesh reads
its locale config from the **same `jsdoc.json` opts** you already use
(`opts.locales` + `opts.defaultLocale`) — there's no separate config file.

```sh
clean-jsdoc i18n extract    # sync the per-locale catalogs from your docs
clean-jsdoc i18n prompt     # (optional) write LLM translation prompt files
clean-jsdoc i18n validate   # preflight the catalogs
clean-jsdoc build           # render one site per locale
```

Run `clean-jsdoc` with **no subcommand** for a guided interactive menu (a welcome
banner, a command picker, option prompts with defaults, and an offer to save the
equivalent command to your `package.json` scripts).

### The commands

- **`extract`** — runs the pipeline in *extract mode*, collects every translatable
  string (UI chrome + API descriptions/summaries/example captions + parameter and
  return descriptions), and syncs them into one committable JSON per locale.
  Re-runs **merge**: new keys are added, source changes mark a key *stale*, and
  removed keys are soft-deleted (kept until `--prune`). A no-change run is a zero
  git diff.
- **`prompt`** — writes a ready-to-use LLM translation prompt **file** per locale
  under `clean-jsdoc-theme-artifacts/locales/prompts/` (`<code>.md`, or
  `<code>.part-01.md`, … chunked for context limits) covering only the new and
  stale keys, with the exact return-JSON shape and instructions to preserve
  markdown / `{@link}` / code fences / `{var}` tokens. Paste each file into an LLM
  or upload the `.md` directly. The directory is git-ignored and regenerated each
  run.
- **`validate`** — preflights the catalogs: a coverage gap warns, a malformation
  (broken markdown-in-slot, a dropped `{var}` token, unknown keys) errors.
  Resilient by default; `--strict` escalates warnings to failures for CI.
- **`build`** — template + filled catalogs → setu stamp → dwar render → one site
  per locale. Owns the cross-locale index that feeds the language switcher and the
  `hreflang` alternates.

Every prompt has a flag equivalent (`--config`, `--dir`, `--prune`, `--strict`,
`--locale`, `--chunk-size`, `--typedoc`), so the CLI runs headless in CI.

## The artifacts

Catalogs live under `clean-jsdoc-theme-artifacts/locales/`, **committed** to your
repo and edited by hand (or by your translation workflow). Each locale is two
files:

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # editable: _version + chrome / api translations
  en.meta.json   # auto-managed: source hashes + soft-deleted keys (don't touch)
  ja.json
  ja.meta.json
```

The editable file holds only what a translator changes; the staleness hashes and
soft-deletes live in the sibling `.meta.json` so machine bookkeeping never
clutters the file you review.

## Prose localization

Beyond the keyed catalogs, free-form prose is localized by **file**, no extraction
needed:

- **Home page** — a sibling `README.<locale>.md` next to your configured README is
  rendered as that locale's home (falling back to the default README when absent).
- **Docs** — a sibling `docs.<locale>/` directory overlays your `opts.docs` per
  file: a translated page wins, a missing one falls back to the default doc.

## Today's limits

The TypeDoc bridge supports **extract** but not yet the localized **build** path —
per-locale rendering is JSDoc-only for now. Tutorials prose and shared-asset
content-hash dedup across locales are tracked follow-ups.

## Documentation

- **Walkthrough** — [Localize your docs](https://ankdev.me/clean-jsdoc-theme/guides/localize-your-docs)
- **CLI in depth** — [aadesh overview](https://ankdev.me/clean-jsdoc-theme/packages/aadesh-overview)
- **i18n core** — [`@clean-jsdoc-theme/bhasha`](../bhasha)

A runnable three-locale (en / ja / hi) reference lives at
[`examples/with-i18n-example`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/with-i18n-example).

## License

MIT.
