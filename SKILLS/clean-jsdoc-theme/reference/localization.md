# Localization (i18n) — multi-language docs

clean-jsdoc-theme can build a site in several languages. **Locale is a build
dimension, not a runtime toggle**: each language is its own static output (the
default locale at the root, others under `/<locale>`), and a header language
switcher navigates between them. Driven by the `clean-jsdoc` CLI
(`@clean-jsdoc-theme/aadesh`) on the pure i18n core (`@clean-jsdoc-theme/bhasha`).

> Install the CLI alongside the theme:
> `npm i -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh`

## Three content tracks

| Content | How it's translated |
| --- | --- |
| **UI chrome** (search, settings, nav labels) | a key→string catalog, edited in the locale JSON |
| **API descriptions** (class/member/**param**/**return** prose, summaries, example captions) | the same locale JSON — keyed slots extracted from your doclets |
| **Prose** (home page, docs pages) | per-locale **files** (`README.<locale>.md`, `docs.<locale>/`) — no extraction |

Names, type strings, enum values, and `@example` **code** stay locale-invariant —
only prose is translated.

## 1. Declare locales

In the **same** `jsdoc.json` `opts` (TypeDoc: `cleanJsdocTheme`) — no separate file:

```json5
opts: {
  // …your normal options…
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
    { code: "hi", name: "हिन्दी" },
  ],
  defaultLocale: "en",
}
```

A single-locale (or no-`locales`) build is unaffected — byte-identical to before.

## 2. The CLI workflow

The binary is `clean-jsdoc`. Every prompt has a flag, so it runs in CI; run it
with **no arguments** for an interactive menu.

```sh
clean-jsdoc extract    # build/refresh the per-locale catalogs (merges on re-run)
clean-jsdoc prompt     # (optional) emit an LLM translation prompt for new/stale keys
clean-jsdoc validate   # preflight — gaps warn, malformations error (--strict to fail on gaps)
clean-jsdoc build      # render one static site per locale
```

`extract` writes committable catalogs under `clean-jsdoc-theme-artifacts/locales/`:
`<code>.json` (editable — `chrome.*` + `api.*` strings) and `<code>.meta.json`
(auto-managed staleness/soft-deletes — don't hand-edit). Re-running `extract`
**merges**: new keys added, changed source marked stale, removed keys soft-deleted
(kept until `--prune`); a no-change run is a zero git diff. Untranslated entries
fall back to the default language, so partial translation is fine.

Common flags: `-c <config>` (default `jsdoc.json`), `--dir <artifacts>`,
`--locale <code>` (build/prompt one locale), `--typedoc`, `--prune`, `--strict`.

## 3. Localize prose (files, not catalogs)

- **Home** — add `README.<locale>.md` beside the configured README
  (`README.ja.md`, …). Missing → falls back to the default README.
- **Docs** — add a sibling `docs.<locale>/` next to `opts.docs` and translate the
  pages you want; it overlays the default **per file** (translated page wins,
  missing page falls back). A locale only needs the pages it has translated.

```
README.md      docs/        # default language
README.ja.md   docs.ja/     # Japanese overlay (translate what you want)
README.hi.md   docs.hi/     # Hindi overlay
```

> Keep a doc's `group` frontmatter the **same across locales** (translate the
> `title`, not the `group`) — a differing `group` value splits the sidebar section.

## 4. Per-language fonts

A Latin display font can render CJK/Devanagari poorly. Override per locale with a
`"<code>:slot"` key in `fonts` (unprefixed = default; a locale that omits a slot
falls back to it):

```json5
fonts: {
  heading: "Source Serif 4", body: "Roboto",
  "ja:heading": "Noto Sans JP", "ja:body": "Noto Sans JP",
  "hi:heading": "Noto Sans Devanagari", "hi:body": "Noto Sans Devanagari",
}
```

## What you get

One site per locale (default at root, others at `/<locale>`), a header language
switcher (after search on desktop, before the menu button on mobile), `hreflang`
alternates, translated chrome + API reference + prose, and per-locale fonts —
each locale loading only its own Google Fonts.

> **Scope:** the localized **build** path is JSDoc-only today; the TypeDoc bridge
> supports `extract` but not yet per-locale build. Runnable reference in the repo:
> `examples/with-i18n-example` (en/ja/hi).
