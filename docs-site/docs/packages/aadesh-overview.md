---
title: Overview
group: Packages/aadesh
order: 20
---

# `@clean-jsdoc-theme/aadesh`

`@clean-jsdoc-theme/aadesh` is the **localization CLI** for clean-jsdoc-theme. It
does the disk-bound, process-orchestrating half of i18n — the work that
[bhasha](/packages/bhasha-overview) (the pure, browser-safe core) deliberately
can't: spawning your JSDoc/TypeDoc pipeline, reading and writing the committable
locale catalogs, and rendering one static site per locale.

The published binary is **`clean-jsdoc`**. Most projects use it through four
subcommands (and an interactive menu when you run it with no arguments):

```sh
clean-jsdoc extract    # sync the per-locale catalogs from your docs
clean-jsdoc prompt     # (optional) emit an LLM translation prompt
clean-jsdoc validate   # preflight the catalogs
clean-jsdoc build      # render one site per locale
```

> If you just want to ship a single-language site you never need aadesh — the
> JSDoc/TypeDoc entry points build that directly. aadesh is the layer you add
> when you want **multiple languages**. The full walkthrough is in
> [Localize your docs](/guides/localize-your-docs).

## Where it sits

Locale is a **build dimension**, not a runtime toggle: each language is rendered
to its own static output (the default locale unprefixed, the others under
`/<locale>`), and the language switcher is navigation between them. aadesh owns
that fan-out. It reads your locale config from the **same `jsdoc.json` opts** you
already use (`opts.locales` + `opts.defaultLocale`) — there's no separate config
file — and drives the real theme pipeline twice: once in *extract mode* to pull
out translatable strings, and once per locale in *build mode* to stamp the
translations back in.

## The commands

- **`extract`** — runs the pipeline in extract mode, collects every translatable
  string (UI chrome + API descriptions/summaries/example captions + parameter and
  return descriptions), and syncs them into one committable JSON per locale. Re-runs
  are a merge: new keys are added, source changes mark a key *stale*, and removed
  keys are soft-deleted (kept until `--prune`) so a rename never drops a
  translator's work. A no-change run is a zero git diff.
- **`prompt`** — emits a ready-to-paste LLM translation prompt for the new and
  stale keys only, chunked for context limits, with the exact return-JSON shape and
  instructions to preserve markdown / `{@link}` / code fences / `{var}` tokens.
- **`validate`** — preflights the catalogs: a coverage gap warns ("using the
  default"), a malformation (broken markdown-in-slot, a dropped `{var}` token,
  unknown keys) errors. Resilient by default; `--strict` escalates warnings to
  failures for CI.
- **`build`** — template + filled catalogs → setu stamp → dwar render → one site
  per locale. Owns the cross-locale index that feeds the language switcher and the
  `hreflang` alternates.

Every prompt has a flag equivalent (`--config`, `--dir`, `--prune`, `--strict`,
`--locale`, `--typedoc`), so the CLI runs headless in CI and never blocks.

## The artifacts

Catalogs live under `clean-jsdoc-theme-artifacts/locales/`, **committed** to your
repo and edited by hand (or by your translation workflow). Each locale is two
files:

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # editable: _version + chrome.* / api.* translations
  en.meta.json   # auto-managed: source hashes + soft-deleted keys (don't touch)
  ja.json
  ja.meta.json
```

The editable file holds only what a translator changes; the staleness hashes and
soft-deletes live in the sibling `.meta.json` so machine bookkeeping never clutters
the file you review.

## Prose localization

Beyond the keyed catalogs, free-form prose is localized by **file**, no extraction
needed:

- **Home page** — a sibling `README.<locale>.md` next to your configured README is
  rendered as that locale's home (falling back to the default README when absent).
- **Docs** — a sibling `docs.<locale>/` directory overlays your `opts.docs` per
  file: a translated page wins, a missing one falls back to the default doc.

## Interactive mode

Run `clean-jsdoc` with no subcommand for a guided menu: a welcome banner, a command
picker that shows each command's description, prompts for its options (defaults
pre-filled), and an offer to save the equivalent command to your `package.json`
scripts so you can re-run it with `npm run <key>`.

## Read the source

- **Package directory:**
  [packages/aadesh](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh)
  ·
  [packages/aadesh/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src)
- **CLI entry + subcommands:**
  [`cli.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/cli.ts)
  ·
  [`runners.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/runners.ts)
  ·
  [`interactive/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/interactive)
- **Commands:**
  [`commands/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/commands)
  (extract / prompt / validate / build)
- **Catalog core (pure):**
  [`locale/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/locale)
  (template, merge, file model) ·
  [`artifacts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/artifacts.ts)
  (the disk layer)

## Next

- [Localize your docs](/guides/localize-your-docs) — the end-to-end workflow.
- [bhasha Overview](/packages/bhasha-overview) — the pure i18n core aadesh builds on.
