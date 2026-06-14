---
title: Localize your docs
group: Guides
order: 5
---

# Localize your docs

clean-jsdoc-theme can ship your documentation in **multiple languages**. Each
locale is rendered to its own static output — the default language at the root,
the others under `/<locale>` — and a language switcher in the header navigates
between them. Three kinds of content get translated:

| Content | Source | How |
| --- | --- | --- |
| **UI chrome** (search, settings, nav labels) | a key→string catalog | translated in the locale JSON |
| **API descriptions** (class/member/param/return prose) | your doclets | translated in the locale JSON |
| **Prose** (home page, docs pages) | per-locale files | `README.<locale>.md` + `docs.<locale>/` |

The workflow runs through the [`clean-jsdoc`](/packages/aadesh-overview) CLI
(the **aadesh** package), backed by the pure i18n core
([**bhasha**](/packages/bhasha-overview)).

> [!NOTE]
> Install the CLI alongside the theme:
> `pnpm add -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh`

## 1. Declare your locales

Locales live in your existing `jsdoc.json` opts (TypeDoc: the `cleanJsdocTheme`
block) — there's no separate config file:

```json
{
  "opts": {
    "destination": "dist",
    "readme": "./README.md",
    "docs": "docs",
    "locales": [
      { "code": "en", "name": "English" },
      { "code": "ja", "name": "日本語" },
      { "code": "hi", "name": "हिन्दी" }
    ],
    "defaultLocale": "en"
  }
}
```

A list of `{ code, name }` (or bare `"en"` strings) plus the default. The `name`
is the switcher label. A single-locale (or no-`locales`) build is unaffected — it
renders exactly as before.

## 2. Extract the catalogs

```sh
clean-jsdoc extract
```

This runs your pipeline, collects every translatable string (chrome + API), and
writes one committable catalog per locale under
`clean-jsdoc-theme-artifacts/locales/`:

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # the skeleton — values ARE the source text
  en.meta.json   # auto-managed bookkeeping (don't edit)
  ja.json        # values blank until you translate them
  ja.meta.json
  ...
```

Re-run `extract` any time your docs change — it **merges**: new keys are added,
changed source marks a key stale, removed keys are soft-deleted (kept until
`--prune`). A no-change run produces a zero git diff.

## 3. Translate

Edit each locale's `<code>.json` by hand, or generate a prompt for an LLM:

```sh
clean-jsdoc prompt
```

`prompt` emits a ready-to-paste prompt containing only the untranslated and stale
entries, chunked for context limits, with instructions to preserve markdown,
`{@link}`, code fences, and `{var}` interpolation tokens. Paste the model's JSON
back into the catalog.

You don't have to translate everything — anything left blank falls back to the
default language, so a partially-translated site is fine (and the coverage shows
up in the report).

## 4. Validate (optional)

```sh
clean-jsdoc validate          # warns on gaps, errors on malformations
clean-jsdoc validate --strict # gaps become failures too (for CI)
```

## 5. Build

```sh
clean-jsdoc build
```

One site per locale: the default locale at `destination`, each other locale under
`destination/<locale>`. The language switcher and `hreflang` alternates are wired
automatically from the set of locales each page actually exists in.

## Localizing prose

Catalogs cover the chrome and API reference. Free-form prose is localized by
**file** — no extraction:

- **Home page** — add a `README.<locale>.md` next to your configured README
  (`README.ja.md`, `README.hi.md`, …). aadesh renders it as that locale's home;
  a missing variant falls back to the default README.
- **Docs pages** — add a sibling `docs.<locale>/` directory next to your
  `opts.docs` folder and translate the files you want. It overlays the default
  docs **per file**: a translated page wins, a missing one falls back to the
  default. So a locale only needs the pages it has actually translated.

```
README.md            docs/                 # default language
README.ja.md         docs.ja/              # Japanese overlay (translate what you want)
README.hi.md         docs.hi/              # Hindi overlay
```

> [!TIP]
> Keep a doc's `group` frontmatter value the same across locales (translate the
> `title`, not the `group`) — otherwise the same section can split into two
> sidebar groups.

## Per-language fonts

A translated heading rendered in a Latin display font can look wrong for CJK or
Devanagari. Override the font per locale with a `<locale>:` prefix in `opts.fonts`
— anything without a prefix is the default, and a locale that omits a slot falls
back to it:

```json
{
  "opts": {
    "fonts": {
      "heading": "Source Serif 4",
      "body": "Roboto",
      "ja:heading": "Noto Sans JP",
      "ja:body": "Noto Sans JP",
      "hi:heading": "Noto Sans Devanagari",
      "hi:body": "Noto Sans Devanagari"
    }
  }
}
```

Each locale's build then requests only its own families from Google Fonts.

## Interactive mode

Prefer a guided run? Invoke the CLI with no arguments:

```sh
clean-jsdoc
```

It opens a welcome banner and a command picker that prompts for each command's
options and offers to save the equivalent command to your `package.json` scripts.

## A complete example

See [`examples/with-i18n-example`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/with-i18n-example)
in the repo — a three-locale (en / ja / hi) project with translated API
descriptions, chrome, a per-locale home page, a localized **Guide** docs section
(with a deliberate fallback to show partial translation), and per-language fonts.

## Next

- [aadesh Overview](/packages/aadesh-overview) — the CLI in depth.
- [bhasha Overview](/packages/bhasha-overview) — the i18n core.
- [Configuration](/theme/configuration) — every theme option.
