---
title: Guides + API को मिलाएँ
group: Guides
order: 3
---

# Guides + API को मिलाएँ

यह theme की विशिष्ट क्षमता है: **हाथ से लिखे guides और एक generated API reference
एक ही साइट में** — एक sidebar, एक search index, एक URL space। deploy करने के लिए
कोई दूसरी साइट नहीं, आपके पाठकों के लिए कोई context-switch नहीं।

आप दोनों हिस्सों को पहले ही देख चुके हैं:

- [Build a guides site](/guides/build-a-guides-site) — एक
  [`docs`](/theme/configuration#docs) folder से prose pages।
- [Build an API reference](/guides/build-an-api-reference) — आपके source से
  generated pages।

दोनों को एक साथ चालू करें और वे merge हो जाते हैं। यह page इस बात का मानसिक मॉडल
है कि कैसे।

## एक config में पूरी तस्वीर

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",

    readme: "./README.md",   // → home page
    docs: "./docs",          // → prose guide pages
    // src above → generated API pages

    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  readme: "README.md",       // → home page
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",          // → prose guide pages
    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
</tabs>

वह एक build guide pages, API pages, home page, और (JSDoc के लिए, default रूप से)
source viewer उत्पन्न करता है — सब एक ही nav में सिल दिए गए।

## मानसिक मॉडल

सब कुछ **pages की एक flat list** और **`assembleNav` के एक call** में आ मिलता है
(इसमें
[`packages/setu/src/generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))।
sources अलग-अलग हैं, पर sidebar उन्हें एक समान तरीके से बरतता है:

1. **Home** — हमेशा पहले, हमेशा ungrouped। README home page, **जब तक** कि एक
   docs-root `index.md` मौजूद न हो, जो उसे override कर देता है।
2. **Sections**, प्रभावी क्रम में (नीचे)। प्रत्येक top-level group एक bold
   sidebar title है:
   - **API kind sections** — Classes, Modules, Namespaces, … untagged symbols के
     लिए; या आपके खुद के `@category` group names।
   - **Doc groups** — वे groups जो आपके guide pages घोषित करते हैं (frontmatter
     या directory)।
   - **Tutorials** — यदि आप JSDoc `--tutorials` directory का उपयोग करते हैं।
3. **Source Files** — हमेशा सबसे अंत में, हमेशा ungrouped (JSDoc, जब
   `outputSourceFiles` on हो)।

मूल अंतर्दृष्टि: **एक guide page का group और एक API symbol का `@category` एक ही
प्रकार की चीज़ हैं।** दोनों अंततः `frontmatter.group` बन जाते हैं, दोनों उसी
ordering मशीनरी को feed करते हैं। यदि वे एक group name साझा करें, तो एक guide और
एक class *एक ही* sidebar group में बैठ सकते हैं।

```text
  README / index.md ──▶ Home
  docs/ folder ───────▶ Doc groups          ┐
  source code ────────▶ API kind sections   │
                        / @category groups   ├─▶  assembleNav  ──▶  one sidebar
  tutorials/ ─────────▶ Tutorials            │
  source files ───────▶ Source Files         ┘
```

## दोनों को एक साथ कैसे क्रमित किया जाता है

यह वह हिस्सा है जिसे सही करना सार्थक है। प्रभावी top-level क्रम
[`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
में बनाया जाता है:

1. **[`sectionOrder`](/theme/configuration#sectionorder) पहले आता है**, उसी क्रम
   में जिसमें आप सूचीबद्ध करते हैं। यह एक एकीकृत list है — यह API kind labels
   (`Classes`), `@category` group names, **और** doc-group names नाम सकता है, जैसे
   चाहें अंतर्व्याप्त।
2. **kind labels** के लिए, `sectionOrder` एक filter *भी* है और एक क्रम *भी* — जिस
   kind label को आप छोड़ देते हैं, वह **sidebar से हटा दिया जाता है**।
3. **Category और doc groups को छोड़ने से कभी हटाया नहीं जाता**। जो भी
   `sectionOrder` में नहीं नामित हैं, उन्हें सूचीबद्ध sections के *बाद* जोड़ दिया
   जाता है — पहले [`docGroups`](/theme/configuration#docgroups) क्रम में doc
   groups, फिर बाकी वर्णानुक्रम में।
4. **Home** हमेशा पहले और **Source Files** हमेशा अंत में, `sectionOrder` से
   निरपेक्ष।

> [!IMPORTANT]
> चूँकि `sectionOrder` doc groups *और* kind labels को एक list में मिलाता है, यह
> सच्ची अंतर्व्याप्ति (interleaving) का उपकरण है — जैसे **Getting Started** (एक
> guide group), फिर **Classes** (API), फिर **Guides** (और prose), फिर
> **Modules**। यही ठीक वह है जो यह साइट करती है; इसका
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> देखें। `docGroups` का उपयोग केवल तब करें जब आप doc groups को क्रमित करना चाहें
> पर API sections को उनके defaults पर छोड़ देना चाहें।

### एक group के भीतर

- **API symbols** अपने `@order` / `@category … order=` से sort होते हैं फिर
  वर्णानुक्रम में — एक untagged kind section विशुद्ध वर्णानुक्रमिक रहता है।
- **Guide pages** अपने frontmatter `order` से sort होते हैं फिर title से।
- **Tutorials** अपना resolved tree क्रम बनाए रखते हैं।

गहरी कार्यप्रणाली — nested `/`-path groups, `clubSidebarItems`, leaf-vs-branch
ordering — [Structure your sidebar](/guides/structure-your-sidebar) में कवर है।

## Home page, एक बार में तय

जब आप sources को मिलाते हैं, तो एक से अधिक चीज़ें home page हो *सकती* हैं।
precedence (देखें
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
में `generateSite`):

1. एक docs-root **`index.md`** (slug `""`, `kind: 'index'`) — यदि मौजूद हो तो
   जीतता है।
2. अन्यथा **`readme`** HTML।

तो एक `docs/index.md` आपको एक बेस्पोक landing page लिखने देता है, फिर भी अपने
`README.md` को npm/GitHub readme के लिए उपयोग करते हुए।

## Collisions हल हो जाते हैं, कभी घातक नहीं

सभी pages एक URL space साझा करते हैं, इसलिए slugs अद्वितीय होने चाहिए। setu एक
निश्चित क्रम में slugs का दावा करता है — **पहले API pages**, फिर docs, फिर
tutorials, फिर source pages — और कोई भी बाद वाला page जिसका slug पहले से दावा
किया जा चुका है (या जो home को छाया कर दे), उसे एक चेतावनी के साथ **छोड़ दिया जाता
है**, कभी crash नहीं होता। तो यदि किसी guide का slug किसी generated class page से
टकरा जाए, तो API page जीतता है और guide छोड़ दिया जाता है (इसका नाम बदलें या एक
frontmatter `slug` सेट करें)।
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
में collision handling में सत्यापित।

## दोनों हिस्सों के बीच cross-linking

चूँकि यह एक ही साइट है, links बस काम करते हैं। एक guide से, किसी generated page से
उसके slug द्वारा link करें; एक doc comment से, `{@link}` / `@tutorial` का उपयोग
करें और setu उसे सही page से हल कर देता है (doc pages slug द्वारा keyed होते हैं,
tutorials name द्वारा — देखें
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
में resolvers)।

## आगे कहाँ जाएँ

- merged sidebar को बारीकी से ट्यून करें: [Structure your sidebar](/guides/structure-your-sidebar)।
- symbols पर group/order tags: [Custom tags](/authoring/custom-tags)।
- हर option विस्तार से: [Configuration](/theme/configuration)।
