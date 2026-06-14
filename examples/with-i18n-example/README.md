# Widget Kit — localized docs example

A minimal fixture for **`clean-jsdoc-theme`'s multi-language support**, built
with three languages: English (`en`, default), Japanese (`ja`), and Hindi
(`hi`).

The API reference (the `Widget` class + the module overview) is translated per
locale through committed catalogs in `clean-jsdoc-theme-artifacts/locales/`, and
the UI chrome (search, navigation, settings, the table of contents) is localized
too. The home page is localized per locale via `README.<locale>.md`. Switch
languages with the **Languages** control in the header (after the search icon on
desktop; in the bar before the menu button on mobile).

## Try it

```sh
pnpm install
pnpm --filter example-with-i18n run docs   # build the theme, then every locale
pnpm --filter example-with-i18n run serve  # serve ./dist
```

The default locale renders at the root (`/`); the others under `/ja` and `/hi`.

## The localization workflow

```sh
clean-jsdoc extract   # sync the per-locale catalogs against the API + chrome keys
clean-jsdoc prompt    # (optional) emit an LLM prompt for the untranslated keys
clean-jsdoc validate  # preflight the catalogs
clean-jsdoc build     # stamp + render one site per locale
```

> Note: the home page is localized — `aadesh build` picks up a sibling
> `README.<locale>.md` (here `README.ja.md` / `README.hi.md`) and renders it as
> that locale's home, falling back to this `README.md` when a variant is missing.
> The rest of the translated content is the **API reference** (the module +
> `Widget` descriptions) and the **UI chrome**. The remaining prose-track gap is
> multi-page docs/tutorials, not the home.
