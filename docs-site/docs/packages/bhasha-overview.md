---
title: Overview
group: Packages/bhasha
order: 20
---

# `@clean-jsdoc-theme/bhasha`

`@clean-jsdoc-theme/bhasha` is the **pure, browser-safe i18n core** of
clean-jsdoc-theme. It's the counterpart to [aadesh](/packages/aadesh-overview):
where aadesh does the disk-bound, process-orchestrating work, bhasha holds the
language-neutral primitives that both the build and the **browser** rely on — the
UI string catalog, the translator, the provider that scopes a locale per render,
and the key scheme that gives every translatable string a stable identity.

> bhasha is imported by [rang](/packages/rang-overview), which bundles into the
> browser, so it ships **zero `node:*`** — it's fully isomorphic. The disk-bound
> half (extract / build / translate) lives in [aadesh](/packages/aadesh-overview).

## What it provides

- **The chrome catalog** — `EN_CHROME`, the canonical English UI strings (search
  placeholder, settings labels, the language-switcher label, …) and the derived
  `ChromeKey` type. This is the single source of truth for which UI strings exist;
  aadesh's extract seeds every locale from it.
- **The translator** — `createI18n` / `translate` / a `t(key, vars?)` function with
  a fallback chain (active locale → default locale → the key/source) and simple
  named **interpolation** (`{count}`). It's a static lookup — locale never changes
  at runtime, because each locale is its own static site.
- **`LanguageProvider` + `useTranslation`** — a *static carrier*: it scopes the
  active catalog per render on the server and seeds each island root in the
  browser. No setter, no reactivity.
- **The API key scheme** — `apiSlotKey(longname, field)` and `sourceHash` (FNV-1a)
  give every translatable API string (`api.<longname>#<field>`) a stable key and a
  content hash, so setu (which emits the slots) and aadesh (which tracks staleness)
  agree on identity.
- **Validation primitives** — catalog-shape, markdown-in-slot lint, interpolation
  token parity, and coverage, used by aadesh's `validate`.

## How the pieces use it

setu calls `apiSlotKey` + `sourceHash` to emit the translatable **API slots** into
the manifest. aadesh's `extract` builds the template from `EN_CHROME_FLAT` + those
slots, and `build` feeds a locale's filled catalog back through the same render —
chrome via `LanguageProvider`, API strings via setu's stamp. rang's components call
`useTranslation`/`t` instead of hardcoding English, so the same component renders
in any locale. Because bhasha is isomorphic, that `t` call works identically during
SSR and after the island hydrates.

## Read the source

- **Package directory:**
  [packages/bhasha](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha)
  ·
  [packages/bhasha/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha/src)
- **Public surface:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/index.ts)
- **Chrome catalog:**
  [`catalog.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/catalog.ts)
- **Translator + provider:**
  [`translate.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/translate.ts)
  ·
  [`provider.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/provider.tsx)
  ·
  [`interpolate.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/interpolate.ts)
- **Keys + hashing:**
  [`keys.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/keys.ts)
- **Validation:**
  [`validate.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/validate.ts)

## Next

- [aadesh Overview](/packages/aadesh-overview) — the CLI that drives the i18n
  workflow.
- [Localize your docs](/guides/localize-your-docs) — the end-to-end how-to.
