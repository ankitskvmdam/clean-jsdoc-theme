---
title: 构建一个指南站点
group: Guides
order: 2
---

# 构建一个指南站点

这是 **prose-first**（正文优先）的工作流：你将主题指向一个手写 Markdown（或
HTML）的文件夹，它便会成为一个完整的文档站点——侧边栏、搜索、主题切换，应有尽有。
无需任何 API reference。你正在阅读的这个站点正是这样构建出来的。

> [!TIP]
> 这个站点本身就是一个可运行的示例。它的 config 是
> [`docs-site/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)，
> 它的页面位于
> [`docs-site/docs/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site/docs)。
> 下面的所有内容都已对照
> [`packages/setu/src/guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
> 中的 bridge 进行了验证。

## 心智模型

将 [`opts.docs`](/theme/configuration#docs) 指向一个 directory。主题会递归地遍历它，
并且 **每个 `.md` / `.markdown` / `.html` 文件都会成为一个 page**。文件在文件夹中
的位置会自动决定两件事：

- 它的 **URL slug**——相对（relative）path，经过 slugify；
- 它的 **sidebar group**——它所在的 directory，经过人性化（humanized）处理。

每个文件的 YAML **frontmatter** 可以 override 其中任意一项（以及另外几项）。根目录
下的 `index.md` 会成为 home page。这就是整个系统。

directory 遍历发生在 bridge 中
（[`collectDocs`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)），
它读取文件并将其交给 setu；setu 自身不做任何磁盘 I/O。只有 `.md`、`.markdown`、
`.html` 和 `.htm` 文件会被采集——`node_modules`、`.git` 以及 dotfiles/dot-dirs 都会
被跳过。

## 设置它

<steps>

<step label="Create a docs folder">

将一些 Markdown 放进一个 directory。布局由你决定：

```sh
docs/
  index.md            # → home page (slug "")
  getting-started.md  # → /getting-started, ungrouped
  guides/
    advanced.md       # → /guides/advanced, group "Guides"
```

</step>

<step label="Point the config at it">

在你的 config 中加入 [`docs`](/theme/configuration#docs)。Tutorials 和 API 是可选
的——单独一个 docs 文件夹就是一个完整的站点。

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    template: "node_modules/clean-jsdoc-theme/dist",
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
</tabs>

</step>

<step label="Build">

照常 build——完整的 toolchain 设置请参阅
[JSDoc Getting Started](/theme/jsdoc-getting-started) 或
[TypeDoc Getting Started](/theme/typedoc-getting-started)。

```sh
npx jsdoc -c jsdoc.json
```

</step>

</steps>

## 一个文件如何成为一个 page

对每个文件，setu 在
[`deriveDocMeta`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
中推导出 page metadata。规则，正如 code 解析它们的方式：

| Field   | 推导方式（首个匹配胜出）                                              |
| ------- | -------------------------------------------------------------------------- |
| `slug`  | frontmatter `slug` → 经过 slugify 的 relative path（无 prefix）；`index` → `""`   |
| `title` | frontmatter `title` → path 的 humanized basename                       |
| `group` | frontmatter `group` → humanized 的 **directory** path → `defaultDocGroup`     |
| `order` | frontmatter `order`                                                        |
| `hidden`| frontmatter `hidden`（default `false`）                                     |

### Slug 来自 path

slug 是去掉扩展名后的 relative path，按每个 segment 经过 `slugifyPath` 处理：转为
lowercase，连续的非字母数字字符折叠为 `-`，再用 `/` 连接。因此
`guides/Advanced Setup.md` → `/guides/advanced-setup`。slug **不带任何 prefix**——
docs 位于干净的、顶级（top-level）的 URL 上（与 tutorials 不同，后者会被强制置于
`tutorials/` 之下）。

### Group 来自 directory

一个文件的 sidebar group 默认是它的 **directory path**，按每个 segment 进行
humanized 处理：`guides/advanced.md` 归入 group **Guides**；
`guides/setup/install.md` 归入嵌套 group **Guides/Setup**（group path 中的一个 `/`
会使其嵌套——参阅[结构化你的侧边栏](/guides/structure-your-sidebar)）。
位于 docs 根目录且没有 frontmatter group 的文件会 fallback 到
[`defaultDocGroup`](/theme/configuration#defaultdocgroup)；如果它也未设置，则该
page 处于未分组（ungrouped）状态（它会落入兜底的 "Docs" section）。

### `index.md` → home page

path 恰好为 `index` 的文件（即 docs 根目录的 `index.md`）会成为 home page：
slug `""`，渲染为 `index.html`。当两者同时存在时，它会 **override**
[`readme`](/theme/configuration#readme) home page。

## Frontmatter override

Frontmatter 是文件开头的一个 `---` block。parser 刻意做得很小——只支持简单的
`key: value` scalar（string / number / boolean），这正是 pipeline 所需要的全部。
被识别的 key：

```markdown
---
title: Advanced Setup
group: Guides
order: 2
slug: guides/advanced
hidden: false
---

# Advanced Setup
...
```

- **`title`**——sidebar 标签以及 page 的 `<title>`。
- **`group`**——sidebar group（override directory）。可以是一个 `/`-path 以进行
  嵌套。
- **`order`**——group 内的排序键（升序；未设置者排在最后，然后按字母顺序）。参阅
  [结构化你的侧边栏](/guides/structure-your-sidebar)。
- **`slug`**——一个自定义 URL，替换由 path 推导出的那个。
- **`hidden`**——当为 `true` 时，page **会被渲染但被排除在 sidebar 之外**
  （仍可通过直接 link / cross-reference 访问）。

> [!NOTE]
> frontmatter parser 刻意保持极简：nested YAML、lists 以及 multi-line 值 **均不**
> 支持——只支持扁平的 `key: value` scalar。格式错误或未闭合的 block 会被视为没有
> frontmatter，并原样保留在正文中。参阅
> [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
> 中的 `parseFrontmatter`。

## 为 group 排序

两个杠杆，作用于不同的 scope：

- [`docGroups`](/theme/configuration#docgroups) 为 sidebar 中的 **top-level group
  sections** 排序（例如 `["Getting Started", "Guides"]`）。你未列出的 group 会被
  追加到后面，并按字母顺序排列。
- 一个 page 的 frontmatter **`order`** 决定它在其 group **内** 的位置。

这个站点两者都设置了——参阅它的
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)：
`docGroups`（以及 `sectionOrder`）固定了 group 的顺序，而每个 page 的 `order`
frontmatter 则为其内部的 pages 排序。

> [!IMPORTANT]
> `docGroups` 只为 **doc** group 排序，并且会将它们追加到 API kind sections 的
> **之后**。如果你正在将 guides 与某个 API reference 混合，并希望对整个 sidebar 拥
> 有完全的控制——让 guides 与 Classes、Modules 等交错（interleaved）——那么请改用
> [`sectionOrder`](/theme/configuration#sectionorder)。参阅
> [合并 guides + API](/guides/combine-guides-and-api)。

## 接下来去哪里

- 添加一个生成的 reference：[构建一个 API reference](/guides/build-an-api-reference)。
- 在一个站点中同时发布两者：[合并 guides + API](/guides/combine-guides-and-api)。
- 掌握每一个 sidebar 杠杆：[结构化你的侧边栏](/guides/structure-your-sidebar)。
- 每个 option 的详细说明：[配置](/theme/configuration)。
</content>
</invoke>
