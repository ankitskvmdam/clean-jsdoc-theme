---
title: 构建你的侧边栏结构
group: Guides
order: 4
---

# 构建你的侧边栏结构

侧边栏由若干杠杆组装而成，它们全部馈入同一个排序引擎
([`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))。
本页面将它们串联起来：分组从何而来、嵌套如何运作，以及决定顺序的确切规则。一旦你
看清**每个条目都携带一条 `group` 路径和一个可选的 `order`**，其余内容便顺理成章。

> [!NOTE]
> 下面这两个源标签 —— `@category` 和 `@order` —— 在
> [Custom tags](/components/overview) 中有深入的文档说明。本页面讲的是它们（以及
> config 选项）如何馈入侧边栏；它不会完整地重新记录这些标签的语法。

## 统一模型

每个可导航的条目 —— API symbol、指南页面或 tutorial —— 都携带：

- 一条 **`group` 路径**（加粗的顶层标题，可选地带一条 `/`-嵌套的分支），以及
- 一个可选的 **`order`**（分组内部的排序键）。

它们的来源：

| Source        | `group` from                                        | `order` from                       |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| API symbol    | `@category`，否则其 kind label（Classes，…）         | `@category … order=`，否则 `@order`|
| Guide page    | frontmatter `group`，否则目录，否则默认值            | frontmatter `order`                |
| Tutorial      | tutorial 层级（`Tutorials/<parent>/…`）             | 解析得到的树形顺序                 |

正是这一单一抽象，使得一个指南和一个 class 能够共享同一个侧边栏分组：如果两者都解析
到分组 `Core`，它们就会归入同一桶中。

## 杠杆 1 —— 用 `@category` 为 symbol 分组

为源 symbol 打上标签，使其页面进入一个明确的分组，而非其 kind section：

```ts
/**
 * @category Core
 */
export class Parser {}
```

`@category` 接受一条 `/`-路径以进行**嵌套**，外加一个内联的 `order=` 选项：

```ts
/** @category Core/Parsing order=1 */
export class Lexer {}
```

这会把 `Lexer` 放在 **Core ▸ Parsing** 之下，在其子分组中排在首位。两处 parsing 的
细微之处，已在 `parseCategory` 中验证
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))：

- **分组路径**是以空白分隔的 token 的起始连续序列；解析在遇到第一个含 `=` 的 token
  时切换为读取选项。因此 `@category Getting Started order=1` 会按字面名称
  **"Getting Started"** 分组（空格仍是名称的一部分），`order` 为 1。
- **真正进行嵌套的是 `/`**，而非空格。`Core/Parsing` 会嵌套；`Getting Started` 是
  单个扁平分组，其 label 中含有一个空格。

## 杠杆 2 —— 用 `@order` 为任意 symbol 排序

内联的 `order=` 选项仅对*带有* `@category` 的 symbol 起作用。要为身处其 **kind
section** 中的 symbol（一个普通的 `@class`、`@module`、…）定位，请使用独立的
`@order` 标签：

```ts
/**
 * @module config
 * @order 1
 */
```

当两者同时存在时，`@category … order=` 胜过 `@order`（更具体、就地共置的声明）。参见
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
中的 `readOrder`。

> [!NOTE]
> `@category` 和 `@order` 都是 **unknown tags** —— 你的 config 必须设置
> `tags.allowUnknownTags: true`（本 repo 中的每个示例 config 都设置了）。完整语法见
> [Custom tags](/components/overview)。

## 杠杆 3 —— 嵌套分组（`/`-路径）

任何分组路径 —— 来自 `@category` 标签、指南的 frontmatter `group`，或指南所在的目录
—— 都可以使用 `/` 来嵌套。第一段是加粗的顶层标题；更深的段会成为**可折叠的分支
节点**。嵌套由 `buildGroupTree` 构建
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))。

因此 `@category Core/Parsing`、位于 `docs/core/parsing/` 中的指南，以及 frontmatter
`group: Core/Parsing`，都会把页面嵌套到 **Core ▸ Parsing** 之下。

### 叶子与分支的排序（确切规则）

在同一分组层级内，`buildGroupTree` 对同级元素进行排序 —— 它们可以是**叶子**
（实际的页面链接）和**分支**（子分组）—— 规则如下：

1. 按**有效顺序（effective order）**升序。叶子的有效顺序就是它自身的 `order`；而
   **分支**的有效顺序是其内部任意页面中**最小的 `order`**。因此单个嵌套页面上的
   `order=1` 会把它的整个子分组向上托浮。
2. 出现并列时，**叶子排在分支之前**。
3. 然后是首次出现 / 入桶顺序（因此一个未排序的分组保持不变）。

没有 `order` 的页面排在最后（实际上视为 `+∞`），然后按字母顺序。这与指南分组对其
frontmatter `order` 所采用的规则相同。

## 杠杆 4 —— `clubSidebarItems`

[`clubSidebarItems`](/theme/configuration#clubsidebaritems) 会按相关条目 label 中
**第一个 `/` 之前的路径段**，将它们收拢到一个共享的父级之下 —— 例如 `queue`、
`queue/Queue`、`queue/types` 会收拢到一个 `queue` 父级之下。仅被单个条目共享的前缀
会保持扁平。这由 `clubNavTree` 完成
([`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts))。

