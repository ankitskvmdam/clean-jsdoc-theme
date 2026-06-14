---
title: 概要
group: Packages/bhasha
order: 20
---

# `@clean-jsdoc-theme/bhasha`

`@clean-jsdoc-theme/bhasha` は clean-jsdoc-theme の **純粋で browser-safe な i18n core**
です。これは [aadesh](/packages/aadesh-overview) の対となる存在です: aadesh が
disk-bound でプロセスをオーケストレーションする作業を行うのに対し、bhasha は build と
**browser** の両方が依存する language-neutral な primitives を保持します — UI string
catalog、translator、render ごとに locale を scope する provider、そしてすべての
translatable string に stable な identity を与える key scheme です。

> [!NOTE]
> **なぜこの名前なのか？** *bhasha* (भाषा) はサンスクリット語/ヒンディー語で
> **language** を意味します — localization core（catalogs、translator、per-locale
> provider）を保持する package にふさわしい名前です。

> bhasha は [rang](/packages/rang-overview) によって import され、それが browser に
> bundle されるため、**`node:*` をゼロ** で ship します — 完全に isomorphic です。
> disk-bound な側（extract / build / translate）は [aadesh](/packages/aadesh-overview)
> にあります。

## 何を提供するか

- **The chrome catalog** — `EN_CHROME`、canonical な英語 UI strings（search
  placeholder、settings labels、language-switcher label、…）と、派生する `ChromeKey`
  type。これはどの UI strings が存在するかの single source of truth であり、aadesh の
  extract はこれから各 locale を seed します。
- **The translator** — `createI18n` / `translate` / fallback chain（active locale →
  default locale → key/source）とシンプルな named **interpolation**（`{count}`）を
  備えた `t(key, vars?)` function。これは static lookup です — locale は runtime で
  決して変わりません。各 locale がそれ自身の static site だからです。
- **`LanguageProvider` + `useTranslation`** — *static carrier*: server では render
  ごとに active catalog を scope し、browser では各 island root を seed します。setter
  も reactivity もありません。
- **The API key scheme** — `apiSlotKey(longname, field)` と `sourceHash`（FNV-1a）が、
  すべての translatable API string（`api.<longname>#<field>`）に stable key と content
  hash を与えるので、setu（slots を emit する側）と aadesh（staleness を track する側）
  が identity について一致します。
- **Validation primitives** — catalog-shape、markdown-in-slot lint、interpolation
  token parity、そして coverage。aadesh の `validate` が使います。

## 各部品はどう使うか

setu は translatable **API slots** を manifest に emit するために `apiSlotKey` +
`sourceHash` を call します。aadesh の `extract` は template を `EN_CHROME_FLAT` + その
slots から build し、`build` はある locale の filled catalog を同じ render を通じて
feed し戻します — chrome は `LanguageProvider` を経由し、API strings は setu の stamp
を経由します。rang の components は英語を hardcode する代わりに `useTranslation`/`t`
を call するので、同じ component がどの locale でも render されます。bhasha は
isomorphic なので、その `t` call は SSR の最中も island が hydrate した後も同一に
動作します。

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

## 次へ

- [aadesh 概要](/packages/aadesh-overview) — i18n workflow を駆動する CLI。
- [docs を localize する](/guides/localize-your-docs) — end-to-end の how-to。
