---
title: TypeDoc 快速开始
group: Using the Theme
order: 3
---

# TypeDoc 快速开始

对于 TypeScript 项目，本主题以 **TypeDoc 插件** 的形式发布 ——
`@clean-jsdoc-theme/typedoc`。它并不是一个扩展 TypeDoc 默认样式的 CSS
主题；它注册了一个自定义 **输出**，将 TypeDoc 的 reflection 送入与 JSDoc
桥接 *相同* 的 `setu → dwar` 流水线。结果是一个完全相同的
站点 —— SSR HTML、islands、模糊 + 全文搜索、配套的 `.md` —— 由你的
TypeScript 源代码生成。

> [!NOTE]
> **它是如何接入的。** 该插件的
> [`load(app)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/index.ts)
> 声明了一个选项块（`cleanJsdocTheme`，参见
> [`options.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/options.ts)），
> 并通过 `app.outputs.addOutput(...)` 注册了一个名为 `clean-jsdoc-theme`
> 的输出。writer
> ([`write-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/typedoc/src/write-site.ts))
> 将 reflection → doclet → 共享流水线进行适配。因此你通过两种方式来选用它：
> `plugin` 负责加载它，`outputs` 负责开启它。

## 安装与构建

<steps>

<step label="Install">

将 TypeDoc 和本主题的 TypeDoc 插件安装为开发依赖：

<tabs>

<tab label="npm">

```sh
npm install --save-dev typedoc @clean-jsdoc-theme/typedoc
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D typedoc @clean-jsdoc-theme/typedoc
```

</tab>

</tabs>

</step>

<step label="Configure">

添加一个 `typedoc.json`。加载插件，将其选为一个 **输出**，并把主题
选项放在 **`cleanJsdocTheme`** key 下面（即 JSDoc 的 `opts` 在 TypeDoc
中的对应物）：

```json5
{
  entryPoints: ["src/index.ts"],
  tsconfig: "tsconfig.json",
  readme: "README.md",

  // Load the plugin, then select its output to render.
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],

  // Theme options live here.
  cleanJsdocTheme: {
    siteName: "My Library",
  },
}
```

</step>

<step label="Build">

运行 TypeDoc —— 它会把注册的输出渲染到 `outputs[].path`：

```sh
npx typedoc
```

</step>

<step label="Serve">

打开 `dist/index.html`，或者为该文件夹提供服务（Pagefind 的全文索引需要
HTTP 才能加载）：

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> 一个完整、可运行的 TypeDoc 配置位于仓库的
> [`examples/typedoc-basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/typedoc-basic) ——
> 其中的 [`typedoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/typedoc-basic/typedoc.json)
> 是上述配置的参考。

## 选项放在哪里

每个主题选项都与 JSDoc 的完全相同 —— 只是位置不同：放在
**`cleanJsdocTheme`** 下面，而不是 `opts`。完整的列表，连同两种形式并排
展示，都在 [Configuration](/theme/configuration) 页面上。先从这几个开始：

| Option | 它的作用 |
| ------ | ------------ |
| [`siteName`](/theme/configuration#sitename) | 页头标题 —— 纯文本，或一组带 `alt` 后备文本的 `light`/`dark` logo。 |
| [`fonts`](/theme/configuration#fonts) | 覆盖 `heading` / `body`（Google Fonts，已为你加载）以及 `mono`。 |
| [`colors`](/theme/configuration#colors-and-darkcolors) / [`darkColors`](/theme/configuration#colors-and-darkcolors) | 重新着色 light / dark 调色板 —— 仅覆盖 `bg`、`accent`……，其余保持不变。 |
| [`sectionOrder`](/theme/configuration#sectionorder) | 排定顶层 sidebar 区块的顺序。 |
| [`clubSidebarItems`](/theme/configuration#clubsidebaritems) | 将相关条目收拢到一个共享的、可折叠的父项之下。 |
| [`menu`](/theme/configuration#menu) | 固定在 sidebar 上方的自定义链接，每个都带一个 `lucide:` / `simpleicons:` 图标。 |
| [`copyPage`](/theme/configuration#copypage) | 每页的 "copy page" / "open in LLM" 按钮（默认开启）。 |

> [!NOTE]
> 由于 `cleanJsdocTheme` 是一个专用的 namespace，其中未知的 key 只会
> **warn**（并附带一条 "did you mean?" 提示）—— 参见
> [`strict`](/theme/configuration#strict) 以将其升级为 error。

## 多语言

localization 工作流在同一个 `cleanJsdocTheme` 块中声明它的 locale
（`locales` + `defaultLocale`），并通过 `clean-jsdoc` CLI 运行 —— 参见
**[Localize your docs](/guides/localize-your-docs)** 以及
[`locales` / `defaultLocale`](/theme/configuration#localization) 参考。

> [!INFO]
> 目前 TypeDoc 桥接可以 **extract** 翻译目录，但还不能渲染各个 locale 的
> 站点 —— 本地化的 *构建* 暂时只支持 JSDoc。单语言的 TypeDoc 站点已获得
> 完整支持。

## 后续步骤

- **[Build an API reference](/guides/build-an-api-reference)** —— 什么会成为
  一个页面，以及源文件查看器是如何工作的。
- **[Build a guides site](/guides/build-a-guides-site)** 和
  **[Combine guides + API](/guides/combine-guides-and-api)** —— 在同一个站点中
  加入手写的 Markdown。
- **[Structure your sidebar](/guides/structure-your-sidebar)** —— 分组与
  排序的控制项。
- **[Authoring](/authoring/callouts)** —— callouts、steps、tabs 以及 embeds。
- **[Localize your docs](/guides/localize-your-docs)** —— 多语言
  工作流（extract 在 TypeDoc 上可用；本地化构建目前仅支持 JSDoc）。
- **[Packages](/#the-packages)** —— 共享的 `setu → dwar` 流水线（以及
  [`@clean-jsdoc-theme/typedoc`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc)
  插件）在底层是如何工作的。
