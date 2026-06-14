---
title: सिंहावलोकन
group: Packages/aadesh
order: 20
---

# `@clean-jsdoc-theme/aadesh`

`@clean-jsdoc-theme/aadesh` clean-jsdoc-theme का **localization CLI** है। यह i18n
का वह disk-bound, process-orchestrating आधा हिस्सा करता है जो
[bhasha](/packages/bhasha-overview) (शुद्ध, browser-safe core) जानबूझकर नहीं कर
सकता: आपकी JSDoc/TypeDoc pipeline को spawn करना, committable locale catalogs को
पढ़ना और लिखना, और हर locale के लिए एक static site render करना।

> [!NOTE]
> **नाम क्यों?** *aadesh* (आदेश) संस्कृत/हिन्दी में **command / instruction** के
> लिए है — project के command-line interface के लिए बिल्कुल उपयुक्त।

प्रकाशित binary है **`clean-jsdoc`**। अधिकांश projects इसे चार subcommands के
ज़रिए इस्तेमाल करते हैं (और जब आप इसे बिना किसी argument के चलाते हैं तो एक
interactive menu भी मिलता है):

```sh
clean-jsdoc extract    # sync the per-locale catalogs from your docs
clean-jsdoc prompt     # (optional) emit an LLM translation prompt
clean-jsdoc validate   # preflight the catalogs
clean-jsdoc build      # render one site per locale
```

> अगर आप सिर्फ़ एक single-language site ship करना चाहते हैं तो आपको aadesh की कभी
> ज़रूरत नहीं — JSDoc/TypeDoc entry points उसे सीधे build करते हैं। aadesh वह layer
> है जिसे आप तब जोड़ते हैं जब आपको **कई भाषाएँ** चाहिए। पूरा walkthrough
> [अपने docs को localize करें](/guides/localize-your-docs) में है।

## यह कहाँ बैठता है

Locale एक **build dimension** है, runtime toggle नहीं: हर भाषा अपने ही static
output में render होती है (default locale बिना prefix के, बाक़ी `/<locale>` के
नीचे), और language switcher उनके बीच navigation भर है। वह fan-out aadesh के
अधीन है। यह आपकी locale config को **उन्हीं `jsdoc.json` opts** से पढ़ता है जिन्हें
आप पहले से इस्तेमाल करते हैं (`opts.locales` + `opts.defaultLocale`) — कोई अलग
config file नहीं है — और असली theme pipeline को दो बार चलाता है: एक बार *extract
mode* में translatable strings खींचने के लिए, और हर locale के लिए एक बार *build
mode* में translations को वापस stamp करने के लिए।

## The commands

- **`extract`** — pipeline को extract mode में चलाता है, हर translatable string
  collect करता है (UI chrome + API descriptions/summaries/example captions +
  parameter और return descriptions), और उन्हें per locale एक committable JSON में
  sync करता है। दोबारा चलाना एक merge है: नई keys जुड़ती हैं, source में बदलाव एक
  key को *stale* चिह्नित करता है, और हटाई गई keys soft-delete होती हैं (`--prune`
  तक रखी जाती हैं) ताकि कोई rename किसी translator के काम को कभी न गिराए। बिना
  बदलाव वाला run शून्य git diff होता है।
- **`prompt`** — per locale एक ready-to-use LLM translation prompt **file** लिखता
  है (`clean-jsdoc-theme-artifacts/locales/prompts/` के नीचे, context limits के
  लिए chunked) जो केवल नई और stale keys को cover करती है, सटीक return-JSON shape
  और markdown / `{@link}` / code fences / `{var}` tokens को सुरक्षित रखने के
  निर्देशों के साथ। आप हर file को किसी LLM में paste करते हैं (या `.md` upload
  करते हैं); यह directory git-ignored है और हर run पर regenerate होती है।
- **`validate`** — catalogs को preflight करता है: एक coverage gap warn करता है
  ("using the default"), जबकि एक malformation (broken markdown-in-slot, गिरा हुआ
  `{var}` token, अज्ञात keys) error देता है। default रूप से resilient; `--strict`
  CI के लिए warnings को failures में escalate करता है।
- **`build`** — template + filled catalogs → setu stamp → dwar render → per locale
  एक site। language switcher और `hreflang` alternates को feed करने वाले
  cross-locale index का स्वामी।

हर prompt का एक flag equivalent है (`--config`, `--dir`, `--prune`, `--strict`,
`--locale`, `--chunk-size`, `--typedoc`), इसलिए CLI CI में headless चलता है और
कभी block नहीं करता।

## The artifacts

Catalogs `clean-jsdoc-theme-artifacts/locales/` के नीचे रहते हैं, आपके repo में
**committed** और हाथ से edit किए जाते हैं (या आपके translation workflow द्वारा)।
हर locale दो files होती है:

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # editable: _version + chrome.* / api.* translations
  en.meta.json   # auto-managed: source hashes + soft-deleted keys (don't touch)
  ja.json
  ja.meta.json
```

Editable file में केवल वही होता है जिसे एक translator बदलता है; staleness hashes
और soft-deletes सहयोगी `.meta.json` में रहते हैं ताकि machine का bookkeeping उस
file को कभी न उलझाए जिसकी आप समीक्षा करते हैं।

## Prose localization

Keyed catalogs से परे, free-form prose को **file द्वारा** localize किया जाता है,
किसी extraction की ज़रूरत नहीं:

- **Home page** — आपके configured README के बगल में एक सहयोगी `README.<locale>.md`
  उस locale के home के रूप में render होती है (अनुपस्थित होने पर default README पर
  fall back करती है)।
- **Docs** — एक सहयोगी `docs.<locale>/` directory आपके `opts.docs` को per file
  overlay करती है: एक translated page जीतता है, एक missing page default doc पर
  fall back करता है।

## Interactive mode

`clean-jsdoc` को बिना किसी subcommand के चलाएँ ताकि एक guided menu मिले: एक welcome
banner, एक command picker जो हर command का description दिखाता है, उसके options के
लिए prompts (defaults पहले से भरे हुए), और equivalent command को आपके
`package.json` scripts में save करने का एक offer ताकि आप उसे `npm run <key>` से
दोबारा चला सकें।

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

## आगे

- [अपने docs को localize करें](/guides/localize-your-docs) — end-to-end workflow।
- [bhasha सिंहावलोकन](/packages/bhasha-overview) — शुद्ध i18n core जिस पर aadesh बना है।
