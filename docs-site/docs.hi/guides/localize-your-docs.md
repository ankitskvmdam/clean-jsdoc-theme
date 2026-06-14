---
title: अपने docs को localize करें
group: Guides
order: 5
---

# अपने docs को localize करें

clean-jsdoc-theme आपके documentation को **कई भाषाओं** में भेज सकता है। प्रत्येक
locale अपने स्वयं के static output में render होता है — default भाषा root पर, बाकी
`/<locale>` के अंतर्गत — और header में एक language switcher उनके बीच navigate करता
है। तीन प्रकार के content का अनुवाद होता है:

| Content | Source | कैसे |
| --- | --- | --- |
| **UI chrome** (search, settings, nav labels) | एक key→string catalog | locale JSON में अनुवादित |
| **API descriptions** (class/member/param/return prose) | आपके doclets | locale JSON में अनुवादित |
| **Prose** (home page, docs pages) | प्रति-locale files | `README.<locale>.md` + `docs.<locale>/` |

workflow [`clean-jsdoc`](/packages/aadesh-overview) CLI (the **aadesh** package)
से होकर चलता है, जिसके पीछे शुद्ध i18n core ([**bhasha**](/packages/bhasha-overview))
है।

> [!NOTE]
> CLI को theme के साथ-साथ install करें:
> `pnpm add -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh`

> [!INFO]
> Localized **builds** आज JSDoc-only हैं। TypeDoc bridge catalogs को *extract* कर
> सकता है पर अभी तक प्रति-locale sites render नहीं करता — पूर्ण बहु-भाषी output
> JSDoc path पर है।

## 1. अपने locales घोषित करें

Locales आपके मौजूदा `jsdoc.json` opts में रहते हैं (TypeDoc: `cleanJsdocTheme`
block) — कोई अलग config file नहीं:

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

`{ code, name }` की एक सूची (या सादे `"en"` strings) plus default। `name` switcher
label है, और codes BCP-47-ish हैं (`en`, `pt-BR`)। `defaultLocale` वैकल्पिक है —
यह सूची के पहले locale पर default करता है। एक single-locale (या बिना-`locales`)
build अप्रभावित रहता है — यह ठीक पहले की तरह render होता है।

## 2. catalogs को extract करें

```sh
clean-jsdoc extract
```

यह आपकी pipeline चलाता है, हर translatable string (chrome + API) इकट्ठा करता है,
और `clean-jsdoc-theme-artifacts/locales/` के अंतर्गत प्रति locale एक committable
catalog लिखता है:

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # the skeleton — values ARE the source text
  en.meta.json   # auto-managed bookkeeping (don't edit)
  ja.json        # values blank until you translate them
  ja.meta.json
  ...
```

जब भी आपके docs बदलें, `extract` दोबारा चलाएँ — यह **merge** करता है: नई keys जोड़ी
जाती हैं, बदला हुआ source एक key को stale चिह्नित करता है, हटाई गई keys
soft-deleted होती हैं (`--prune` तक रखी जाती हैं)। एक बिना-बदलाव वाला run एक शून्य
git diff उत्पन्न करता है।

## 3. अनुवाद करें

प्रत्येक locale की `<code>.json` को हाथ से edit करें, या एक LLM के लिए एक prompt
generate करें:

```sh
clean-jsdoc prompt
```

`prompt` प्रति locale एक तैयार-उपयोग prompt **file**
`clean-jsdoc-theme-artifacts/locales/prompts/` के अंतर्गत लिखता है — एक छोटे
catalog के लिए `<code>.md`, या context सीमाओं के लिए chunked `<code>.part-01.md`,
`<code>.part-02.md`, …। प्रत्येक file में केवल untranslated और stale entries होती
हैं, साथ में markdown, `{@link}`, code fences, और `{var}` interpolation tokens को
संरक्षित करने के निर्देश। CLI बताता है कि files कहाँ उतरीं:

```text
ja: 60 entries → 2 prompt files:
  clean-jsdoc-theme-artifacts/locales/prompts/ja.part-01.md
  clean-jsdoc-theme-artifacts/locales/prompts/ja.part-02.md
