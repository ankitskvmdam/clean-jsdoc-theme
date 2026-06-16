---
title: सिंहावलोकन
group: Packages/rang
order: 30
---

# `@clean-jsdoc-theme/rang`

`@clean-jsdoc-theme/rang` वह **Preact component library** है जिसे
[dwar](/packages/dwar-overview) server-render और bundle करता है। यह page-shell
HTML का हर byte संभालता है — [`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx),
[`Header`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx),
और [`Footer`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx) —
वे hydratable **islands** जो progressive enhancement जोड़ती हैं, MDX element →
component map, और Tailwind utilities से styled shadcn-style primitives जो CSS
variables को संदर्भित करते हैं।

> [!NOTE]
> **नाम क्यों?** *rang* (रंग) हिंदी/संस्कृत में **रंग (color)** के लिए है — उस
> package के लिए उपयुक्त जो theme की पूरी दृश्य surface संभालता है: layout,
> components, और styling।

यह package केवल browser-safe contract package
([`@clean-jsdoc-theme/utils`](/packages/utils-overview)) पर निर्भर है, साथ ही
[`preact`](https://preactjs.com/), [`class-variance-authority`](https://cva.style/),
[`clsx`](https://github.com/lukeed/clsx),
[`tailwind-merge`](https://github.com/dcastil/tailwind-merge), और
[`lucide-preact`](https://github.com/lucide-icons/lucide) पर — देखें
[`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/package.json)।

