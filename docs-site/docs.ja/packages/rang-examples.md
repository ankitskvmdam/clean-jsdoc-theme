---
title: 例
group: Packages/rang
order: 31
---

# `@clean-jsdoc-theme/rang` を使う

> **まず自分に正直になりましょう:** `@clean-jsdoc-theme/rang` は internal で
> browser-side の building block であり、[dwar](/packages/dwar-overview) がそれを
> consume します。あなた自身がこれを wire することはありません — dwar がこれを import
> し、その components を server-render し、hydration のために islands を bundle します。
> rang に直接手を入れるのは、**theme に contribute している** とき、あるいは
> **component override** を書いているときだけです。単に docs が欲しいだけなら、代わりに
> [entry point](/#the-packages) を install して [options](/theme/configuration) を
> 設定してください。

すべては単一の package entry から ship されます — `package.json` は `.` のみを expose
するので、すべての imports はこのようになります:

```tsx
import { Layout, Button, cn, defaultMdxComponents, ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';
import type { LayoutProps, ButtonProps } from '@clean-jsdoc-theme/rang';
```

正式な export list は
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
です。

## public exports をグループ別に

これらは consumer や contributor が実際に手を伸ばすものであり、すべて
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
からです:

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

`cn()` helper は、どの component の内部でも使うのと同じ shadcn の class-merge です —
conditional classes（`clsx`）を compose し、conflicting な Tailwind utilities を
resolve するので、caller の class が勝ちます
（[`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)）:

```tsx
import { cn } from '@clean-jsdoc-theme/rang';

// the caller's `bg-red-500` overrides the default `bg-background`
cn('bg-background px-3 py-2', isError && 'bg-red-500');
```

## MDX element が component にどう map するか

dwar は各 page の MDX を compile し、rang の `defaultMdxComponents` でそれを render
します。map は単に element-name → component です
（[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)）:

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

したがって、`type` 付きの markdown blockquote と setu の `<Callout type="…">` は
どちらも同じ renderer に到達し、fenced code block は highlighted な `CodeBlock` に
なります。これらの user-facing な側面は authoring docs で確認できます:
[Callouts](/components/callouts) と [Tabs](/components/tabs)。

dwar は render の前にこの map を任意の override と merge します — その
`mergeMdxComponents` はまず `defaultMdxComponents` を spread し、それから override を
その上に置きます
（[`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)）。

## island pattern: まず SSR、それから hydrate

island は、server では plain HTML として render され、それから *その subtree だけ* を
hydrate する小さな JS chunk を受け取る component です。2 つの部品がこれを機能させます:

**1. rang が name → component を register します** `ISLAND_REGISTRY` の中で
（[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)）:

```tsx
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

ISLAND_REGISTRY['sidebar'];      // Sidebar
ISLAND_REGISTRY['cmdk'];         // CtrlK (the Ctrl-K command palette)
ISLAND_REGISTRY['theme-toggle']; // ThemeToggle
// full set: sidebar, mobile-nav, toc, toc-mobile, cmdk, code-tabs,
// code-viewer, embed, copy-btn, copy-page, theme-toggle, settings, tabs
```

**2. dwar が各 island を mount します** SSR の最中に component を `data-island` marker
で wrap することによって
（[`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)）。
その `renderIsland` は per-page payload 用に props を record し、marker を emit します:

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

それから dwar はその wrap された nodes を rang の `Layout` slots（`headerControls`、
`sidebar`、`toc`、`tocMobile`）に投入します — 自身の chrome は何も加えません。bundle
time には、
[`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
が各 island を entry として 1 つの esbuild bundle を build し、Preact + rang の registry
を単一の shared chunk に hoist します。browser では、dwar の loader が各
`data-island="…"` element を見つけ、record された props で `ISLAND_REGISTRY` から
一致する component を hydrate します。

in-content islands に注目してください: `embed` は marker 上に `EmbedBody` を mount し、
その `data-*` から config を読み取ります。`tabs` は完全に SSR-rendered な markup であり、
loader はそれを DOM-*enhance* するだけです（`tabs` のために registry を import しません）。
どちらの詳細も
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
に documented されています。

## Component overrides: 部分的に wired された feature — 正直に

`ComponentOverrides` は
[`utils/src/site/theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
にあり、`theme.components` として dwar に渡されます:

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

今日、実際に wired されている field は **1 つだけ: `mdxComponents` です。** dwar の
`mergeMdxComponents` は `theme.components?.mdxComponents` を読み取り、それを
`defaultMdxComponents` の上に merge します
（[`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)）:

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

その他の fields — `Sidebar`、`TOC`、`Header`、`Footer`、`Layout` — は **dwar にまだ
consuming code がない types** です。`packages/dwar/src` をリポジトリ全体で検索しても
reads は見つかりません; `SsrLayout` は常に rang 自身の `Layout`、`Sidebar`、`TOC` などを
compose します。したがって今日これらを set しても効果はありません — working な override
point ではなく、予約された前向きな surface とみなしてください。

## 次へ

- [rang 概要](/packages/rang-overview) — chrome-vs-island モデルと、package がなぜ
  存在するか。
- [dwar 概要](/packages/dwar-overview) — これらの components を server-render し
  bundle する package。
- [Callouts](/components/callouts) · [Tabs](/components/tabs) — 上記の MDX components の
  user-facing な側面。
