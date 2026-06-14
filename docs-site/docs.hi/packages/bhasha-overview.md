---
title: सिंहावलोकन
group: Packages/bhasha
order: 20
---

# `@clean-jsdoc-theme/bhasha`

`@clean-jsdoc-theme/bhasha` clean-jsdoc-theme का **शुद्ध, browser-safe i18n core**
है। यह [aadesh](/packages/aadesh-overview) का समकक्ष है: जहाँ aadesh disk-bound,
process-orchestrating काम करता है, वहीं bhasha वे language-neutral primitives
रखता है जिन पर build और **browser** दोनों निर्भर करते हैं — UI string catalog,
translator, वह provider जो हर render पर एक locale scope करता है, और वह key scheme
जो हर translatable string को एक stable identity देती है।

> [!NOTE]
> **नाम क्यों?** *bhasha* (भाषा) संस्कृत/हिन्दी में **language** के लिए है — उस
> package के लिए उपयुक्त जो localization core रखता है: catalogs, translator, और
> per-locale provider।

> bhasha को [rang](/packages/rang-overview) import करता है, जो browser में bundle
> होता है, इसलिए यह **शून्य `node:*`** ship करता है — यह पूरी तरह isomorphic है।
> disk-bound आधा हिस्सा (extract / build / translate) [aadesh](/packages/aadesh-overview)
> में रहता है।

## यह क्या प्रदान करता है

- **The chrome catalog** — `EN_CHROME`, canonical English UI strings (search
  placeholder, settings labels, language-switcher label, …) और व्युत्पन्न
  `ChromeKey` type। यह इस बात का single source of truth है कि कौन सी UI strings
  मौजूद हैं; aadesh का extract हर locale को इसी से seed करता है।
- **The translator** — `createI18n` / `translate` / एक `t(key, vars?)` function जिसमें
  एक fallback chain (active locale → default locale → key/source) और सरल named
  **interpolation** (`{count}`) है। यह एक static lookup है — locale runtime पर
  कभी नहीं बदलता, क्योंकि हर locale अपनी ही static site है।
- **`LanguageProvider` + `useTranslation`** — एक *static carrier*: यह server पर हर
  render के लिए active catalog को scope करता है और browser में हर island root को
  seed करता है। कोई setter नहीं, कोई reactivity नहीं।
- **The API key scheme** — `apiSlotKey(longname, field)` और `sourceHash` (FNV-1a)
  हर translatable API string (`api.<longname>#<field>`) को एक stable key और एक
  content hash देते हैं, ताकि setu (जो slots emit करता है) और aadesh (जो staleness
  track करता है) identity पर सहमत रहें।
- **Validation primitives** — catalog-shape, markdown-in-slot lint, interpolation
  token parity, और coverage, जिन्हें aadesh का `validate` इस्तेमाल करता है।

## टुकड़े इसे कैसे इस्तेमाल करते हैं

setu translatable **API slots** को manifest में emit करने के लिए `apiSlotKey` +
`sourceHash` को call करता है। aadesh का `extract` template को `EN_CHROME_FLAT` +
उन slots से बनाता है, और `build` किसी locale के filled catalog को उसी render से
वापस feed करता है — chrome `LanguageProvider` के ज़रिए, API strings setu के stamp
के ज़रिए। rang के components अंग्रेज़ी hardcode करने के बजाय
`useTranslation`/`t` को call करते हैं, इसलिए वही component किसी भी locale में
render होता है। चूँकि bhasha isomorphic है, वह `t` call SSR के दौरान और island के
hydrate होने के बाद एक-समान काम करता है।

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

## आगे

- [aadesh सिंहावलोकन](/packages/aadesh-overview) — वह CLI जो i18n workflow चलाता है।
- [अपने docs को localize करें](/guides/localize-your-docs) — end-to-end how-to।
