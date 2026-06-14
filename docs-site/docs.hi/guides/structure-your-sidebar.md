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

> [!NOTE]
> नीचे दिए गए दो source tags — `@category` और `@order` —
> [Custom tags](/authoring/custom-tags) पर गहराई से प्रलेखित हैं। यह page इस पर
> है कि वे (और config options) sidebar को कैसे feed करते हैं; यह tag syntax को
> पूरी तरह दोबारा प्रलेखित नहीं करता।

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
> है)। पूर्ण syntax [Custom tags](/authoring/custom-tags) पर।

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
एक `menu` का उपयोग करता है।

## इसे एक साथ रखना

एक यथार्थवादी मिश्रित config:

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
</tabs>

इसे अपनी classes पर `@category Core/Parsing order=1` और अपने guides पर `order:`
frontmatter के साथ मिलाएँ, और आप sidebar को ऊपर से नीचे तक नियंत्रित करते हैं।

## आगे कहाँ जाएँ

- `@category` / `@order` tag reference: [Custom tags](/authoring/custom-tags)।
- पूरी option सूची: [Configuration](/theme/configuration)।
- वे दो workflows जिन्हें यह एक साथ बाँधता है:
  [Build a guides site](/guides/build-a-guides-site) ·
  [Build an API reference](/guides/build-an-api-reference) ·
  [Combine guides + API](/guides/combine-guides-and-api)।
