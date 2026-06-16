---
title: 构建 API 参考文档
group: Guides
order: 1
---

# 构建 API 参考文档

这是**纯 API** 工作流：将工具指向你的源代码，让它
根据你的文档注释生成一个参考文档站点 —— 每个 class、module、
namespace 等各占一个页面，外加一个可选的源码文件查看器。
[API demo](/api-docs/) 就是用它构建的，使用了
[`docs-site/jsdoc.api.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.api.json)。

> [!TIP]
> 还有手写的指南？你不必二选一 —— 参见
> [Combine guides + API](/guides/combine-guides-and-api)，在一个站点中同时
> 发布两者。

## 设置

完整的工具链设置位于快速开始指南中；本页聚焦于
什么会成为页面以及源码查看器如何工作。选择你的工具：

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

将 `source.include` 指向你的代码。安装 + 构建步骤参见
[JSDoc Getting Started](/theme/jsdoc-getting-started)。

```json5
{
  source: { include: ["./src", "./README.md"] },
  // Required: pre-renders Markdown in your doc comments to HTML.
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> **`plugins/markdown`** 插件是必需的。没有它，构建会立即失败
> —— 主题期望你的文档注释 Markdown 已经渲染为 HTML。

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

将 `entryPoints` 指向你的代码并加载主题插件。完整设置参见
[TypeDoc Getting Started](/theme/typedoc-getting-started)。

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</tab>
</tabs>

## 什么会成为页面

setu 会枚举你已记录文档的符号，并将每一个转换成一个页面。能获得
**自己独立**页面的种类是**容器种类（container kinds）**，按以下顺序构建（参见
[`packages/setu/src/index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
中的 `CONTAINER_KINDS`）：

| Kind        | Sidebar section |
| ----------- | --------------- |
| `module`    | Modules         |
| `namespace` | Namespaces      |
| `class`     | Classes         |
| `interface` | Interfaces      |
| `mixin`     | Mixins          |
| `typedef`   | Typedefs        |

每一个都会通过同一条容器路径渲染出一个页面，其成员
会归入各个区块（section）。**Typedefs 是一等公民** —— 它们走的是
完全相同的 `buildContainerPage` 路径，因此一个 typedef 的 `@type`、`@property` 列表，
以及（对于函数签名 typedef）`@param`/`@returns` 都会渲染在它的页面上。

> [!NOTE]
> 上面的顺序同时也是 **slug 冲突优先级**：当两个符号
> 想要占用同一个 slug 时，靠前的种类胜出（因此 `module` 会击败靠后的
> `class`）。已在 `CONTAINER_KINDS` 排序以及
> [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
> 中的去重过程中验证。

### Globals 页面

每一个**全局作用域（global-scope）**且*尚未*获得自己页面的符号 ——
functions、members、constants、enums、events —— 都会被收集到单个
合成的 **Globals** 页面（slug 为 `global`）上。被排除的种类恰好是上面的容器种类
加上 `typedef`，因为它们已经独立渲染。如果没有
符合条件的 globals，则不会生成 Globals 页面。参见
[`generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
中的 `buildGlobalsView`。

没有任何区块映射的符号种类会落入一个兜底的 **Other** 区块，
追加在最后 —— 这是一个在实践中为空的安全网。

## 源码文件查看器

当源码查看开启时，主题会将每个项目源码文件渲染为一个只读的、
语法高亮的查看器页面，构建一个 **Source Files** 索引，并
通过 `Source: file:line` 链接将每个已记录文档的成员链接到其声明。

这受 JSDoc 的 [`outputSourceFiles`](/theme/configuration#outputsourcefiles) 控制
（默认**开启**）。这是一个仅 JSDoc 适用的选项，位于 `templates.default` 之下：

```json5
// jsdoc.json — turn the source viewer OFF
templates: { default: { outputSourceFiles: false } }
```

链接是如何解析的（参见
[`packages/setu/src/source-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/source-view.ts)）：

- 每个文件都会在 `source/<slugified-path>` 处成为一个隐藏的 `kind: 'source'` 页面；
  语言根据扩展名检测（Monaco id —— `js`/`mjs`/`jsx` →
  `javascript`，`ts`/`mts`/`tsx` → `typescript` 等）。
- 一个成员的 `Source:` 链接指向锚定到某一行（`#L<n>`）的文件页面。
  **默认**情况下，它会落在实际**声明**的第一行，
  跳过前导的文档注释块。设置
  [`sourceLinkToComment`](/theme/configuration#sourcelinktocomment)（`true`）可改为落在
  注释的起始行（v5 之前的行为）。
- "Source Files" 索引在侧边栏中始终位于最后。你也可以用 `{ id:
  "source" }` 将它呈现为一个菜单项（参见
  [`examples/basic/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json)）。

> [!CAUTION]
> `outputSourceFiles` 和 `sourceLinkToComment` 选项**仅 JSDoc 适用** ——
> 它们位于 `templates.default` 之下，而不是 `opts`/`cleanJsdocTheme` 之下。TypeDoc
> 项目没有这些选项。

## 为 API 侧边栏排序

默认情况下，各个种类区块按固定顺序渲染（Classes、Modules、
Namespaces、Mixins、Interfaces、Typedefs、Globals 等）。用
[`sectionOrder`](/theme/configuration#sectionorder) 覆盖它，并在你的符号上使用 `@category` / `@order`
标签进行更精细的控制。这本身是一个独立的主题 ——
[Structure your sidebar](/guides/structure-your-sidebar) 涵盖了每一个调节手段。

## 接下来去哪里

- 在参考文档旁边添加手写指南：
  [Combine guides + API](/guides/combine-guides-and-api)。
- 自定义源码标签（`@category`、`@order`）：[Custom tags](/components/overview)。
- 每个选项的详细说明：[Configuration](/theme/configuration)。
- 包的内部实现：[Packages](/#the-packages)。
