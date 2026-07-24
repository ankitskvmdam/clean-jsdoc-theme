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

> [!IMPORTANT]
> **这一统一模型是 JSDoc 模板的行为。** TypeDoc 输出以不同的方式构建它的
> **API 侧边栏** —— 一种 module/folder 层级结构，而非 kind/category
> 分组 —— 因此 `@category`、`@order`、`sectionOrder` 和 `clubSidebarItems`
> 对 **TypeDoc 的 API 树没有任何效果**。如果你正在配置的是这个，请直接跳到
> [TypeDoc flavor](#typedoc-flavor)。Doc groups（`docGroups` + frontmatter）、
> `menu` 以及 tutorials 对两者的效果依然相同。

> [!NOTE]
> 下面这两个源标签 —— `@category` 和 `@order` —— 在
> [Custom tags](/components/overview) 中有深入的文档说明。本页面讲的是它们（以及
> config 选项）如何馈入侧边栏；它不会完整地重新记录这些标签的语法。
> 除非另有说明，直到 [TypeDoc flavor](#typedoc-flavor) 之前的所有内容
> 都描述的是 **JSDoc 模板**。

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

> [!NOTE]
> **仅 JSDoc，且仅作用于侧边栏。** `@category` 仍会被 TypeDoc 桥接器
> 解析（如 [TypeDoc flavor](#typedoc-flavor) 中所记录），但它不会移动
> 一个 symbol 在 TypeDoc API 侧边栏中的位置 —— 那个侧边栏是一种 module
> 层级结构，而非 category 分组。

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

> [!NOTE]
> **仅 JSDoc，且仅作用于侧边栏。** `@order` 对 TypeDoc 的 API 侧边栏排序
> 没有任何效果 —— 在一个 module 内部的排序是由 kind 固定下来的（见
> [TypeDoc flavor](#typedoc-flavor)）。

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

> [!NOTE]
> **仅 JSDoc，且仅作用于 API 树。** `clubSidebarItems` 对 TypeDoc API
> 侧边栏没有任何效果（见 [TypeDoc flavor](#typedoc-flavor)）。

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

这里也值得了解一下 [`collapsibleSidebarSections`](/theme/configuration#collapsiblesidebarsections)。
它不改变*什么*被分组——而是把渲染出的顶层分节标题本身（kind labels、
`@category` 分组、doc 分组、`Tutorials`、`Source Files`）变成默认展开的折叠
开关。它接受 `true`/省略（所有分节）、`false`（都不折叠），或一个精确、区分
大小写的标签 `string[]`。与本页其他所有杠杆不同，它在 **JSDoc 和 TypeDoc
下的行为完全一致**——见下方 [TypeDoc flavor](#typedoc-flavor)。

## 杠杆 5 —— `sectionOrder`

> [!NOTE]
> **仅限 JSDoc。** `sectionOrder` 对 TypeDoc 完全没有任何效果 —— TypeDoc
> 的 API 树是 module 层级结构，其中的 doc 分组由
> [`docGroups`](/theme/configuration#docgroups) 排序，而非 `sectionOrder`。
> 见 [TypeDoc flavor](#typedoc-flavor)。

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
就使用了一个 `menu`。这对 TypeDoc 同样适用。

## TypeDoc flavor

TypeDoc 输出并**不**对它的**API 侧边栏**使用上面的统一 group/order
模型。它镜像的是 TypeDoc 自身的默认主题 —— 一种从你的源代码布局构建出的
module/folder 层级结构，而非来自 `@category` 或 kind buckets：

- **顶层 = 你的 documents 在前，然后是 folders 和 modules**，按字母顺序
  排列 —— 没有顶层的 kind sections。
- **Folders** 镜像你源代码的目录结构。只有单个 child 的 folder 会被
  **合并**进那个 child（`compactFolders`）—— 例如 `base/` 下的单个
  `Component` 会显示为 `base/Component`。
- **每个 module 都是一个可点击、可展开的节点** —— 它的 label 打开该
  module 的页面，chevron 展开以显示成员。
- **成员嵌套在其所属的 module 下**，按 **kind** 排序（Enumerations →
  Classes → Interfaces → Type Aliases → Variables → Functions），然后
  按字母顺序。侧边栏中没有按 kind 划分的子标题。
- **Namespaces** 以同样的方式嵌套为节点。

完整的渲染细节（Hierarchy/Implements sections、`@inheritDoc` 等）见
[TypeDoc Getting Started](/theme/typedoc-getting-started#the-typedoc-sidebar)。

### 哪些杠杆仍适用于 TypeDoc

| Lever | 对 TypeDoc **API** 树的影响 | 在其他地方的效果 |
| ----- | ----------------------------------- | ----------------- |
| `@category` | 无 —— 不会在 module 层级结构中移动一个 symbol | 仍会被解析 |
| `@group` | 无 —— 不会驱动侧边栏 | 仍会被解析（见 [TypeDoc Getting Started](/theme/typedoc-getting-started#typedoc-specific-rendering)） |
| `@order` | 无 —— 一个 module 内部的 kind 顺序是固定的 | — |
| `sectionOrder` | 无 | 无 —— 请改用 `docGroups` 为 **doc 分组**排序 |
| `clubSidebarItems` | 无 | — |
| `docGroups` / doc frontmatter `group`/`order` | — | **有效** —— 对正文 doc 分组排序，渲染在 API 层级结构之前 |
| `menu` | — | **有效** —— 与 JSDoc 相同的顶部区域行为 |
| `collapsibleSidebarSections` | **有效** —— 与 JSDoc 相同的折叠开关行为 | **有效** |
| Tutorials | — | **仍会渲染** |

> [!NOTE]
> 与 `@category`、`@order`、`sectionOrder`、`clubSidebarItems` 不同——它们在
> 这里都是无效的——
> [`collapsibleSidebarSections`](/theme/configuration#collapsiblesidebarsections)
> 在 TypeDoc 下**确实生效**：它会把同样渲染出的顶层分节标题
> （module/kind/doc-group 标签）变成可折叠的标题，其解析依据是本次构建中
> 实际渲染出的分节。

> [!NOTE]
> 恢复一个由 `@category`/`@group` 驱动的 TypeDoc API 侧边栏（匹配
> TypeDoc 自身可选启用的 category/group 导航），目前**尚不可配置**。

## 把它们组合起来

一份贴近现实的混合 config。请注意，下面的 `sectionOrder` 和
`clubSidebarItems` 只影响 **JSDoc** 标签页的 API 侧边栏 —— 在 TypeDoc
标签页上它们**完全没有效果**（doc 分组顺序来自 `docGroups`，且 API 树始终按
[TypeDoc flavor](#typedoc-flavor) 中描述的 module 层级结构渲染）。

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
  // sectionOrder 在 TypeDoc 下没有效果 —— API 树是 module 层级结构
  //（见上方的 "TypeDoc flavor"），因此此 key 在这里会被忽略。
  sectionOrder: ["Getting Started", "Core", "Classes", "Guides", "Modules"],
  // 在 TypeDoc 标签页上，为正文 doc 分组排序的是 docGroups。
  docGroups: ["Getting Started", "Guides"],
  defaultDocGroup: "Docs",
  clubSidebarItems: true, // 在 TypeDoc 下没有效果
  menu: [
    { id: "home", title: "Home", icon: "lucide:home" },
    { title: "GitHub", link: "https://github.com/you/repo", icon: "simpleicons:github" },
  ],
}
```

</tab>
</tabs>

对于 **JSDoc**，把它与你 classes 上的 `@category Core/Parsing order=1` 以及你
guides 上的 `order:` frontmatter 结合起来，你就能从上到下掌控整个侧边栏。对于
**TypeDoc**，API 树总是按 [TypeDoc flavor](#typedoc-flavor) 中的 module
层级结构渲染 —— 只有你的 doc groups、`menu` 和 tutorials 会响应上面的选项。

## 接下来去哪里

- `@category` / `@order` 标签参考：[Custom tags](/components/overview)。
- 完整的选项列表：[Configuration](/theme/configuration)。
- 本页面串联起来的两条工作流：
  [Build a guides site](/guides/build-a-guides-site) ·
  [Build an API reference](/guides/build-an-api-reference) ·
  [Combine guides + API](/guides/combine-guides-and-api)。
- 完整的 TypeDoc 侧边栏 + 渲染细节：
  [TypeDoc Getting Started](/theme/typedoc-getting-started)。
