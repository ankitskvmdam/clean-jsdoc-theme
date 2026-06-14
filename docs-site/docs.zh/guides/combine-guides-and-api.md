---
title: 整合指南与 API
group: Guides
order: 3
---

# 整合指南与 API

这是本主题的标志性能力：**手写的指南与生成的 API 参考文档同处于一个站点中** ——
一个侧边栏、一个搜索索引、一个 URL 空间。无需部署第二个站点，也不会让你的读者
切换上下文。

你已经见过其中的两个部分：

- [Build a guides site](/guides/build-a-guides-site) —— 来自
  [`docs`](/theme/configuration#docs) 文件夹的正文页面。
- [Build an API reference](/guides/build-an-api-reference) —— 从你的源代码生成的
  页面。

把两者同时开启，它们便会合并。本页面就是讲解其原理的心智模型。

## 一份配置看清全貌

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",

    readme: "./README.md",   // → home page
    docs: "./docs",          // → prose guide pages
    // src above → generated API pages

    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  readme: "README.md",       // → home page
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",          // → prose guide pages
    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
</tabs>

这一次构建会生成指南页面、API 页面、主页，以及（对于 JSDoc，默认情况下）源代码
查看器 —— 全部缝合进同一个导航中。

## 心智模型

一切都汇入**一份扁平的页面列表**以及**一次对 `assembleNav` 的调用**（位于
[`packages/setu/src/generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)）。
来源各不相同，但侧边栏对它们一视同仁：

1. **Home** —— 始终在最前，始终不分组。即 README 主页，**除非**存在 docs 根目录下的
   `index.md`，它会覆盖前者。
2. **Sections**，按生效顺序排列（见下文）。每个顶级分组都是一个加粗的侧边栏标题：
   - **API kind sections** —— Classes、Modules、Namespaces …… 对应未打标签的
     符号；或是你自定义的 `@category` 分组名。
   - **Doc groups** —— 你的指南页面所声明的分组（来自 frontmatter 或目录）。
   - **Tutorials** —— 如果你使用 JSDoc 的 `--tutorials` 目录。
3. **Source Files** —— 始终在最后，始终不分组（JSDoc，当 `outputSourceFiles`
   开启时）。

关键洞见：**一个指南页面的分组与一个 API 符号的 `@category` 是同一类东西。**两者
最终都会变成 `frontmatter.group`，都会送入同一套排序机制。只要共享同一个分组名，
一个指南和一个类就可以处在*同一个*侧边栏分组中。

```text
  README / index.md ──▶ Home
  docs/ folder ───────▶ Doc groups          ┐
  source code ────────▶ API kind sections   │
                        / @category groups   ├─▶  assembleNav  ──▶  one sidebar
  tutorials/ ─────────▶ Tutorials            │
  source files ───────▶ Source Files         ┘
```

## 两者如何一起排序

这是值得用心做对的部分。生效的顶级顺序在
[`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
中构建：

1. **[`sectionOrder`](/theme/configuration#sectionorder) 排在最前**，按你列出的
   顺序排列。它是一份统一的列表 —— 可以列出 API kind 标签（`Classes`）、
   `@category` 分组名，**以及** doc-group 名，随你任意穿插。
2. 对于 **kind 标签**，`sectionOrder` 既是过滤器*又*是顺序 —— 你省略掉的某个 kind
   标签会**从侧边栏中移除**。
3. **category 与 doc 分组绝不会因被省略而移除**。任何未在 `sectionOrder` 中列出的
   分组，都会被追加到已列出 sections 的*后面* —— 先按
   [`docGroups`](/theme/configuration#docgroups) 顺序排列 doc 分组，再按字母顺序
   排列其余的。
4. **Home** 始终在最前、**Source Files** 始终在最后，与 `sectionOrder` 无关。

> [!IMPORTANT]
> 由于 `sectionOrder` 在一份列表里把 doc 分组*和* kind 标签混在一起，它正是实现
> 真正穿插的工具 —— 例如 **Getting Started**（一个指南分组），然后 **Classes**
> （API），然后 **Guides**（更多正文），再然后 **Modules**。本站点正是这么做的；
> 参见其
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)。
> 只有当你想对 doc 分组排序、却让 API sections 保持默认时，才使用 `docGroups`。

### 在一个分组内部

- **API symbols** 按其 `@order` / `@category … order=` 排序，再按字母顺序 ——
  一个未打标签的 kind section 保持纯字母顺序。
- **Guide pages** 按其 frontmatter 中的 `order` 排序，再按标题排序。
- **Tutorials** 保持其解析出的树形顺序。

更深层的机制 —— 嵌套的 `/`-路径分组、`clubSidebarItems`、叶子与分支的排序 ——
在 [Structure your sidebar](/guides/structure-your-sidebar) 中讲解。

## 主页，一次性敲定

当你整合多个来源时，可能有不止一样东西*可以*成为主页。其优先级（参见
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
中的 `generateSite`）：

1. docs 根目录下的 **`index.md`**（slug 为 `""`，`kind: 'index'`）—— 若存在则
   胜出。
2. 否则使用 **`readme`** 的 HTML。

因此，`docs/index.md` 让你能够写一个量身定制的着陆页，同时仍把 `README.md`
用作 npm/GitHub 的 readme。

## 冲突会被解决，绝不致命

所有页面共享一个 URL 空间，因此 slug 必须唯一。setu 按固定顺序认领 slug ——
**API 页面优先**，然后是 docs，然后是 tutorials，最后是源代码页面 —— 任何后来的、
其 slug 已被认领（或会遮蔽主页）的页面都会**带着一条警告被跳过**，绝不会崩溃。
因此，如果某个指南的 slug 恰好与某个生成的类页面冲突，API 页面胜出，该指南被舍弃
（请重命名它，或设置一个 frontmatter `slug`）。已在
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
的冲突处理逻辑中得到验证。

## 两个部分之间的交叉链接

由于这是一个站点，链接自然就能用。从一个指南出发，按 slug 链接到某个生成的页面；
从一条文档注释出发，使用 `{@link}` / `@tutorial`，setu 会把它解析到正确的页面
（doc 页面以 slug 为键，tutorials 以名称为键 —— 参见
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
中的解析器）。

## 接下来去哪里

- 精细调整合并后的侧边栏：[Structure your sidebar](/guides/structure-your-sidebar)。
- 符号上的 group/order 标签：[Custom tags](/authoring/custom-tags)。
- 每个选项的详细说明：[Configuration](/theme/configuration)。