```

प्रत्येक file खोलें और उसकी सामग्री अपने LLM में paste करें — या `.md` को सीधे
upload करें — फिर लौटाए गए अनुवादों को मिलती-जुलती `<code>.json` catalog में वापस
copy करें। (prompts directory हर run पर दोबारा बनाई जाती है और git-ignored है,
इसलिए यह कभी आपके commits में कूड़ा नहीं भरती।)

आपको सब कुछ अनुवाद करना ज़रूरी नहीं — जो भी खाली छोड़ा जाता है वह default भाषा पर
fallback करता है, इसलिए एक आंशिक रूप से अनुवादित साइट ठीक है (और coverage report
में दिखता है)।

## 4. Validate करें (वैकल्पिक)

```sh
clean-jsdoc validate          # warns on gaps, errors on malformations
clean-jsdoc validate --strict # gaps become failures too (for CI)
```

## 5. Build करें

```sh
clean-jsdoc build
```

प्रति locale एक साइट: default locale `destination` पर, हर दूसरा locale
`destination/<locale>` के अंतर्गत। language switcher और `hreflang` alternates उन
locales के समुच्चय से स्वचालित रूप से wire होते हैं जिनमें प्रत्येक page वास्तव
में मौजूद होता है।

## Prose को localize करना

Catalogs chrome और API reference को कवर करते हैं। मुक्त-रूप (free-form) prose
**file** के अनुसार localize होता है — कोई extraction नहीं:

- **Home page** — अपने configured README के बगल में एक `README.<locale>.md` जोड़ें
  (`README.ja.md`, `README.hi.md`, …)। aadesh इसे उस locale के home के रूप में
  render करता है; एक अनुपस्थित variant default README पर fallback करता है।
- **Docs pages** — अपने `opts.docs` folder के बगल में एक sibling `docs.<locale>/`
  directory जोड़ें और जिन files को चाहें उनका अनुवाद करें। यह default docs को
  **प्रति file** overlay करता है: एक अनुवादित page जीतता है, एक अनुपस्थित page
  default पर fallback करता है। तो एक locale को केवल उन pages की ज़रूरत है जिनका
  उसने वास्तव में अनुवाद किया है।

```
README.md            docs/                 # default language
README.ja.md         docs.ja/              # Japanese overlay (translate what you want)
README.hi.md         docs.hi/              # Hindi overlay
```

> [!TIP]
> एक doc का `group` frontmatter मान सभी locales में समान रखें (`title` का अनुवाद
> करें, `group` का नहीं) — अन्यथा वही section दो sidebar groups में बँट सकता है।

## प्रति-भाषा fonts

एक Latin display font में render किया गया अनुवादित heading CJK या Devanagari के
लिए गलत दिख सकता है। `opts.fonts` में एक `<locale>:` prefix के साथ font को प्रति
locale override करें — बिना prefix वाला कुछ भी default है, और एक locale जो किसी
slot को छोड़ता है उस पर fallback करता है:

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

प्रत्येक locale का build तब Google Fonts से केवल अपने ही families का अनुरोध करता
है।

## Interactive mode

एक निर्देशित run पसंद करते हैं? CLI को बिना किसी argument के invoke करें:

```sh
clean-jsdoc
```

यह एक welcome banner और एक command picker खोलता है जो प्रत्येक command के options
के लिए संकेत देता है और समतुल्य command को आपके `package.json` scripts में save
करने की पेशकश करता है।

## एक पूर्ण उदाहरण

repo में [`examples/with-i18n-example`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/with-i18n-example)
देखें — एक तीन-locale (en / ja / hi) project जिसमें अनुवादित API descriptions,
chrome, एक प्रति-locale home page, एक localized **Guide** docs section (आंशिक
अनुवाद दिखाने के लिए एक जानबूझकर fallback के साथ), और प्रति-भाषा fonts हैं।

## आगे

- [aadesh Overview](/packages/aadesh-overview) — CLI गहराई से।
- [bhasha Overview](/packages/bhasha-overview) — i18n core।
- [Configuration](/theme/configuration) — हर theme option।
