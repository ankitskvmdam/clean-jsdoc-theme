---
title: Getting Started
group: Guide
order: 1
---

# Getting Started

These prose pages live in `opts.docs` (the `docs/` directory) and are localized
per locale through sibling `docs.<locale>/` overlays — a translated page wins, an
untranslated one falls back to this default.

## Install

```sh
pnpm add -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh
```

## Declare your locales

Add `opts.locales` and `opts.defaultLocale` to your `jsdoc.json`, then run the
build:

```sh
clean-jsdoc extract   # sync the catalogs
clean-jsdoc build     # render one site per locale
```

The default locale renders at the root; every other locale under `/<locale>`.
