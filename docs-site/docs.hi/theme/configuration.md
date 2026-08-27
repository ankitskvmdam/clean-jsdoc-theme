---
title: कॉन्फ़िगरेशन
group: Using the Theme
order: 4
---

# Configuration

हर theme option आपके `jsdoc.json` में `opts` के नीचे रहता है (या TypeDoc के लिए,
`typedoc.json` में `cleanJsdocTheme` block के नीचे — ठीक नीचे [JSDoc vs
TypeDoc](#jsdoc-vs-typedoc) देखें)। बाक़ी build सेट करना
[JSDoc Getting Started](/theme/jsdoc-getting-started) और
[TypeDoc Getting Started](/theme/typedoc-getting-started) में बताया गया है; यह
page theme के अपने options का दस्तावेज़ है।

नीचे हर option दोनों tools का snippet tabs में दिखाता है — जो आपके setup से मेल
खाए वही चुनें।

> [!WARNING]
> अनजान या ग़लत-वर्तनी वाले options default रूप से सिर्फ़ **चेतावनी** देते हैं (एक
> "did you mean?" संकेत के साथ) — build जारी रहता है। उन चेतावनियों को errors में
> बदलने के लिए [`strict`](#strict) सेट करें।

> [!TIP]
> यहाँ documented कोई option नहीं दिख रहा? सुनिश्चित करें कि आप theme के **latest
> version** पर हैं — नए options नियमित रूप से आते रहते हैं, और आपके build में कोई
> option न मिलना आमतौर पर इसका मतलब है कि installed version उससे पुराना है।

## JSDoc vs TypeDoc

इस page का हर option दोनों tools के लिए एक जैसा है — सिर्फ़ **आप उसे कहाँ रखते
हैं** यह अलग है। JSDoc में theme options `opts` के नीचे जाते हैं; TypeDoc में,
`cleanJsdocTheme` के नीचे।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

theme options **`opts`** के नीचे, JSDoc के अपने options के साथ रहते हैं:

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    // ↓ theme options
    siteName: "My Library",
    sectionOrder: ["Getting Started", "Classes", "Modules"],
    clubSidebarItems: true,
    copyPage: { enabled: true, actions: ["copy", "view", "claude"] },
  },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

theme को एक plugin के रूप में load किया जाता है और एक output के रूप में चुना जाता
है; इसके options **`cleanJsdocTheme`** के नीचे रहते हैं:

```json5
{
  entryPoints: ["src/index.ts"],
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  // ↓ theme options
  cleanJsdocTheme: {
    siteName: "My Library",
    sectionOrder: ["Getting Started", "Classes", "Modules"],
    clubSidebarItems: true,
    copyPage: { enabled: true, actions: ["copy", "view", "claude"] },
  },
}
```

</tab>

</tabs>

option के नाम और values एक जैसे हैं — सिर्फ़ namespace बदलता है: **`opts`**
(JSDoc) बनाम **`cleanJsdocTheme`** (TypeDoc)। एक अपवाद:
[`outputSourceFiles`](#outputsourcefiles) और
[`sourceLinkToComment`](#sourcelinktocomment) options JSDoc के `templates.default`
के नीचे बैठते हैं और सिर्फ़ JSDoc के लिए हैं।

## Site & identity

### `siteName`

header में दिखने वाला title — सादा text, या एक logo image।

**अपेक्षित:** एक string, या एक logo set object। logo set की keys सभी strings हैं:
`light` और `dark` हर theme में इस्तेमाल होने वाले logo URLs (या local paths) हैं,
`default` वह fallback है जब theme-विशिष्ट न दिया गया हो, और `alt` वह text है जो
image load न होने पर दिखता है (और screen readers द्वारा पढ़ा जाता है)।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteName: "My Library" }
// या एक logo जो theme के साथ बदलता है:
opts: {
  siteName: {
    light: "./assets/logo.svg",
    dark: "./assets/logo-dark.svg",
    alt: "My Library",
  },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteName: "My Library" }
// या एक logo जो theme के साथ बदलता है:
cleanJsdocTheme: {
  siteName: {
    light: "./assets/logo.svg",
    dark: "./assets/logo-dark.svg",
    alt: "My Library",
  },
}
```

</tab>

</tabs>

Default रूप से आपके package के `name` पर।

### `basePath`

वह site root path जिसे renderer हर internal link और asset के आगे जोड़ता है — इसे
तब सेट करें जब site domain root के बजाय किसी sub-path के नीचे serve हो।

**अपेक्षित:** एक string path। Default `""` (root पर serve)।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { basePath: "/my-library" } // example.com/my-library/ पर serve
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { basePath: "/my-library" } // example.com/my-library/ पर serve
```

</tab>

</tabs>

### `siteUrl`

आपकी site का सार्वजनिक base URL। सेट होने पर, build output root पर एक
**`sitemap.xml`** emit करता है — हर page के लिए एक entry (hidden source-viewer
pages को छोड़कर) — जिसे आप search engines को submit कर सकते हैं या `robots.txt`
से reference कर सकते हैं। इसके बिना कोई sitemap नहीं बनता।

**अपेक्षित:** एक पूर्ण `http(s)` URL। हर page के URL के लिए केवल इसका **origin**
इस्तेमाल होता है; deploy sub-path [`basePath`](#basepath) से आता है, इसलिए दोनों
कभी double-count नहीं होते — एक सादा origin (`https://example.com`) और एक पूरा URL
जिसका path आपके `basePath` के बराबर हो (`https://example.com/my-library`), दोनों
एक ही सही `<loc>` entries देते हैं। कोई sitemap न चाहिए तो इसे छोड़ दें (default)।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteUrl: "https://example.com", basePath: "/my-library" }
// → https://example.com/my-library/… URLs वाला sitemap.xml
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteUrl: "https://example.com", basePath: "/my-library" }
```

</tab>

</tabs>

### `llmsTxt`

output root पर एक [llms.txt](https://llmstxt.org) index emit करता है — वही file जिसे
LLMs और AI crawlers आपकी documentation खोजने के लिए पढ़ते हैं। हर entry page की
**companion Markdown** (`<page>/index.md`) से link करती है, कभी उसके HTML से नहीं,
ताकि model आपका layout parse करने की जगह साफ़ prose ले सके। दूसरी file,
**`llms-full.txt`**, एक ही बार में ingest करने के लिए सारे pages को जोड़ देती है।

**अपेक्षित:** `true` (`{ full: true, api: true }` का shorthand) या एक object:

| Key | Default | यह क्या करता है |
| --- | --- | --- |
| `full` | `true` | `llms-full.txt` भी emit करता है। बड़े API site पर `false` रखें — यह हर page को जोड़ता है, इसलिए megabytes तक पहुँच सकता है। |
| `api` | `true` | generated API pages के साथ कैसा बर्ताव हो। `true` उन्हें descriptions के साथ list करता है और उनके bodies `llms-full.txt` में रखता है; `'index'` उन्हें सिर्फ़ index की तरह list करता है (descriptions नहीं) और bodies छोड़ देता है; `false` उन्हें दोनों files से बाहर रखता है। |

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { siteUrl: "https://example.com", llmsTxt: true }
// → output root पर llms.txt + llms-full.txt
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { siteUrl: "https://example.com", llmsTxt: { api: "index" } }
// → API pages descriptions के बिना; llms-full.txt में केवल prose pages
```

</tab>

</tabs>

> [!WARNING]
> **[`siteUrl`](#siteurl) आवश्यक है।** `llms.txt` अपने आप fetch होती है, इसलिए उसके
> अंदर हर link absolute होना चाहिए। काम लायक site URL न होने पर build एक warning
> print करता है और कुछ generate नहीं करता — [`strict`](#strict) के साथ वह fail हो
> जाता है। TypeDoc users इसके बजाय TypeDoc का अपना `hostedBaseUrl` सेट कर सकते हैं;
> दोनों सेट होने पर `cleanJsdocTheme.siteUrl` जीतता है और build warn करता है।

Sections आपके sidebar groups के अनुरूप होते हैं, और source-file viewer pages कभी
list नहीं होते। localized build में हर locale को उसकी अपनी URLs वाली `llms.txt`
मिलती है।

### `favicon`

एक favicon image का path। bridge इसे एक content-hashed `_assets/` asset में copy
करता है और हर page के `<head>` में एक `<link rel="icon">` emit करता है (एक `type`
के साथ जो extension से निकाला जाता है — `.svg` → `image/svg+xml`)।

**अपेक्षित:** एक string file path (`.svg`, `.png`, `.ico`, …), working dir के
सापेक्ष। छोड़ा गया → कोई favicon link नहीं।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { favicon: "./assets/logo-small.svg" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { favicon: "./assets/logo-small.svg" }
```

</tab>

</tabs>

> [!TIP]
> एक **SVG** favicon को इस option की ज़रूरत होती है — browsers केवल एक root
> `favicon.ico` को auto-discover करते हैं, कभी किसी SVG को नहीं। एक SVG icon SVG के
> अंदर एक `@media (prefers-color-scheme: dark)` block के साथ light/dark के अनुसार
> ढल भी सकता है।

## Content sources

### `readme`

एक Markdown file जो site का **home page** बनकर render होती है।

**अपेक्षित:** एक path string। (एक root `docs/index.md` इसे override कर देता है —
[`docs`](#docs) देखें।)

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { readme: "./README.md" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { readme: "./README.md" }
```

</tab>

</tabs>

### `docs`

हाथ से लिखे Markdown/HTML guides की एक directory जो prose pages के रूप में render
होती है। folder का layout हर page का URL और sidebar group तय करता है; प्रति-file
YAML frontmatter (`title`, `group`, `order`, `slug`, `hidden`) defaults को
override करता है, और एक root `index.md` home page बन जाती है।

**अपेक्षित:** एक path string (एक directory)।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { docs: "./docs" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { docs: "./docs" }
```

</tab>

</tabs>

### `docGroups`

sidebar में top-level **doc** groups का प्रदर्शन-क्रम।

**अपेक्षित:** group-label strings की एक array।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { docGroups: ["Getting Started", "Guides"] }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { docGroups: ["Getting Started", "Guides"] }
```

</tab>

</tabs>

> [!TIP]
> यही site `docs` और `docGroups` options से बनी है — इसके guides सादा Markdown
> files हैं जो उन्हीं sidebar sections में समूहित हैं जिन्हें आप अभी देख रहे हैं।
> कुछ ऐसा ही बनाना चाहते हैं? source देखें:
> [docs-site on GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site)।

### `defaultDocGroup`

वह group label जिसमें कोई doc तब आता है जब वह कोई group घोषित न करे (न frontmatter
`group`, न humanize करने योग्य कोई folder)।

**अपेक्षित:** एक अकेली string।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { defaultDocGroup: "Docs" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { defaultDocGroup: "Docs" }
```

</tab>

</tabs>

### `tutorials`

JSDoc की `--tutorials` directory। हर tutorial एक guide page बनता है, sidebar में
"Tutorials" के नीचे समूहित।

**अपेक्षित:** एक path string (एक directory)। JSDoc के `-u` flag के समतुल्य।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { tutorials: "./tutorials" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { tutorials: "./tutorials" }
```

</tab>

</tabs>

## Sidebar & navigation

### `sectionOrder`

**सभी** top-level sidebar sections का क्रम — आपके doc/category groups और API kind
labels (Classes, Modules, …) दोनों। सूचीबद्ध labels दिए गए क्रम में पहले आते हैं;
जो आप छोड़ देते हैं वह उसके बाद जुड़ जाता है।

**अपेक्षित:** section-label strings की एक array।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
// स्वीकार्य पर TypeDoc के तहत इसका कोई प्रभाव नहीं — नीचे note देखें।
cleanJsdocTheme: { sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"] }
```

</tab>

</tabs>

> [!NOTE]
> **JSDoc** के तहत `sectionOrder` doc/tutorial groups और API kind sections को
> क्रमित करता है। **TypeDoc** के तहत इसका **बिल्कुल कोई प्रभाव नहीं** — वह sidebar
> एक अपने स्थिर क्रम वाला module/folder पदानुक्रम है, और वहाँ doc groups
> [`docGroups`](#docgroups) से क्रमित होते हैं, `sectionOrder` से नहीं। देखें
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor)।

### `clubSidebarItems`

संबंधित entries (जैसे एक module और उसके members) को एक साझा, collapsible parent के
नीचे समेटें, पहले `/` से पहले वाले path segment के अनुसार समूहित।

**अपेक्षित:** एक boolean। Default `false`।

> [!NOTE]
> `clubSidebarItems` का TypeDoc API tree पर कोई प्रभाव नहीं पड़ता। देखें
> [TypeDoc flavor](/guides/structure-your-sidebar#typedoc-flavor)।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { clubSidebarItems: true }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { clubSidebarItems: true }
```

</tab>

</tabs>

### `collapsibleSidebarSections`

top-level sidebar sections को collapsible बनाएँ — हर section header एक toggle बन
जाता है जो अपने entries को expand/collapse करता है। Sections default रूप से
**खुले** रहते हैं; एक visitor की collapsed/expanded पसंद प्रति-visitor
`localStorage` में persist होती है।

**अपेक्षित:** `true` (या छोड़ दिया गया) → हर top-level section collapsible होता है
(**default**); `false` → कोई नहीं; एक `string[]` → केवल सूचीबद्ध section labels,
**exact और case-sensitive** मिलान (`'Class'`, `'Classes'` से मेल **नहीं** खाता)।
Labels वे rendered section headers हैं: plural kind labels (`Classes`,
`Namespaces`, `Interfaces`, `Modules`, `Typedefs`/`Type Aliases`,
`Enumerations`, `Functions`, `Variables`, `Globals`), `@category` top-level
segments, doc-group labels, `Tutorials`, और `Source Files`। array का कोई entry
जो किसी rendered section से मेल न खाए, उपलब्ध sections को सूचीबद्ध करते हुए एक
build warning print करता है।

> [!NOTE]
> **कोई function form नहीं** — value build time पर एक बार resolve होती है।
> `sectionOrder` / `clubSidebarItems` के विपरीत, `collapsibleSidebarSections`
> **दोनों** JSDoc और TypeDoc के तहत समान रूप से काम करता है।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  // all top-level sections collapsible (default if omitted)
  collapsibleSidebarSections: true,

  // …or only these (exact, case-sensitive labels):
  collapsibleSidebarSections: ["Namespaces", "Classes"],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  collapsibleSidebarSections: true,
  // …or only these (exact, case-sensitive labels):
  collapsibleSidebarSections: ["Namespaces", "Classes"],
}
```

</tab>

</tabs>

### `menu`

sidebar navigation के ऊपर pin किए गए custom links।

**अपेक्षित:** entries की एक array। हर एक एक object है जिसमें `title`, एक `link` (या
`href`), एक वैकल्पिक `id`, और एक वैकल्पिक `icon` — `lucide:<name>` या
`simpleicons:<name>`, एक CDN से load होता है। दो वैकल्पिक fields link की
presentation को नियंत्रित करते हैं: `target` (link target — external link डिफ़ॉल्ट रूप
से `_blank`) और `class` (rendered link पर merge की गई अतिरिक्त CSS class(es))।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
    // उसी tab में खोलें + customCss से styling के लिए एक custom class दें:
    { title: "Changelog", link: "/changelog", target: "_self", class: "menu-changelog" },
  ],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  menu: [
    { title: "Home", link: "/", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
    { title: "Changelog", link: "/changelog", target: "_self", class: "menu-changelog" },
  ],
}
```

</tab>

</tabs>

### `pageNav`

हर content page के नीचे का prev/next pager — दो cards जो sidebar reading order में
आसपास के pages को link करते हैं। Default में on; source-viewer pages कभी नहीं
दिखाते।

**अपेक्षित:** एक boolean shorthand, या एक object `{ enabled }`। Default `true`।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { pageNav: false }
// या object रूप: opts: { pageNav: { enabled: false } }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { pageNav: false }
// या object रूप: cleanJsdocTheme: { pageNav: { enabled: false } }
```

</tab>

</tabs>

## Appearance & assets

### `fonts`

type families को override करें।

**अपेक्षित:** एक object जिसमें `heading`, `body`, और/या `mono` हों। `heading` और
`body` Google Font family नाम हैं (आपके लिए load होते हैं, build के समय अस्तित्व
जाँचा जाता है); `mono` एक CSS font stack है।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  fonts: { heading: "Fraunces", body: "Spline Sans", mono: "Spline Sans Mono" },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  fonts: { heading: "Fraunces", body: "Spline Sans", mono: "Spline Sans Mono" },
}
```

</tab>

</tabs>

### `colors` and `darkColors`

theme को फिर से रंगें। `colors` light-mode palette है (और `:root` default भी);
`darkColors` dark-mode palette है, जो `[data-theme="dark"]` के नीचे emit होती है।
हर एक built-in palette पर **प्रति key** merge होती है, इसलिए आप सिर्फ़ `bg`
override करके बाक़ी हर default रख सकते हैं।

**अपेक्षित:** इन keys के किसी भी subset वाला एक object, हर एक एक CSS color string
(theme [oklch](https://oklch.com) के साथ आता है, पर कोई भी मान्य CSS color चलता
है):

| Key         | भूमिका                                          |
| ----------- | ----------------------------------------------- |
| `bg`        | Page background                                 |
| `bgMuted`   | हल्की सतहें (code blocks, cards, sidebar)        |
| `fg`        | Body text                                       |
| `fgMuted`   | द्वितीयक / muted text                            |
| `accent`    | Links, focus rings, primary buttons             |
| `accentFg`  | `accent` background पर text/icon                |
| `border`    | महीन रेखाएँ और dividers                          |
| `codeHeaderBg`    | Code-block header strip background        |
| `codeHeaderFg`    | Code-block header label text              |
| `codeHighlightBg` | Highlighted code-line background (`@playground` / `highlight=`) |

तीनों `code*` keys code-block chrome को style करती हैं — header strip (इसका
background + `CODE`/filename label) और किसी highlighted line पर tint। ये light में
एक neutral `#f7f7f7`-समतुल्य पर और dark में elevated greys पर default होती हैं,
इसलिए आप इन्हें केवल किसी custom palette से मेल खाने के लिए सेट करते हैं।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  colors: { bg: "oklch(0.99 0.01 95)", accent: "oklch(0.55 0.2 250)" },
  darkColors: { bg: "oklch(0.18 0.01 250)", accent: "oklch(0.7 0.16 250)" },
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  colors: { bg: "oklch(0.99 0.01 95)", accent: "oklch(0.55 0.2 250)" },
  darkColors: { bg: "oklch(0.18 0.01 250)", accent: "oklch(0.7 0.16 250)" },
}
```

</tab>

</tabs>

अनजान keys और non-string values को नज़रअंदाज़ कर दिया जाता है। अगर आप `darkColors`
पूरी तरह छोड़ देते हैं, तो dark mode `colors` के एक समझदार bg/fg अदला-बदली पर
fallback कर जाता है।

### `scrollbar`

scrollbar (page और कोई भी scrollable panel, जैसे sidebar या कोई code block) कैसे
दिखे, यह नियंत्रित करता है।

**अपेक्षित:** इनमें से एक — `"styled"` (default), `"visible"`, या `"native"`।

- `"styled"` — theme की पतली, रंगीन overlay bar, आराम की स्थिति में अदृश्य और
  सिर्फ़ active scroll के दौरान या hover पर दिखती है।
- `"visible"` — वही पतली, themed bar, पर हमेशा दिखाई देती है (idle-hide नहीं)।
- `"native"` — कोई scrollbar styling नहीं — browser की अपनी, हमेशा-दृश्यमान
  scrollbar।

default overlay आराम की स्थिति में छिप जाती है, जिससे किसी लंबे page में अपनी
स्थिति समझना मुश्किल हो सकता है
([#281](https://github.com/ankitskvmdam/clean-jsdoc-theme/issues/281))। अगर आप
चाहते हैं कि scrollbar टिकी रहे, तो `scrollbar` को `"visible"` या `"native"` पर
सेट करें। यह option **JSDoc और TypeDoc दोनों** पर लागू होता है।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  // "styled" (default) | "visible" | "native"
  scrollbar: "native",
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  // "styled" (default) | "visible" | "native"
  scrollbar: "native",
}
```

</tab>

</tabs>

### `customCss` and `customJs`

हर page में inject किए गए inline CSS/JS। custom CSS theme stylesheet के **बाद**
load होती है (ताकि override करे); custom JS **सबसे आख़िर** में चलता है।

**अपेक्षित:** एक string।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { customCss: ".my-banner { color: rebeccapurple; }" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { customCss: ".my-banner { color: rebeccapurple; }" }
```

</tab>

</tabs>

### `customCssFile` and `customJsFile`

ऊपर जैसा ही, पर disk पर एक file से पढ़ा जाता है। bridge हर एक को एक
content-hashed asset में copy करके link करता है।

**अपेक्षित:** एक path string।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { customCssFile: "./extra.css", customJsFile: "./extra.js" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { customCssFile: "./extra.css", customJsFile: "./extra.js" }
```

</tab>

</tabs>

### `hashCustomAssets`

क्या custom-asset filenames content-hashed हों (cache-busting के लिए)। स्थिर,
बिना-hash वाले नाम रखने के लिए `false` सेट करें।

**अपेक्षित:** एक boolean। Default `true`।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { hashCustomAssets: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { hashCustomAssets: false }
```

</tab>

</tabs>

## LLM & copy page

### `copyPage`

प्रति-page "copy page" / "open in LLM" button (सिर्फ़ content pages)।

**अपेक्षित:** एक boolean shorthand, या एक object `{ enabled, actions }` जहाँ
`actions` में से कोई भी हो: `copy`, `view`, `claude`, `chatgpt`, `perplexity`।
Default में on, सभी actions के साथ।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// या बस: opts: { copyPage: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { copyPage: { enabled: true, actions: ["copy", "view", "claude"] } }
// या बस: cleanJsdocTheme: { copyPage: false }
```

</tab>

</tabs>

### `aiPrompt`

एक custom निर्देश जो तब आगे जोड़ा जाता है जब किसी page को open-in actions के ज़रिये
किसी LLM को सौंपा जाता है।

**अपेक्षित:** एक string।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { aiPrompt: "You are helping a developer use My Library. " }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { aiPrompt: "You are helping a developer use My Library. " }
```

</tab>

</tabs>

## Source files

> [!INFO]
> ये दोनों **सिर्फ़ JSDoc** के लिए हैं। ये `templates.default` (JSDoc का
> default-template namespace) के नीचे रहते हैं, `opts` या `cleanJsdocTheme` के
> नीचे नहीं।

### `outputSourceFiles`

क्या syntax-highlighted source-file viewer pages और members पर `Source:
file:line` links generate हों।

**अपेक्षित:** एक boolean। Default `true`; दोनों को दबाने के लिए `false` सेट करें।

```json5
templates: { default: { outputSourceFiles: false } }
```

### `sourceLinkToComment`

कोई `Source:` link कहाँ उतरता है: symbol की **declaration** (default) या उसका
documentation **comment**।

**अपेक्षित:** एक boolean। Default `false` (declaration पर उतरता है)।

```json5
templates: { default: { sourceLinkToComment: true } }
```

### How assets are handled

इसे आप configure नहीं करते, पर यह जानना अच्छा है कि आपके docs और README से
referenced local files कैसे process होती हैं। कोई भी image जिसे आप किसी relative
या root-relative path से link करते हैं — `![diagram](./assets/flow.svg)` — site की
`_assets/` directory में एक **content-hashed** नाम (जैसे
`_assets/flow.3de65053.svg`) के तहत copy हो जाती है और reference उसकी ओर इंगित
करने के लिए फिर से लिखा जाता है। hash file के bytes से निकाला जाता है, इसलिए
अपरिवर्तित file builds के बीच एक स्थिर, cacheable URL रखती है और बदली हुई file
अपने-आप cache-bust हो जाती है। बाहरी (`https://…`) और `data:` URLs अछूते रहते
हैं।

`.svg` files को एक अतिरिक्त चरण मिलता है: उनका markup `<img>` के ज़रिये load होने
के बजाय सीधे page में **inline** कर दिया जाता है। इससे किसी SVG की अपनी
`[data-theme="dark"]` styles in-page theme toggle का अनुसरण कर पाती हैं — एक
`<img>` से load हुई SVG सिर्फ़ operating system का color scheme देख सकती है, आपके
site का toggle कभी नहीं।

Logos ([`siteName`](#sitename)) और
[`customCssFile` / `customJsFile`](#customcssfile-and-customjsfile) उसी
content-hashed `_assets/` pipeline पर चलते हैं।

## Localization

ये दोनों आपकी site को एक **बहु-भाषी** build में बदल देते हैं — हर locale के लिए एक
static site, जिसमें एक header language switcher और `hreflang` alternates जुड़े
होते हैं। ये locales घोषित करते हैं; असल translation workflow (catalogs निकालना,
translate करना, और हर locale को build करना)
[`clean-jsdoc`](/packages/aadesh-overview) CLI से चलता है। पूरा walkthrough
[Localize your docs](/guides/localize-your-docs) में है। बिना `locales` के build
पर कोई असर नहीं पड़ता — वह ठीक पहले जैसा ही render होता है।

> [!INFO]
> localized **builds** आज सिर्फ़ JSDoc के लिए हैं। TypeDoc bridge catalogs
> *extract* तो कर सकता है पर अभी per-locale sites render नहीं करता।

### `locales`

build की जाने वाली भाषाएँ।

**अपेक्षित:** `{ code, name }` objects की एक array (`name` switcher का label है),
या सादे locale-code strings। Codes BCP-47-ish होते हैं (`en`, `pt-BR`)।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
}
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
}
```

</tab>

</tabs>

### `defaultLocale`

site root पर render होने वाली भाषा (बाक़ी हर locale `/<code>` के नीचे उतरती है)।

**अपेक्षित:** एक locale code जो [`locales`](#locales) में मौजूद हो। वैकल्पिक —
default रूप से पहली entry।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { defaultLocale: "en" }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { defaultLocale: "en" }
```

</tab>

</tabs>

## Build

### `strict`

option diagnostics (एक ख़राब font नाम, एक अनजान key) को चेतावनियों से कठोर build
errors में बढ़ा दें।

**अपेक्षित:** एक boolean। Default `false`।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { strict: true }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { strict: true }
```

</tab>

</tabs>

### `progress`

build का progress output (प्रति-stage spinners) toggle करें।

**अपेक्षित:** एक boolean। Default `true`।

<tabs group="tool">

<tab label="JSDoc (jsdoc.json)">

```json5
opts: { progress: false }
```

</tab>

<tab label="TypeDoc (typedoc.json)">

```json5
cleanJsdocTheme: { progress: false }
```

</tab>

</tabs>
