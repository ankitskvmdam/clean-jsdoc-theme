---
title: 示例
group: Packages/rang
order: 31
---

# 使用 `@clean-jsdoc-theme/rang`

> **先对自己诚实：** `@clean-jsdoc-theme/rang` 是一个供
> [dwar](/packages/dwar-overview) 使用的内部浏览器端构建模块。你不需要自己来接入它
> —— dwar 会导入它、在服务端渲染它的组件，并将这些 island 打包以供 hydration。只有在你
> **为主题贡献代码**或编写**组件 override** 时，你才会直接接触 rang。如果你只是想要文档，
> 请安装一个[入口点](/#the-packages)并设置[选项](/theme/configuration)。

所有内容都从单一的包入口导出 —— `package.json` 只暴露了 `.`，因此所有导入都长这样：

```tsx
import { Layout, Button, cn, defaultMdxComponents, ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';
import type { LayoutProps, ButtonProps } from '@clean-jsdoc-theme/rang';
```

权威的导出列表见
[`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)。

## 公共导出（分组列出）

这些是使用者或贡献者真正会用到的东西，全部来自
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)：

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

`cn()` 辅助函数就是你在任何组件内部都会用到的同一个 shadcn class-merge —— 它组合条件类
（`clsx`）并解决冲突的 Tailwind 工具类，从而让调用方的类胜出
（[`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)）：

```tsx
import { cn } from '@clean-jsdoc-theme/rang';

// the caller's `bg-red-500` overrides the default `bg-background`
cn('bg-background px-3 py-2', isError && 'bg-red-500');
```

## 一个 MDX 元素如何映射到组件

dwar 会编译每个页面的 MDX，并使用 rang 的 `defaultMdxComponents` 来渲染它。这个映射就是
元素名 → 组件
（[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)）：

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

因此，一个带有 `type` 的 markdown 引用块与 setu 的 `<Callout type="…">` 都会落到同一个
渲染器上，而一个围栏代码块会变成一个高亮的 `CodeBlock`。你可以在创作文档中看到这些组件
面向用户的一面：[Callouts](/authoring/callouts) 和 [Tabs](/authoring/tabs)。

dwar 在渲染前会将这个映射与任何 override 合并 —— 它的 `mergeMdxComponents` 先展开
`defaultMdxComponents`，然后在其上叠加 override
（[`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)）。

## island 模式：先 SSR，再 hydrate

一个 island 是一个在服务端渲染为纯 HTML 的组件，随后会获得一小段 JS chunk 来
*仅对该子树* 进行 hydration。让它工作的有两个部分：

**1. rang 在 `ISLAND_REGISTRY` 中注册名称 → 组件**
（[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)）：

```tsx
import { ISLAND_REGISTRY } from '@clean-jsdoc-theme/rang';

ISLAND_REGISTRY['sidebar'];      // Sidebar
ISLAND_REGISTRY['cmdk'];         // CtrlK (the Ctrl-K command palette)
ISLAND_REGISTRY['theme-toggle']; // ThemeToggle
// full set: sidebar, mobile-nav, toc, toc-mobile, cmdk, code-tabs,
// code-viewer, embed, copy-btn, copy-page, theme-toggle, settings, tabs
```

**2. dwar 挂载每个 island**，方法是在 SSR 期间将组件包裹在一个 `data-island` 标记中
（[`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)）。
它的 `renderIsland` 会记录用于每个页面 payload 的 props，并发出该标记：

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

dwar 随后将这些被包裹的节点放入 rang 的 `Layout` 插槽（`headerControls`、`sidebar`、
`toc`、`tocMobile`）—— 它不添加任何自己的 chrome。在打包时，
[`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
会构建一个以每个 island 为入口的 esbuild bundle，将 Preact 与 rang 的注册表提升到一个
共享的 chunk 中。在浏览器里，dwar 的 loader 会找到每个 `data-island="…"` 元素，并用记录
下来的 props 从 `ISLAND_REGISTRY` 中 hydrate 匹配的组件。

注意那些内容内的 island：`embed` 会把 `EmbedBody` 挂载到标记上并从它的 `data-*` 读取配置，
而 `tabs` 是完全由 SSR 渲染的标记，loader 只对它进行 DOM *增强*（它不会为 `tabs` 导入
注册表）。这两个细节都记录在
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts) 中。

## 组件 override：一个部分接线的功能 —— 请诚实相告

`ComponentOverrides` 位于
[`utils/src/site/theme.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/theme.ts)
中，并作为 `theme.components` 交给 dwar：

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

今天实际接线的**只有一个字段：`mdxComponents`。** dwar 的 `mergeMdxComponents` 会读取
`theme.components?.mdxComponents` 并将它合并到 `defaultMdxComponents` 之上
（[`dwar/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/index.ts)）：

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

其他字段 —— `Sidebar`、`TOC`、`Header`、`Footer`、`Layout` —— **目前是类型，但 dwar 中尚无
消费它们的代码**。在 `packages/dwar/src` 中对它们进行全仓搜索找不到任何读取；`SsrLayout`
始终组合 rang 自己的 `Layout`、`Sidebar`、`TOC` 等。因此，今天设置它们没有任何效果 —— 把
它们当作一个预留的、面向未来的接口，而不是一个可用的 override 点。

## 下一步

- [rang 概览](/packages/rang-overview) —— chrome 与 island 的模型，以及这个包为何存在。
- [dwar 概览](/packages/dwar-overview) —— 负责服务端渲染并打包这些组件的包。
- [Callouts](/authoring/callouts) · [Tabs](/authoring/tabs) —— 上述 MDX 组件面向用户的一面。
