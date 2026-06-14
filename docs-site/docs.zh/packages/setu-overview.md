---
title: 概览
group: Packages/setu
order: 20
---

# `@clean-jsdoc-theme/setu`

`@clean-jsdoc-theme/setu` 负责主题管道的前半部分：它将一个
JSDoc/TypeDoc **doclet collection** 转换为结构化的 **`SiteManifest`** —— 页面、
一棵 nav 树，以及将它们串联在一起的链接解析。它是
[dwar](/packages/dwar-overview) 的构建端对应物，dwar 负责将该
manifest 渲染为 HTML。

> [!NOTE]
> **为什么叫这个名字？** *setu*（सेतु）在梵语中意为**桥（bridge）** —— 这很贴切，因为该
> 包将你的原始 doclets 桥接到 renderer 所消费的那个结构化 `SiteManifest`。

唯一的 entry point 是
[`generateSite(collection, opts)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)：

```ts
function generateSite(collection: unknown, opts?: GenerateSiteOptions): SiteManifest;
```

> 如果你只是想使用该主题，你永远不会直接安装这个包 ——
> JSDoc 与 TypeDoc 桥接器会为你调用它。它是一个内部构建块。
> 关于你实际安装的内容，请参阅 [Packages](/#the-packages) 一节；
> 关于调用形态，请参阅 [setu Examples](/packages/setu-examples)。

## setu 为何存在

一次文档构建有两项确实不同的工作：**理解符号**（遍历 doclets、对成员进行分桶、
解析交叉引用、塑造侧边栏）与**渲染像素**（MDX compile、islands、HTML、
搜索索引）。setu 是第一项工作，被隔离出来，以便在没有任何 renderer 在场的情况下也能对其进行推理和测试。

给定一个 doclet collection，`generateSite`
（[`generate-site.ts` 是其引擎](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）
会产出：

- **每个容器符号一个页面。** 容器种类 ——
  `module`、`namespace`、`class`、`interface`、`mixin`、`typedef` —— 各自获得一个
  独立页面，并按该固定顺序枚举（参见
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts) 中的 `CONTAINER_KINDS`）。
  Typedefs 走的是与 classes 完全相同的 `getContainerView` /
  `renderContainerPage` 路径。
- **一个聚合的 “Globals” 页面。** 每一个未获得自己页面的全局作用域符号
  （functions、members、constants、enums、events）都会作为一个合成容器上的成员区段被渲染
  （[`buildGlobalsView`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）。
- **散文 / 指南页面**，来自三个自由格式的来源：项目 README（即
  首页）、一个 docs 目录，以及 JSDoc 教程
  （[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)）。
- **只读的源码查看器页面**，以及从每个成员返回的 `Source: file:line` 链接，
  前提是桥接器提供了项目的源文件
  （[`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)）。
- **nav 树** —— 即侧边栏 —— 按种类或按所撰写的 `@category` 分组为各个区段，
  并按 `sectionOrder` / `@order` 排序
  （[`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）。
- **已解析的交叉引用**，针对每一个 `{@link}` / `@see` / `@tutorial`
  （[`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)）。

## 契约边界

setu 是被刻意围起来的。以下是你可以在源码中验证的边界，它们正是让构建端独立于渲染端的关键。

- **它只发出 Markdown/MDX —— 不发出 HTML。** 每个页面正文都通过
  [`toMdx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts) 序列化，
  它将一棵 mdast 树转换为 MDX 安全的 Markdown。它甚至附带一个自定义链接
  序列化器，*始终*发出资源形式 `[label](url)` 而绝不发出
  自动链接形式 `<url>`，因为裸露的 `<url>` 会被解析为 JSX 并中止
  dwar 的 MDX compile。setu 从不产出最终 HTML；那是 dwar 的工作。
- **它不做任何 I/O。** setu 从不接触文件系统。README 以一个
  字符串的形式到达，docs 与源文件由桥接器预先读取后到达，教程以
  一棵规范化的树到达。`generate-site.ts` 与 `source-view.ts` 都在
  各自的注释中声明该模块是纯函数（无 I/O）—— 它只转换所被
  给定的输入（无 `fs`，无 `cwd`）。
- **它只依赖 `utils`。**
  [`package.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/package.json) 中
  唯一的工作区依赖是 `@clean-jsdoc-theme/utils`（共享的边界契约 —— `SiteManifest`、
  `Page`、`NavNode`、slug 规则）。其余的都是 mdast/hast/markdown
  处理库。setu 从不 import **dwar** 或 **rang**；依赖
  箭头只指向一个方向。

## 两遍链接构建

页面彼此链接，而一个页面可能引用一个枚举在它*之后*的符号。
因此 `generateSite` 分多遍构建
（[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)、
[`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)）：

1. **收集规格（一遍去重）。** 它按顺序遍历 `CONTAINER_KINDS`，
   构建每个容器的视图 + slug，并*合并*（而非丢弃）任何
   在 slug 上发生冲突的后续容器 —— 这样两个 doclet 的成员或
   关系都不会丢失。这是去重发生的唯一地方，因此 registry 与
   渲染出的页面永远不会出现分歧。
2. **填充链接 registry，然后构建解析器。** registry 是从*恰好存活下来的那组规格*
   填充的，并在任何页面正文渲染之前被完全填充 —— 因此前向引用得以解析。解析器
   （`makeLinkResolver`）处理精确 longnames、双向的 `module:` 前缀回退，
   以及一个唯一短名回退，当裸名歧义时它拒绝猜测。
3. **渲染。** 每个存活下来的视图只被渲染一次（绝不重建），把
   源码链接解析器、由 registry 支持的链接解析器，以及
   `@tutorial` 解析器穿入 mdast。

manifest 上的 `buildId` 是一个对页面的
slugs + 正文做的 `{timestamp}-{hash}` 摘要 —— 内容稳定，因此 dwar 可以正确地破除缓存。

## 返回的内容

`generateSite` 返回一个
[`SiteManifest`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/utils/src/site/manifest.ts)：

```ts
interface SiteManifest {
  pages: Page[];
  nav: NavNode[];
  pkg?: { name?; version?; description?; repository?; homepage? };
  buildId: string;
}
```

该 manifest 是自包含的：dwar 永远不应该重新读取 doclet 数据库。
你把这个对象直接交给 [`dwar.render()`](/packages/dwar-overview)。

## 阅读源码

维护者希望把你引向代码 —— 从这里开始：

- **包目录：**
  [packages/setu](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu)
  ·
  [packages/setu/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src)
- **entry point + 选项：**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
  (`generateSite`、`GenerateSiteOptions`)
- **构建引擎：**
  [`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
  (两遍构建、`assembleNav`、`enumerateLongnamesByKind`、`buildGlobalsView`)
- **容器视图：**
  [`class-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/class-view.ts)
  (`getContainerView`，按种类参数化)
- **散文页面：**
  [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
  (README → 首页，docs → 指南，`tutorialsToDocInputs`)
- **源码查看器：**
  [`source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)
- **交叉引用：**
  [`link-registry.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/link-registry.ts)
- **MDX 序列化：**
  [`mdx.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdx.ts)
  以及
  [`mdast/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu/src/mdast)
  目录

## 下一步

- [setu Examples](/packages/setu-examples) —— 真实的调用形态，来自消费 setu 的两个
  桥接器。
- [dwar Overview](/packages/dwar-overview) —— 渲染
  `SiteManifest` 的那个包。
- [utils Overview](/packages/utils-overview) —— setu 所 import 的共享边界契约。
