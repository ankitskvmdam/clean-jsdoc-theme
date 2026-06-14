---
title: एक guides साइट बनाएँ
group: Guides
order: 2
---

# एक guides साइट बनाएँ

यह **prose-first** workflow है: आप theme को हाथ से लिखे गए Markdown (या HTML) के
एक folder की ओर इंगित करते हैं, और वह एक पूर्ण documentation साइट बन जाता है —
sidebar, search, theme toggle, सब कुछ। किसी API reference की ज़रूरत नहीं। आप जिस
साइट को पढ़ रहे हैं, वह बिल्कुल इसी तरह बनी है।

> [!TIP]
> यही साइट इसका जीता-जागता उदाहरण है। इसका config
> [`docs-site/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> है और इसके pages
> [`docs-site/docs/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site/docs)
> में रहते हैं।
> नीचे दिया गया सब कुछ
> [`packages/setu/src/guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
> के bridge के विरुद्ध सत्यापित है।

## मानसिक मॉडल

[`opts.docs`](/theme/configuration#docs) को एक directory की ओर इंगित करें। theme
उसे पुनरावर्ती (recursively) रूप से चलता है, और **हर `.md` / `.markdown` /
`.html` file एक page बन जाती है**। folder में file का स्थान दो चीज़ें अपने आप तय
करता है:

- इसका **URL slug** — सापेक्ष (relative) path, slugified;
- इसका **sidebar group** — वह directory जिसमें यह बैठता है, मानवीय रूप
  (humanized) में।

प्रति-file YAML **frontmatter** इनमें से किसी को भी override कर देता है (और कुछ
और भी)। एक root `index.md` home page बन जाता है। यही पूरी प्रणाली है।

directory walk bridge में होता है
([`collectDocs`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)),
जो files को पढ़ता है और उन्हें setu को सौंप देता है; setu स्वयं कोई disk I/O नहीं
करता। केवल `.md`, `.markdown`, `.html`, और `.htm` files उठाई जाती हैं —
`node_modules`, `.git`, और dotfiles/dot-dirs छोड़ दिए जाते हैं।

## इसे सेट करें

<steps>

<step label="Create a docs folder">

किसी directory में कुछ Markdown डालें। layout आप पर निर्भर है:

```sh
docs/
  index.md            # → home page (slug "")
  getting-started.md  # → /getting-started, ungrouped
  guides/
    advanced.md       # → /guides/advanced, group "Guides"
```

</step>

<step label="Point the config at it">

अपने config में [`docs`](/theme/configuration#docs) जोड़ें। Tutorials और API
वैकल्पिक हैं — अकेला docs folder एक पूर्ण साइट है।

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    template: "node_modules/clean-jsdoc-theme/dist",
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
</tabs>

</step>

<step label="Build">

हमेशा की तरह build करें — पूरे toolchain setup के लिए
[JSDoc Getting Started](/theme/jsdoc-getting-started) या
[TypeDoc Getting Started](/theme/typedoc-getting-started) देखें।

```sh
npx jsdoc -c jsdoc.json
```

</step>

</steps>

## एक file किस तरह page बनती है

हर file के लिए, setu page metadata
[`deriveDocMeta`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
में निकालता है। नियम, ठीक वैसे ही जैसे code उन्हें हल करता है:

| Field   | निर्धारण (पहला मिलान जीतता है)                                              |
| ------- | -------------------------------------------------------------------------- |
| `slug`  | frontmatter `slug` → slugified relative path (कोई prefix नहीं); `index` → `""`   |
| `title` | frontmatter `title` → path का humanized basename                       |
| `group` | frontmatter `group` → humanized **directory** path → `defaultDocGroup`     |
| `order` | frontmatter `order`                                                        |
| `hidden`| frontmatter `hidden` (default `false`)                                     |

### Slugs path से आते हैं

slug सापेक्ष path होता है जिसका extension हटा दिया गया हो, और प्रत्येक segment पर
`slugifyPath` के ज़रिए चलाया गया हो: lowercased, non-alphanumerics की लड़ियाँ `-`
में समेटी गईं, `/` से जोड़ी गईं। तो `guides/Advanced Setup.md` →
`/guides/advanced-setup`। slug में **कोई prefix नहीं** होता — docs साफ़,
top-level URLs पर रहते हैं (tutorials के विपरीत, जिन्हें `tutorials/` के अंदर
बाध्य किया जाता है)।

### Groups directory से आते हैं

किसी file का sidebar group default रूप से उसके **directory path** होता है, प्रत्येक
segment पर humanized: `guides/advanced.md` group **Guides** में आता है;
`guides/setup/install.md` nested group **Guides/Setup** में आता है (group path में
एक `/` उसे nest कर देता है — देखें
[Structure your sidebar](/guides/structure-your-sidebar))।
docs root पर बिना frontmatter group वाली file
[`defaultDocGroup`](/theme/configuration#defaultdocgroup) पर fallback करती है; यदि
वह भी unset है, तो page ungrouped रहता है (यह catch-all "Docs" section में आता
है)।

### `index.md` → home page

जिस file का path ठीक `index` है (docs-root `index.md`), वह home page बन जाती है:
slug `""`, `index.html` पर render किया गया। जब दोनों मौजूद हों, तब यह
[`readme`](/theme/configuration#readme) home page को **override** कर देता है।

## Frontmatter overrides

Frontmatter एक प्रारंभिक `---` block है। parser जानबूझकर छोटा है — सरल
`key: value` scalars (string / number / boolean), जो pipeline को चाहिए केवल इतना
ही है। मान्य keys:

```markdown
---
title: Advanced Setup
group: Guides
order: 2
slug: guides/advanced
hidden: false
---

# Advanced Setup
...
```

- **`title`** — sidebar label और page `<title>`।
- **`group`** — sidebar group (directory को override करता है)। nest करने के लिए
  यह एक `/`-path हो सकता है।
- **`order`** — group-के-भीतर sort key (आरोही; unset सबसे अंत में, फिर
  वर्णानुक्रम में sort होता है)। देखें
  [Structure your sidebar](/guides/structure-your-sidebar)।
- **`slug`** — एक custom URL, जो path-व्युत्पन्न वाले को बदल देता है।
- **`hidden`** — जब `true` हो, तो page **render तो होता है पर sidebar से बाहर रखा
  जाता है** (सीधे link / cross-reference द्वारा फिर भी पहुँच योग्य)।

> [!NOTE]
> frontmatter parser जानबूझकर न्यूनतम है: nested YAML, lists, और multi-line मान
> **समर्थित नहीं** हैं — केवल flat `key: value` scalars। एक विकृत या असमाप्त
> block को कोई frontmatter न मानकर body में ही छोड़ दिया जाता है। देखें
> [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
> में `parseFrontmatter`।

## Groups को क्रमित करना

दो लीवर, अलग-अलग scopes पर काम करते हुए:

- [`docGroups`](/theme/configuration#docgroups) sidebar में **top-level group
  sections** को क्रमित करता है (जैसे `["Getting Started", "Guides"]`)। जिन groups
  को आप सूचीबद्ध नहीं करते, वे बाद में, वर्णानुक्रम में जोड़ दिए जाते हैं।
- किसी page का frontmatter **`order`** उसे उसके group के **भीतर** स्थान देता है।

यह साइट दोनों सेट करती है — इसका
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
देखें: `docGroups` (और `sectionOrder`) group क्रम तय करते हैं, जबकि हर page का
`order` frontmatter अंदर के pages को क्रमबद्ध करता है।

> [!IMPORTANT]
> `docGroups` केवल **doc** groups को क्रमित करता है, और इन्हें API kind sections
> के **बाद** जोड़ता है। यदि आप guides को किसी API reference के साथ मिला रहे हैं और
> पूरी sidebar पर पूर्ण नियंत्रण चाहते हैं — guides को Classes, Modules आदि के
> साथ अंतर्व्याप्त (interleaved) — तो इसके बजाय
> [`sectionOrder`](/theme/configuration#sectionorder) का सहारा लें। देखें
> [Combine guides + API](/guides/combine-guides-and-api)।

## आगे कहाँ जाएँ

- एक generated reference जोड़ें: [Build an API reference](/guides/build-an-api-reference)।
- दोनों को एक साइट में भेजें: [Combine guides + API](/guides/combine-guides-and-api)।
- हर sidebar लीवर में महारत हासिल करें: [Structure your sidebar](/guides/structure-your-sidebar)।
- हर option विस्तार से: [Configuration](/theme/configuration)।