> [!IMPORTANT]
> 收拢**仅**适用于那些条目**不带任何明确的 `@category` / frontmatter 分组**的桶 ——
> 即 kind-label 回退 sections。一个由 `@category` 路径构建的分组*已经*由
> `buildGroupTree` 进行了嵌套，**不会**被额外收拢。这一点由 `assembleNav` 中的
> `groupEntries.every(e => !e.explicit)` 守卫所验证。简而言之：`@category` 嵌套与
> label 收拢在每个分组上是互斥的。

收拢同样是顺序感知的：一个被收拢的父级按其成员中最小的 `order` 排序，而裸前缀条目
（例如 `queue` module 本身）会成为一个排在首位的 `index` 子项，除非某个明确的
`@order` 把一个同级条目拉到了前面。

## 杠杆 5 —— `sectionOrder`

[`sectionOrder`](/theme/configuration#sectionorder) 对**顶层**分组排序 —— 一个统一的
list，混合了 kind labels、`@category` 名称和 doc-group 名称。

- 列出的 labels 会按你的顺序优先 render。
- 对于 **kind labels** 它同时还是一个过滤器：你省略的某个 kind label 会被**丢弃**。
- **Category / doc 分组永远不会因省略而被丢弃** —— 它们会被追加到列出的 sections
  之后（doc 分组按 [`docGroups`](/theme/configuration#docgroups) 顺序，其余按字母
  顺序）。

关于这如何交错排布正文与 API sections，参见
[Combine guides + API](/guides/combine-guides-and-api)。

## 杠杆 6 —— `docGroups` / `defaultDocGroup`

- [`docGroups`](/theme/configuration#docgroups) 对 **doc-group** sections 排序，它们
  被追加到 API sections **之后**（除非某个 doc 分组也在 `sectionOrder` 中被命名，那
  样它就对自身位置拥有支配权）。
- [`defaultDocGroup`](/theme/configuration#defaultdocgroup) 是当一个指南未声明任何
  分组时所落入的分组 —— 既没有 frontmatter `group`，也没有可据以推导出分组的目录。

在 [Build a guides site](/guides/build-a-guides-site) 中端到端地讲解。

## 杠杆 7 —— `menu`

[`menu`](/theme/configuration#menu) 会用 sections 上方的一个**顶部区域**替换自动生成
的 Home / Source Files 链接，每个条目带一个图标（`lucide:<name>` 或
`simpleicons:<name>`）。当设置了 `menu` 时，它**掌管** home/source 链接 —— 自动的
Home（第一个）和 Source Files（最后一个）条目会被抑制，仅当你将它们列出时才出现
（`{ id: "home" }` / `{ id: "source" }`）；external links 内联出现。menu 下方的
sections **仍然**遵循 `sectionOrder`。参见
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
中的 `resolveMenuItem`；本站点的
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
就使用了一个 `menu`。

## 把它们组合起来

一份贴近现实的混合 config：

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

把它与你 classes 上的 `@category Core/Parsing order=1` 以及你 guides 上的 `order:`
frontmatter 结合起来，你就能从上到下掌控整个侧边栏。

## 接下来去哪里

- `@category` / `@order` 标签参考：[Custom tags](/components/overview)。
- 完整的选项列表：[Configuration](/theme/configuration)。
- 本页面串联起来的两条工作流：
  [Build a guides site](/guides/build-a-guides-site) ·
  [Build an API reference](/guides/build-an-api-reference) ·
  [Combine guides + API](/guides/combine-guides-and-api)。
