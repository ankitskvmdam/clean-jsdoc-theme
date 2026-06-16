---
title: उदाहरण
group: Packages/rang
order: 31
---

# `@clean-jsdoc-theme/rang` का उपयोग

> **पहले ख़ुद से ईमानदार रहें:** `@clean-jsdoc-theme/rang` एक internal, browser-side
> building block है जिसे [dwar](/packages/dwar-overview) उपभोग करता है। आप इसे
> ख़ुद wire नहीं करते — dwar इसे import करता है, इसके components को server-render
> करता है, और hydration के लिए islands को bundle करता है। आप rang में सीधे तभी
> हाथ डालेंगे जब आप **theme में contribute कर रहे हों** या एक **component override**
> लिख रहे हों। अगर आप सिर्फ़ docs चाहते हैं, तो इसके बजाय एक
> [entry point](/#the-packages) install करें और [options](/theme/configuration)
> set करें।

सब कुछ एकमात्र package entry से ship होता है — `package.json` केवल `.` expose करता
है, इसलिए सभी imports ऐसे दिखते हैं:

```tsx
import { Layout, Button, cn, defaultMdxComponents, ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';
import type { LayoutProps, ButtonProps } from '@clean-jsdoc-theme/rang';
```

प्रामाणिक export list
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
है।

## Public exports, grouped

ये वे चीज़ें हैं जिनकी ओर एक consumer या contributor वास्तव में बढ़ता है, सब
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
से:

```tsx
// shadcn-style primitives
import {
  Button, buttonVariants, ButtonGroup,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
  Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@clean-jsdoc-theme/rang';

// chrome (static SSR shell) + brand
import { Layout, Header, Footer, Brand } from '@clean-jsdoc-theme/rang';

// islands (interactive; hydrated by dwar)
import {
  Sidebar, SidebarItem, MobileNav, TOC, TocPopover,
  CtrlK, Settings, SettingsDialog, ThemeToggle, useThemeMode,
  CodeTabs, CopyBtn, CopyPageButton, CodeViewer,
} from '@clean-jsdoc-theme/rang';

// SSR-only doc components (NOT islands)
import { Steps, Step, Tabs, Tab, PageNav, CodeBlock } from '@clean-jsdoc-theme/rang';

// the registries + the class helper + MDX contexts
import {
  defaultMdxComponents, ISLAND_REGISTRY, cn,
  HeaderSlotContext, BasePathContext, InlineSvgContext,
} from '@clean-jsdoc-theme/rang';
```

`cn()` helper वही shadcn class-merge है जिसे आप किसी भी component के भीतर इस्तेमाल
करेंगे — यह conditional classes (`clsx`) को compose करता है और conflicting
Tailwind utilities को resolve करता है ताकि एक caller की class जीते
([`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)):

```tsx
import { cn } from '@clean-jsdoc-theme/rang';

// the caller's `bg-red-500` overrides the default `bg-background`
cn('bg-background px-3 py-2', isError && 'bg-red-500');
```

## एक MDX element एक component में कैसे map होता है

dwar हर page की MDX को compile करता है और उसे rang के `defaultMdxComponents` के
साथ render करता है। map बस element-name → component है
([`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)):

```tsx
import { defaultMdxComponents } from '@clean-jsdoc-theme/rang';

// intrinsic tags MDX emits are styled by rang renderers:
defaultMdxComponents['h2'];   // makeHeading('h2') — heading + hover anchor link
defaultMdxComponents['pre'];  // CodeBlock — shiki-highlighted block + copy button
defaultMdxComponents['code']; // inline <code>

// capitalized components setu emits route through the SAME map:
defaultMdxComponents['Callout'];   // a typed blockquote (e.g. @deprecated)
defaultMdxComponents['Embed'];     // renders the data-island="embed" marker
defaultMdxComponents['Tabs'];      // SSR tablist that dwar enhances on the client
defaultMdxComponents['MemberHeading'];
```

इसलिए एक `type` वाला markdown blockquote और setu का `<Callout type="…">` दोनों
एक ही renderer पर उतरते हैं, और एक fenced code block एक highlighted `CodeBlock`
बन जाता है। आप इनका user-facing पक्ष authoring docs में देख सकते हैं:
[Callouts](/components/callouts) और [Tabs](/components/tabs)।

dwar इस map को render से पहले किसी भी override के साथ merge करता है — इसका
`mergeMdxComponents` पहले `defaultMdxComponents` को spread करता है, फिर override
को ऊपर रखता है
([`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts))।

## The island pattern: पहले SSR, फिर hydrate

एक island वह component है जो server पर plain HTML के रूप में render होता है, फिर
एक छोटा JS chunk पाता है जो *केवल उसी subtree* को hydrate करता है। दो टुकड़े इसे
काम करने देते हैं:

**1. rang name → component को register करता है** `ISLAND_REGISTRY` में
([`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)):

```tsx
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

ISLAND_REGISTRY['sidebar'];      // Sidebar
ISLAND_REGISTRY['cmdk'];         // CtrlK (the Ctrl-K command palette)
ISLAND_REGISTRY['theme-toggle']; // ThemeToggle
// full set: sidebar, mobile-nav, toc, toc-mobile, cmdk, code-tabs,
// code-viewer, embed, copy-btn, copy-page, theme-toggle, settings, tabs
```

**2. dwar हर island को mount करता है** SSR के दौरान component को एक `data-island`
marker में wrap करके
([`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx))।
इसका `renderIsland` per-page payload के लिए props record करता है और marker emit
करता है:

```tsx
// dwar/src/layout.tsx (paraphrased)
function renderIsland({ name, islands, Component, props, ssrProps }) {
  const id = `i${islands.length}`;
  islands.push({ id, name, props });        // recorded for the hydration payload
  return (
    <div data-island={name} data-island-id={id}>
      <Component {...(ssrProps ?? props)} />  {/* real SSR markup inside */}
    </div>
  );
}
```

dwar फिर उन wrapped nodes को rang के `Layout` slots (`headerControls`, `sidebar`,
`toc`, `tocMobile`) में डालता है — यह अपना कोई chrome नहीं जोड़ता। bundle time पर,
[`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
हर island को एक entry के रूप में लेकर एक esbuild bundle बनाता है, Preact + rang की
registry को एक single shared chunk में hoist करता है। browser में, dwar का loader
हर `data-island="…"` element को ढूँढता है और recorded props के साथ
`ISLAND_REGISTRY` से मेल खाते component को hydrate करता है।

in-content islands पर ध्यान दें: `embed` marker पर `EmbedBody` mount करता है और
अपने `data-*` से config पढ़ता है, और `tabs` पूरी तरह SSR-rendered markup है जिसे
loader केवल DOM-*enhance* करता है (यह `tabs` के लिए registry import नहीं करता)।
दोनों विवरण
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
में documented हैं।

## Component overrides: एक आंशिक रूप से wired feature — ईमानदार रहें

`ComponentOverrides`
[`utils/src/site/theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
में रहता है और dwar को `theme.components` के रूप में सौंपा जाता है:

```ts
export interface ComponentOverrides {
  Sidebar?: Override<unknown>;
  TOC?: Override<unknown>;
  Header?: Override<unknown>;
  Footer?: Override<unknown>;
  Layout?: Override<unknown>;
  // MDX component map — keys are MDX element names (e.g. `h1`, `code`, `Callout`).
  mdxComponents?: Record<string, ComponentType<any>>;
}
```

आज वास्तव में **केवल एक field wired है: `mdxComponents`।** dwar का
`mergeMdxComponents` `theme.components?.mdxComponents` पढ़ता है और उसे
`defaultMdxComponents` के ऊपर merge करता है
([`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)):

```ts
// supplying your own renderer for a fenced code block, for example:
const theme = {
  /* …tokens… */
  components: {
    mdxComponents: {
      pre: MyCustomCodeBlock,   // overrides rang's default `pre` renderer
    },
  },
};
```

बाक़ी fields — `Sidebar`, `TOC`, `Header`, `Footer`, `Layout` — **ऐसे types हैं
जिनका dwar में अभी कोई consuming code नहीं है**। `packages/dwar/src` में इनके लिए
एक repo-wide search कोई reads नहीं पाती; `SsrLayout` हमेशा rang के अपने `Layout`,
`Sidebar`, `TOC`, आदि को compose करता है। तो आज, इन्हें set करने का कोई असर नहीं
है — इन्हें एक reserved, आगे-दिखने वाली surface मानें, न कि एक working override
point।

## आगे

- [rang सिंहावलोकन](/packages/rang-overview) — chrome-vs-island model और package
  क्यों मौजूद है।
- [dwar सिंहावलोकन](/packages/dwar-overview) — वह package जो इन components को
  server-render और bundle करता है।
- [Callouts](/components/callouts) · [Tabs](/components/tabs) — ऊपर के MDX components
  का user-facing पक्ष।