> अगर आप सिर्फ़ theme इस्तेमाल करना चाहते हैं, तो आप यह package कभी install नहीं
> करते। यह एक internal building block है जिसे dwar आपके लिए bundle करता है। आप
> वास्तव में जो हिस्से install करते हैं उनके लिए [Packages](/#the-packages)
> section देखें।

## यह अलग package क्यों है

pipeline जानबूझकर बँटी है: setu एक `SiteManifest` उत्पन्न करता है, dwar उसे
render करता है, और **सारा markup rang में रहता है**। component layer को उसके अपने
package में खींचने से project को एक साफ़ सीवन मिलता है:

- **rang markup संभालता है; dwar orchestration संभालता है।** dwar का
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  अपना **कोई chrome नहीं** जोड़ता — इसका `SsrLayout`, rang के `Layout` को इसके
  `headerControls` / `sidebar` / `toc` / `tocMobile` slots के ज़रिए रचता है और हर
  interactive component को एक `<div data-island="…">` hydration marker में लपेटने
  के अलावा कुछ नहीं करता। जैसा उस file का अपना doc comment कहता है: *"The chrome
  markup (header, grid shell, asides, footer) lives entirely in rang's `Layout`.
  dwar's only job here is hydration."*
- **रचना से ही browser-safe।** Components browser में चलते हैं, तो rang केवल
  node-free [`utils`](/packages/utils-overview) contract import करता है — कभी
  build पक्ष नहीं। वही components server पर एक string में render होते हैं
  (`preact-render-to-string`) और browser में hydrate होते हैं।
- **एक styling convention।** Components खुद को Tailwind utility classes से style
  करते हैं जो CSS variables को संदर्भित करती हैं (जैसे `bg-background`,
  `text-(--clean-fg)`, `border-(--clean-border)`)। dwar उन variables में theme
  tokens को `:root` पर plumb करता है, ताकि वही markup बिना recompile के फिर से
  theme हो जाए। देखें
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
  — shadcn `cn()` helper जो `clsx` + `tailwind-merge` को रचता है ताकि एक
  caller-supplied class हमेशा Tailwind conflict जीते।

## Chrome बनाम islands

यह rang में केंद्रीय भेद है।

**Chrome** शुद्ध, static SSR markup है जिसमें कोई client JavaScript नहीं है।
[`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
shell — header + एक 3-column grid (sidebar · main · toc) + footer — खुद कभी किसी
island को संदर्भित नहीं करता। यह caller द्वारा इसके slots में डाले गए nodes को ही
render करता है। `Header`, `Footer`, और `Brand` इसी तरह static हैं।

**Islands** interactive हिस्से हैं। ये server पर plain HTML के रूप में render
होती हैं, फिर dwar एक छोटा per-island JS chunk mount करता है जो *केवल उस subtree*
को hydrate करता है — progressive enhancement, पूरे-page का SPA नहीं। islands का
पूरा सेट authoritative `ISLAND_REGISTRY` है,
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
में, एक `Record<IslandName, ComponentType>` जो उस island name से keyed है जिससे
dwar DOM को mark करता है:

| Island name (`IslandName`) | Component |
| --- | --- |
| `sidebar` | `Sidebar` |
| `mobile-nav` | `MobileNav` |
| `toc` | `TOC` |
| `toc-mobile` | `TocPopover` |
| `cmdk` | `CtrlK` |
| `code-tabs` | `CodeTabs` |
| `code-viewer` | `CodeViewer` |
| `embed` | `EmbedBody` |
| `copy-btn` | `CopyBtn` |
| `copy-page` | `CopyPageButton` |
| `theme-toggle` | `ThemeToggle` |
| `settings` | `Settings` |
| `tabs` | `Tabs` |

उन entries में से दो ध्यान देने योग्य हैं, सीधे registry के अपने comments से:

- **`embed`** `EmbedBody` से map होता है (`Embed` MDX wrapper से नहीं): loader
  `EmbedBody` को `data-island="embed"` marker पर mount करता है और इसका config
  marker के `data-*` attributes से पढ़ता है।
- **`tabs`** पूरी तरह SSR-rendered है — `Tabs` markup (ARIA tablist + panels)
  server पर उत्सर्जित होता है और client पर केवल **DOM-enhanced** होता है (panel
  content मनमाना SSR HTML है, इसलिए यह enhanced किया जाता है, फिर से hydrate
  नहीं)। इसकी entry *"purely to satisfy `Record<IslandName, …>`"* मौजूद है।

एक तीसरा समूह **SSR-only है और islands नहीं हैं**:
[`Steps`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx)
/ `Step` (एक static numbered stepper) और
[`PageNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/PageNav.tsx)
(prev/next pager) बिना किसी client JS के शुद्ध markup हैं — इन्हें export किया
जाता है और MDX/layout में उपयोग किया जाता है, पर ये कभी `ISLAND_REGISTRY` में नहीं
आते। Heading anchors भी मिलते-जुलते हैं: markup SSR-only है और एक delegated inline
script click संभालता है (देखें
[`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx))।

## MDX element map

जब dwar किसी page की MDX compile करता है, तो वह इसे rang के
`defaultMdxComponents` से render करता है — element-name → component registry जो
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
में है। यह MDX द्वारा उत्सर्जित intrinsic tags (`h1`–`h6`, `a`, `img`, `p`,
`pre`, `code`, lists, `blockquote`, tables, `hr`) को
[`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
और
[`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx)
के styled renderers पर map करता है, साथ ही उन **capitalized** components पर जिन्हें
setu उत्सर्जित करता है ताकि वे map से route हों: `Callout`, `Embed`, `SourceLink`,
`MemberMeta`, `MemberHeading`, `Steps` / `Step`, और `Tabs` / `Tab`। (इनके
user-facing पहलू के लिए देखें [Callouts](/components/callouts) और
[Tabs](/components/tabs)।)

## dwar इसका उपभोग कैसे करता है

dwar, rang को render समय और bundle समय दोनों पर import करता है:

- **SSR.**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  rang के `Layout` और chrome islands (`Sidebar`, `MobileNav`, `TOC`,
  `TocPopover`, `CtrlK`, `ThemeToggle`, `Settings`) को import करता है, हर एक को
  `renderIsland` के ज़रिए एक `data-island` marker में लपेटता है, per-page payload
  के लिए इसके props रिकॉर्ड करता है, और लपेटे हुए nodes को `Layout` के slots को
  सौंपता है।
- **Hydration.**
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  एक ही split esbuild build चलाता है जिसमें हर island एक entry point होती है।
  esbuild entries में साझा code (Preact, rang की registry, साझा helpers) को एक
  `chunk-<hash>.js` में उठा लेता है जिसे हर island chunk import करता है — यही
  उत्सर्जित `_islands/` payload को ~4.74 MB से घटाकर ~0.40 MB करता है। island
  sources `@clean-jsdoc-theme/rang` को dwar के अपने `node_modules` से import करते
  हैं।

## source पढ़ें

maintainer चाहता है कि आपको code की ओर भेजा जाए — यहाँ से शुरू करें:

- **Package directory:**
  [packages/rang](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang)
  ·
  [packages/rang/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang/src)
- **public barrel:**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
- **दो registries:**
  [`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
  (island name → component map) ·
  [`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
  (MDX element → component map)
- **chrome:**
  [`Layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
  ·
  [`Header.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx)
  ·
  [`Footer.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx)
- **MDX renderers + styling helper:**
  [`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
  ·
  [`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx)
  ·
  [`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx)
  ·
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
- **dwar इसे कैसे उपयोग करता है:**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  ·
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)

## आगे

- [rang Examples](/packages/rang-examples) — इन exports का उपयोग करते ठोस snippets।
- [dwar Overview](/packages/dwar-overview) — वह package जो rang को render और bundle करता है।
- [utils Overview](/packages/utils-overview) — browser-safe contract जिसे rang import करता है।
