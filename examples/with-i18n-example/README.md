# Widget Kit — localized docs example

A minimal fixture for **`clean-jsdoc-theme`'s multi-language support**, built
with three languages: English (`en`, default), Japanese (`ja`), and Hindi
(`hi`).

The API reference (the `Widget` class + the module overview) is translated per
locale through committed catalogs in `clean-jsdoc-theme-artifacts/locales/`, and
the UI chrome (search, navigation, settings, the table of contents) is localized
too. Switch languages with the globe control beside the title.

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

> Note: this README itself is prose and currently renders in English across all
> locales — translating prose pages (the per-locale "prose track") is the next
> milestone. The translated content you'll see is the **API reference** (the
> module + `Widget` descriptions) and the **UI chrome**.
