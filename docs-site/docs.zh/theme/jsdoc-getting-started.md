---
title: JSDoc 快速开始
group: Using the Theme
order: 2
---

# JSDoc 快速开始

`clean-jsdoc-theme` 是一个 **JSDoc template**。JSDoc 做它一贯做的事 ——
解析你的 source 并收集你的 doc comments —— 然后把控制权交给 template 的
`publish` function，主题正是从这里接手并构建静态站点。你只需将 JSDoc 指向
该主题，就大功告成了。

> [!NOTE]
> **它是如何接入的。** JSDoc 通过调用 template 导出的 `publish` function 来
> 加载它 —— 在这里就是
> [`publish(data, opts, tutorials)`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)
> （即 package 的 `main`，`dist/publish.js`）。它接收你的 doclet collection，
> 并将其送入 `setu → dwar` pipeline。关于每个阶段各自的作用，请参阅
> [Packages](/#the-packages)。

## 安装与构建

<steps>

<step label="Install">

将 JSDoc 和主题安装为 dev dependencies：

<tabs>

<tab label="npm">

```sh
npm install --save-dev jsdoc clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add -D jsdoc clean-jsdoc-theme
```

</tab>

</tabs>

</step>

<step label="Configure">

在你的 project root 中添加一个 `jsdoc.json`。一个虽小但贴近实际的起点：

```json5
{
  source: { include: ["./src", "./README.md"] },

  // 必需 —— 请参阅下方警告。
  plugins: ["plugins/markdown"],

  opts: {
    // 将 JSDoc 指向主题。等同于 CLI 上的 `jsdoc -t <path>`。
    template: "node_modules/clean-jsdoc-theme/dist",
    destination: "dist",
    recurse: true,
    readme: "./README.md",
    siteName: "My Library",
  },
}
```

> [!WARNING]
> **`plugins/markdown`** plugin 是必需的。在主题看到之前，JSDoc 就已经把你
> doc comments 中的 Markdown 渲染为 **HTML**，而主题消费的正是该 HTML（参见
> [`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)）。
> 缺少它，descriptions 会以原始、未格式化的 text 形式到达。

</step>

<step label="Build">

针对该配置运行 JSDoc：

```sh
npx jsdoc -c jsdoc.json
```

</step>

<step label="Serve">

站点会被写入 `dist/`。打开 `dist/index.html`，或者将该文件夹作为服务提供
（Pagefind 的全文索引需要 HTTP 才能加载）：

```sh
npx serve dist
```

</step>

</steps>

> [!TIP]
> 一个完整、可运行的 JSDoc setup 位于仓库的
> [`examples/basic`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/basic) ——
> 它的 [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/examples/basic/jsdoc.json)
> 和 source comments 是本页所有内容的参考。

## 选项放在哪里

主题选项位于 `jsdoc.json` 中的 **`opts`** 之下，与 JSDoc 自身的选项并列。
下面是你最先会用到的几个 —— 完整列表（并排展示 TypeDoc 形式）见
[Configuration](/theme/configuration) 页面。

| Option | 它的作用 |
| ------ | ------------ |
| [`siteName`](/theme/configuration#sitename) | Header 标题 —— 纯 text，或一组带 `alt` 后备文本的 `light`/`dark` logo。 |
| [`fonts`](/theme/configuration#fonts) | 覆盖 `heading` / `body`（Google Fonts，会为你加载）和 `mono`。 |
| [`colors`](/theme/configuration#colors-and-darkcolors) / [`darkColors`](/theme/configuration#colors-and-darkcolors) | 重新为 light / dark 调色板着色 —— 只覆盖 `bg`、`accent`、…，其余保持不变。 |
| [`sectionOrder`](/theme/configuration#sectionorder) | 排定顶层 sidebar sections 的顺序。 |
| [`clubSidebarItems`](/theme/configuration#clubsidebaritems) | 将相关条目归拢到一个共享的、可折叠的 parent 之下。 |
| [`menu`](/theme/configuration#menu) | 固定在 sidebar 上方的自定义 links，每个都带一个 `lucide:` / `simpleicons:` icon。 |
| [`tutorials`](/theme/configuration#tutorials) / [`docs`](/theme/configuration#docs) | 将手写的 Markdown guides 与生成的 reference 并排渲染。 |
| [`copyPage`](/theme/configuration#copypage) | 每个页面的 "copy page" / "open in LLM" 按钮（默认开启）。 |

> [!NOTE]
> 有几个选项 —— [`outputSourceFiles`](/theme/configuration#outputsourcefiles)
> 和 [`sourceLinkToComment`](/theme/configuration#sourcelinktocomment) —— 仅属于 JSDoc，
> 它们位于 `templates.default` 之下，而非 `opts`（主题从
> `jsdoc/env` 中读取它们）。它们在 Configuration 页面上有标注。

## 多语言

主题可以将你的 docs 渲染为**多种语言** —— 每个 locale 一个静态站点
（默认语言位于根目录，其余位于 `/<locale>` 之下），并带有一个 header
语言切换器。你在 `opts.locales` 中声明这些 locale，然后用 `clean-jsdoc` CLI
驱动翻译与各 locale 的构建：

```json5
opts: {
  locales: [
    { code: "en", name: "English" },
    { code: "ja", name: "日本語" },
  ],
  defaultLocale: "en",
}
```

没有 `locales` 的构建不受影响。完整工作流（`extract` → translate →
`build`）请参阅 **[Localize your docs](/guides/localize-your-docs)**，以及
[`locales` / `defaultLocale`](/theme/configuration#localization) 参考。

## 后续步骤

- **[Build an API reference](/guides/build-an-api-reference)** —— 什么会成为一个
  页面、source-file 查看器，以及 `Source: file:line` links。
- **[Build a guides site](/guides/build-a-guides-site)** 和
  **[Combine guides + API](/guides/combine-guides-and-api)** —— 将手写的
  Markdown 加入同一个站点。
- **[Structure your sidebar](/guides/structure-your-sidebar)** —— `@category`、
  `@order`，以及 sidebar 选项。
- **[Authoring](/authoring/callouts)** —— callouts、steps、tabs 以及 embeds，
  你可以在 comments 和正文中使用它们。
- **[Localize your docs](/guides/localize-your-docs)** —— 以多种语言发布站点。
- 偏好 TypeScript？请参阅 **[TypeDoc Getting Started](/theme/typedoc-getting-started)** ——
  相同的 output，不同的 toolchain。
