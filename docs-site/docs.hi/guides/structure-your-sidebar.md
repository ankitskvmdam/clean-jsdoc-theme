---
title: अपनी sidebar को संरचित करें
group: Guides
order: 4
---

# अपनी sidebar को संरचित करें

sidebar कई लीवरों से इकट्ठी होती है जो सब एक ही ordering engine को feed करते हैं
([`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))।
यह page उन्हें एक साथ बाँधता है: groups कहाँ से आते हैं, nesting कैसे काम करती
है, और वे ठीक नियम जो क्रम तय करते हैं। एक बार आप देख लें कि **हर entry एक `group`
path और एक वैकल्पिक `order` रखती है**, बाकी अपने आप समझ आ जाता है।

> [!IMPORTANT]
> **यह एकीकृत मॉडल JSDoc template का व्यवहार है।** TypeDoc output अपनी
> **API sidebar** अलग ढंग से बनाता है — एक module/folder पदानुक्रम, kind/category
> groups नहीं — इसलिए `@category`, `@order`, `sectionOrder`, और
> `clubSidebarItems` का **TypeDoc API tree पर कोई प्रभाव नहीं** पड़ता। अगर यही
> configure कर रहे हैं तो सीधे [TypeDoc flavor](#typedoc-flavor) पर जाएँ। Doc
> groups (`docGroups` + frontmatter), `menu`, और tutorials दोनों के लिए वैसे ही
> काम करते हैं।

> [!NOTE]
> नीचे दिए गए दो source tags — `@category` और `@order` —
> [Custom tags](/components/overview) पर गहराई से प्रलेखित हैं। यह page इस पर
> है कि वे (और config options) sidebar को कैसे feed करते हैं; यह tag syntax को
> पूरी तरह दोबारा प्रलेखित नहीं करता। जब तक अन्यथा न बताया जाए, [TypeDoc
> flavor](#typedoc-flavor) तक हर चीज़ **JSDoc template** का वर्णन करती है।

## एकीकृत मॉडल

हर navigable entry — API symbol, guide page, या tutorial — रखती है:

- एक **`group` path** (bold top-level title, वैकल्पिक रूप से एक `/`-nested
  branch), और
- एक वैकल्पिक **`order`** (group-के-भीतर sort key)।

ये कहाँ से आते हैं:

| Source        | `group` किससे                                       | `order` किससे                      |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| API symbol    | `@category`, अन्यथा इसका kind label (Classes, …)     | `@category … order=`, अन्यथा `@order`|
| Guide page    | frontmatter `group`, अन्यथा directory, अन्यथा default| frontmatter `order`                |
| Tutorial      | tutorial पदानुक्रम (`Tutorials/<parent>/…`)         | resolved tree क्रम                 |

वही एकल अमूर्तन (abstraction) यही कारण है कि एक guide और एक class एक sidebar group
साझा कर सकते हैं: यदि दोनों group `Core` से हल होते हैं, तो वे एक साथ बँट जाते
हैं।

## लीवर 1 — `@category` के साथ एक symbol को group करें

> [!NOTE]
> **केवल JSDoc, sidebar के लिए।** `@category` अब भी TypeDoc bridge द्वारा parse
> किया जाता है (जैसा [TypeDoc flavor](#typedoc-flavor) में बताया गया है), पर यह
> TypeDoc API sidebar में किसी symbol के page को नहीं हिलाता — वह sidebar एक
> module पदानुक्रम है, category groups नहीं।

किसी source symbol को tag करें ताकि उसका page उसके kind section के बजाय एक
स्पष्ट group में रखा जाए:

```ts
/**
 * @category Core
 */
export class Parser {}
```

`@category` **nest** करने के लिए एक `/`-path स्वीकार करता है, साथ ही एक inline
`order=` option:

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

यह `Lexer` को **Core ▸ Parsing** के अंतर्गत रखता है, अपने subgroup में सबसे पहले
sorted। दो parsing सूक्ष्मताएँ, `parseCategory` में सत्यापित
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)):

- **group path** whitespace-पृथक tokens की अग्रणी लड़ी है; parsing पहले ऐसे token
  पर options में बदल जाती है जिसमें `=` होता है। तो
  `@category Getting Started order=1` शाब्दिक नाम **"Getting Started"** के अंतर्गत
  group करता है (space नाम का हिस्सा बना रहता है) `order` 1 के साथ।
- **`/` ही nest करता है** एक group को, spaces नहीं। `Core/Parsing` nest करता है;
  `Getting Started` एक एकल flat group है जिसके label में एक space है।

## लीवर 2 — `@order` के साथ किसी भी symbol को क्रमित करें

> [!NOTE]
> **केवल JSDoc, sidebar के लिए।** `@order` का TypeDoc की API sidebar ordering
> पर कोई प्रभाव नहीं पड़ता — within-module ordering वहाँ kind से तय होती है
> ([TypeDoc flavor](#typedoc-flavor) देखें)।

inline `order=` option केवल उस symbol पर काम करता है जिसके पास `@category` *हो*।
ऐसे symbol को स्थान देने के लिए जो अपने **kind section** में रहता है (एक सादा
`@class`, `@module`, …), standalone `@order` tag का उपयोग करें:

```ts
/**
 * @module config
 * @order 1
 */
```

जब दोनों मौजूद हों, `@category … order=` `@order` को हरा देता है (अधिक विशिष्ट,
सह-स्थित घोषणा)। देखें
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
में `readOrder`।

> [!NOTE]
> `@category` और `@order` दोनों **unknown tags** हैं — आपके config को
> `tags.allowUnknownTags: true` सेट करना चाहिए (इस repo का हर example config करता
> है)। पूर्ण syntax [Custom tags](/components/overview) पर।

## लीवर 3 — nested groups (`/`-paths)

कोई भी group path — एक `@category` tag से, एक guide के frontmatter `group` से, या
एक guide की directory से — nest करने के लिए `/` का उपयोग कर सकता है। पहला segment
bold top-level title है; गहरे segments **collapsible branch nodes** बन जाते हैं।
nesting `buildGroupTree` द्वारा बनाई जाती है
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))।

तो `@category Core/Parsing`, `docs/core/parsing/` में एक guide, और frontmatter
`group: Core/Parsing` सब एक page को **Core ▸ Parsing** के अंतर्गत nest करते हैं।

### Leaf-vs-branch ordering (ठीक नियम)

एक group स्तर के भीतर, `buildGroupTree` siblings को sort करता है — जो **leaves**
(वास्तविक page links) और **branches** (subgroups) हो सकते हैं — इस तरह:

1. **प्रभावी क्रम (effective order)** आरोही द्वारा। एक leaf का प्रभावी क्रम उसका
   खुद का `order` होता है; एक **branch** का उसके भीतर किसी भी page का **न्यूनतम
   `order`** होता है। तो एक एकल nested page पर `order=1` उसके पूरे subgroup को
   ऊपर तैरा देता है।
2. बराबरी पर, **branches से पहले leaves**।
3. फिर first-seen / bucket क्रम (तो एक बिना-क्रम का group अपरिवर्तित रहता है)।

बिना `order` वाले pages सबसे अंत में sort होते हैं (प्रभावी रूप से `+∞`), फिर
वर्णानुक्रम में। यह वही नियम है जो एक guide group अपने frontmatter `order` के लिए
उपयोग करता है।

## लीवर 4 — `clubSidebarItems`

> [!NOTE]
> **केवल JSDoc, API tree के लिए।** `clubSidebarItems` का TypeDoc API sidebar पर
> कोई प्रभाव नहीं पड़ता ([TypeDoc flavor](#typedoc-flavor) देखें)।

[`clubSidebarItems`](/theme/configuration#clubsidebaritems) संबंधित entries को एक
साझा parent के अंतर्गत समेट देता है, उनके label में **पहले `/` से पहले वाले path
segment** के अनुसार — जैसे `queue`, `queue/Queue`, `queue/types` एक `queue`
parent के अंतर्गत club होते हैं। केवल एक entry द्वारा साझा किया गया prefix flat
छोड़ दिया जाता है। यह `clubNavTree` द्वारा किया जाता है
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))।

> [!IMPORTANT]
> Clubbing **केवल** उन buckets पर लागू होती है जिनकी entries में **कोई स्पष्ट
> `@category` / frontmatter group नहीं** होता — यानी kind-label fallback
> sections। एक group जो `@category` paths से बना हो, *पहले ही*
> `buildGroupTree` द्वारा nest किया जा चुका होता है और उसे अतिरिक्त रूप से club
> **नहीं** किया जाता। `assembleNav` में `groupEntries.every(e => !e.explicit)`
> guard द्वारा सत्यापित। संक्षेप में: `@category` nesting और label-clubbing प्रति
> group परस्पर अपवर्जी (mutually exclusive) हैं।

Clubbing क्रम-सचेत भी है: एक clubbed parent अपने members के min `order` से sort
होता है, और bare-prefix entry (जैसे `queue` module स्वयं) एक `index` child बन
जाती है जो सबसे पहले sorted होती है, जब तक कि कोई स्पष्ट `@order` किसी sibling को
आगे न खींच ले।

## लीवर 5 — `sectionOrder`

> [!NOTE]
> **केवल JSDoc।** `sectionOrder` का TypeDoc पर बिल्कुल कोई प्रभाव नहीं पड़ता —
> TypeDoc API tree module पदानुक्रम है, और वहाँ doc groups
> [`docGroups`](/theme/configuration#docgroups) से क्रमित होते हैं, `sectionOrder`
> से नहीं। [TypeDoc flavor](#typedoc-flavor) देखें।

[`sectionOrder`](/theme/configuration#sectionorder) **top-level** groups को
क्रमित करता है — एक एकीकृत list जो kind labels, `@category` names, और doc-group
names को मिलाती है।

- सूचीबद्ध labels पहले render होते हैं, आपके क्रम में।
- **kind labels** के लिए यह एक filter भी है: जिस kind label को आप छोड़ते हैं, वह
  **हटा दिया जाता है**।
- **Category / doc groups को छोड़ने से कभी नहीं हटाया जाता** — उन्हें सूचीबद्ध
  sections के बाद जोड़ दिया जाता है ([`docGroups`](/theme/configuration#docgroups)
  क्रम में doc groups, फिर बाकी वर्णानुक्रम में)।

prose और API sections को यह कैसे अंतर्व्याप्त करता है, इसके लिए देखें
[Combine guides + API](/guides/combine-guides-and-api)।

## लीवर 6 — `docGroups` / `defaultDocGroup`

- [`docGroups`](/theme/configuration#docgroups) **doc-group** sections को क्रमित
  करता है, जो API sections के **बाद** जोड़े जाते हैं (जब तक कि कोई doc group
  `sectionOrder` में भी न नामित हो, जो फिर उसकी स्थिति के लिए अधिकार ले लेता है)।
- [`defaultDocGroup`](/theme/configuration#defaultdocgroup) वह group है जिसमें एक
  guide उतरता है जब वह कोई घोषित नहीं करता — न frontmatter `group` और न उससे एक
  निकालने को कोई directory।

[Build a guides site](/guides/build-a-guides-site) में सिरे-से-सिरे तक कवर।

## लीवर 7 — `menu`

[`menu`](/theme/configuration#menu) auto Home / Source Files links को sections के
ऊपर एक **top region** से बदल देता है, प्रत्येक entry एक icon के साथ
(`lucide:<name>` या `simpleicons:<name>`)। जब `menu` सेट हो, यह home/source links
का **स्वामी** होता है — स्वचालित Home (पहले) और Source Files (अंत में) entries
दबा दी जाती हैं और केवल तभी प्रकट होती हैं जब आप उन्हें सूचीबद्ध करें (`{ id:
"home" }` / `{ id: "source" }`); external links inline प्रकट होते हैं। menu के
नीचे के sections **फिर भी** `sectionOrder` का अनुसरण करते हैं। देखें
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
में `resolveMenuItem`; इस साइट का
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
एक `menu` का उपयोग करता है। यह TypeDoc पर भी वैसे ही लागू होता है।

## TypeDoc flavor

TypeDoc output अपनी **API sidebar** के लिए ऊपर वाले एकीकृत group/order मॉडल
का उपयोग **नहीं** करता। यह इसके बजाय TypeDoc की अपनी default theme को mirror
करता है — आपके source layout से बना एक module/folder पदानुक्रम, `@category`
या kind buckets से नहीं:

- **Top level = पहले आपके documents, फिर folders और modules**, alphabetically
  — कोई top-level kind sections नहीं होते।
- **Folders** आपके source की directory structure को mirror करते हैं। एक अकेले
  child वाला folder उस child में **merge** हो जाता है (`compactFolders`) —
  जैसे `base/` के नीचे एक अकेला `Component` `base/Component` के रूप में दिखता
  है।
- **हर module एक clickable, expandable node है** — उसका label module के page को
  खोलता है, उसका chevron सदस्यों को दिखाने के लिए expand होता है।
- **Members अपने module के नीचे nest होते हैं**, **kind** से क्रमित होकर
  (Enumerations → Classes → Interfaces → Type Aliases → Variables →
  Functions), फिर alphabetically। sidebar में कोई per-kind sub-headings नहीं
  होते।
- **Namespaces** उसी तरह nodes के रूप में nest होते हैं।

पूरे rendering विवरण (Hierarchy/Implements sections, `@inheritDoc`, आदि)
[TypeDoc Getting Started](/theme/typedoc-getting-started#the-typedoc-sidebar)
पर हैं।

### कौन से लीवर TypeDoc पर अब भी लागू होते हैं

| Lever | TypeDoc **API** tree पर प्रभाव | बाकी जगह प्रभाव |
| ----- | ----------------------------------- | ----------------- |
| `@category` | कोई नहीं — module पदानुक्रम में किसी symbol को नहीं हिलाता | अब भी parse होता है |
| `@group` | कोई नहीं — sidebar को नहीं चलाता | अब भी parse होता है (देखें [TypeDoc Getting Started](/theme/typedoc-getting-started#typedoc-specific-rendering)) |
| `@order` | कोई नहीं — module के भीतर kind order तय है | — |
| `sectionOrder` | कोई नहीं | कोई नहीं — इसके बजाय **doc groups** को `docGroups` से क्रमित करें |
| `clubSidebarItems` | कोई नहीं | — |
| `docGroups` / doc frontmatter `group`/`order` | — | **काम करता है** — prose doc groups को क्रमित करता है, API पदानुक्रम से पहले render होता है |
| `menu` | — | **काम करता है** — JSDoc जैसा ही top-region व्यवहार |
| Tutorials | — | **अब भी render होते हैं** |

> [!NOTE]
> एक `@category`/`@group`-driven TypeDoc API sidebar बहाल करना (TypeDoc की अपनी
> opt-in category/group navigation जैसा) **फ़िलहाल configurable नहीं है**।

## इसे एक साथ रखना

एक यथार्थवादी मिश्रित config। ध्यान दें कि नीचे `sectionOrder` और
`clubSidebarItems` केवल **JSDoc** tab की API sidebar को प्रभावित करते हैं — TypeDoc
tab पर उनका **कोई प्रभाव नहीं** होता (doc-group क्रम `docGroups` से आता है, और
API tree हमेशा [TypeDoc flavor](#typedoc-flavor) में बताए गए module पदानुक्रम के
रूप में ही render होता है)।

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
opts: {
  // Top-level order: a guide group, then API kinds, then more prose.
  sectionOrder: ["Getting Started", "Core", "Classes", "Guides", "Modules"],
  docGroups: ["Getting Started", "Guides"],
  defaultDocGroup: "Docs",
  clubSidebarItems: true,
  menu: [
    { id: "home", title: "Home", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  // sectionOrder का TypeDoc पर कोई प्रभाव नहीं — API tree module पदानुक्रम है
  // (ऊपर "TypeDoc flavor" देखें), इसलिए यह key यहाँ नज़रअंदाज़ हो जाती है।
  sectionOrder: ["Getting Started", "Core", "Classes", "Guides", "Modules"],
  // docGroups ही TypeDoc tab पर prose doc groups को क्रमित करता है।
  docGroups: ["Getting Started", "Guides"],
  defaultDocGroup: "Docs",
  clubSidebarItems: true, // TypeDoc पर कोई प्रभाव नहीं
  menu: [
    { id: "home", title: "Home", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

</tab>
</tabs>

**JSDoc** के लिए, इसे अपनी classes पर `@category Core/Parsing order=1` और अपने
guides पर `order:` frontmatter के साथ मिलाएँ, और आप sidebar को ऊपर से नीचे तक
नियंत्रित करते हैं। **TypeDoc** के लिए, API tree हमेशा
[TypeDoc flavor](#typedoc-flavor) वाले module पदानुक्रम के रूप में render होता
है — केवल आपके doc groups, `menu`, और tutorials ऊपर दिए options पर प्रतिक्रिया
करते हैं।

## आगे कहाँ जाएँ

- `@category` / `@order` tag reference: [Custom tags](/components/overview)।
- पूरी option सूची: [Configuration](/theme/configuration)।
- वे दो workflows जिन्हें यह एक साथ बाँधता है:
  [Build a guides site](/guides/build-a-guides-site) ·
  [Build an API reference](/guides/build-an-api-reference) ·
  [Combine guides + API](/guides/combine-guides-and-api)।
- TypeDoc sidebar + rendering पूरे विस्तार से:
  [TypeDoc Getting Started](/theme/typedoc-getting-started)।
