---
title: 概览
group: Packages/rang
order: 30
---

# `@clean-jsdoc-theme/rang`

`@clean-jsdoc-theme/rang` 是由
[dwar](/packages/dwar-overview) 进行服务端渲染并打包的 **Preact 组件库**。它掌管页面外壳
HTML 的每一个字节——[`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)、
[`Header`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx)
和 [`Footer`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx)——
那些为渐进增强提供支持的可 hydration 的 **island**、MDX 元素 →
组件映射，以及用引用 CSS 变量的 Tailwind 工具类设置样式的 shadcn 风格基础组件。

> [!NOTE]
> **为何取这个名字？** *rang*（रंग）在印地语/梵语中意为**颜色**——这恰如其分地形容了这个
> 掌管主题整个视觉层面的包：布局、组件和样式。

该包仅依赖于浏览器安全的契约包
（[`@clean-jsdoc-theme/utils`](/packages/utils-overview)），外加
[`preact`](https://preactjs.com/)、[`class-variance-authority`](https://cva.style/)、
[`clsx`](https://github.com/lukeed/clsx)、
[`tailwind-merge`](https://github.com/dcastil/tailwind-merge) 和
[`lucide-preact`](https://github.com/lucide-icons/lucide)——参见
[`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/package.json)。

> 如果你只是想使用该主题，你永远不需要安装这个包。它是一个由 dwar 为你打包的内部
> 构建块。关于你实际需要安装的部分，参见
> [Packages](/#the-packages) 一节。

## 为何它是一个独立的包

该流水线是有意拆分的：setu 产出一个 `SiteManifest`，dwar 渲染
它，而**所有标记都存在于 rang 中**。将组件层抽取到它自己的
包中，为项目带来了一道清晰的接缝：

- **rang 掌管标记；dwar 掌管编排。** dwar 的
  [`layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  **不添加任何自己的外壳**——它的 `SsrLayout` 通过 rang `Layout` 的
  `headerControls` / `sidebar` / `toc` / `tocMobile` 插槽来组合它，除了把每个
  交互组件包裹进一个 `<div data-island="…">` hydration 标记之外，不做任何其他事情。正如该
  文件自己的文档注释所言：*"The chrome markup
  (header, grid shell, asides, footer) lives entirely in rang's `Layout`. dwar's
  only job here is hydration."*
- **从构造上即浏览器安全。** 组件在浏览器中运行，因此 rang 只
  导入无 node 的 [`utils`](/packages/utils-overview) 契约——绝不导入构建
  侧。相同的组件在服务端渲染为字符串
  （`preact-render-to-string`）并在浏览器中进行 hydration。
- **一套样式约定。** 组件用引用 CSS 变量的 Tailwind 工具
  类来给自己设置样式（例如 `bg-background`、
  `text-(--clean-fg)`、`border-(--clean-border)`）。dwar 将主题 token
  注入到 `:root` 上的这些变量中，因此相同的标记无需重新编译即可重新换主题。参见
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
  ——shadcn 的 `cn()` 辅助函数，它组合 `clsx` + `tailwind-merge`，从而让
  调用方提供的类总能在 Tailwind 冲突中胜出。

## 外壳（Chrome）与 island

这是 rang 中的核心区分。

**外壳（Chrome）**是纯粹、静态的 SSR 标记，不含任何客户端 JavaScript。
[`Layout`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
外壳——header + 一个 3 列网格（sidebar · main · toc）+ footer——自身从不
引用任何 island。它只渲染调用方放入其
插槽中的任意节点。`Header`、`Footer` 和 `Brand` 同样是静态的。

**island** 是交互式的部分。它们在服务端渲染为纯 HTML，
随后 dwar 挂载一个小的、每个 island 各自的 JS 块来 hydrate *仅该子树*——
是渐进增强，而非整页的 SPA。island 的完整集合是
[`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
中那份权威的 `ISLAND_REGISTRY`，
一个以 dwar 标记 DOM 时所用的 island 名称为键的 `Record<IslandName, ComponentType>`：

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

其中有两个条目值得一提，直接引自注册表自己的
注释：

- **`embed`** 映射到 `EmbedBody`（而非 `Embed` MDX 包装器）：加载器
  将 `EmbedBody` 挂载到 `data-island="embed"` 标记上，并从该标记的
  `data-*` 属性读取其配置。
- **`tabs`** 是完全 SSR 渲染的——`Tabs` 标记（ARIA tablist + panels）
  在服务端发出，在客户端仅进行 **DOM 增强**（面板
  内容是任意的 SSR HTML，因此它是被增强，而非重新
  hydration）。它的条目存在*"purely to satisfy `Record<IslandName, …>`."*

第三组是 **仅 SSR 且不是 island**：
[`Steps`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx)
/ `Step`（一个静态的带编号步进器）和
[`PageNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/PageNav.tsx)
（上一页/下一页翻页器）是不含任何客户端 JS 的纯标记——它们被导出并
在 MDX/布局中使用，但它们从不出现在 `ISLAND_REGISTRY` 中。标题锚点
也类似：标记是仅 SSR 的，由一个委托的内联脚本处理
点击（参见
[`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx)）。

## MDX 元素映射

当 dwar 编译某个页面的 MDX 时，它用 rang 的
`defaultMdxComponents` 来渲染它——即
[`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
中那份元素名 → 组件的注册表。
它将 MDX 发出的内建标签（`h1`–`h6`、`a`、`img`、`p`、`pre`、`code`、
列表、`blockquote`、表格、`hr`）映射到来自
[`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
和
[`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx)
的带样式渲染器上，外加 setu 发出的那些**首字母大写**组件，以便它们也经由该映射进行路由：
`Callout`、`Embed`、`SourceLink`、`MemberMeta`、`MemberHeading`、`Steps` /
`Step`，以及 `Tabs` / `Tab`。（关于这些组件面向用户的一面，参见
[Callouts](/authoring/callouts) 和 [Tabs](/authoring/tabs)。）

## dwar 如何消费它

dwar 在渲染时和打包时都会导入 rang：

- **SSR。**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  导入 rang 的 `Layout` 和外壳 island（`Sidebar`、`MobileNav`、`TOC`、
  `TocPopover`、`CtrlK`、`ThemeToggle`、`Settings`），通过 `renderIsland` 把每一个
  包裹进一个 `data-island` 标记，为每个页面的载荷记录其 props，
  并把包裹好的节点交给 `Layout` 的插槽。
- **Hydration。**
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)
  运行一次拆分式 esbuild 构建，将每个 island 作为一个入口点。
  esbuild 把跨入口共享的代码（Preact、rang 的注册表、共享
  辅助函数）提取到一个 `chunk-<hash>.js` 中，供每个 island 块导入——这
  正是将发出的 `_islands/` 载荷从约 4.74 MB 削减到约 0.40 MB 的原因。island
  源从 dwar 自己的 `node_modules` 中导入
  `@clean-jsdoc-theme/rang`。

## 阅读源码

维护者希望把你引向代码——从这里开始：

- **包目录：**
  [packages/rang](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang)
  ·
  [packages/rang/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang/src)
- **公共出口（barrel）：**
  [`src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/index.ts)
- **两份注册表：**
  [`islands.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/islands.ts)
  （island 名称 → 组件映射）·
  [`mdx-components.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/mdx-components.tsx)
  （MDX 元素 → 组件映射）
- **外壳：**
  [`Layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Layout.tsx)
  ·
  [`Header.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Header.tsx)
  ·
  [`Footer.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Footer.tsx)
- **MDX 渲染器 + 样式辅助函数：**
  [`mdx-tags.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-tags.tsx)
  ·
  [`mdx-utils.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/mdx-utils.tsx)
  ·
  [`CodeBlock.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/CodeBlock.tsx)
  ·
  [`lib/cn.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/lib/cn.ts)
- **dwar 如何使用它：**
  [`dwar/src/layout.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/layout.tsx)
  ·
  [`dwar/src/islands-bundle.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/dwar/src/islands-bundle.ts)

## 下一步

- [rang Examples](/packages/rang-examples) —— 使用这些导出的具体代码片段。
- [dwar Overview](/packages/dwar-overview) —— 渲染并打包 rang 的那个包。
- [utils Overview](/packages/utils-overview) —— rang 所导入的浏览器安全契约。
