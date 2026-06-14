---
title: clean-jsdoc-theme
---

# clean-jsdoc-theme

[![sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ankitskvmdam)
[![npm version](https://img.shields.io/npm/v/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![npm downloads](https://img.shields.io/npm/dm/clean-jsdoc-theme.svg?logo=npm&color=005bff)](https://www.npmjs.com/package/clean-jsdoc-theme)
[![GitHub stars](https://img.shields.io/github/stars/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme)
[![Contributors](https://img.shields.io/github/contributors/ankitskvmdam/clean-jsdoc-theme.svg?logo=github)](https://github.com/ankitskvmdam/clean-jsdoc-theme/graphs/contributors)
[![License](https://img.shields.io/npm/l/clean-jsdoc-theme.svg?color=005bff)](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/LICENSE)

**clean-jsdoc-theme** 是面向 JavaScript 和 TypeScript 项目的一套完整文档解决方案
——不只是给 JSDoc 的输出刷一层漆。把它指向一个 **JSDoc** _或_ **TypeDoc** 项目，
它在底层只用这些工具来收集你的源码注释；从那之后便由它接管，为你的 API 构建出一个
结构化模型，并渲染出一个快速、现代的静态站点——server-rendered HTML、按需 hydration
的交互式 islands、内置的模糊命令面板（`Ctrl K`）、全文搜索，以及一流的浅色与深色主题。

它同样为 LLM 而生。在每个页面旁边，它都会产出一份配套的 `.md`，其撰写方式力求让大语言
模型能够轻松阅读和理解——也就是说，你的 API 参考文档对 AI 的可读性与对人类一样高。每个
API 页面还带有一键操作，可以复制那份 Markdown，或直接在 Claude、ChatGPT 或 Perplexity
中打开该页面（若你不愿意，这些都可以 opt-out）。

## 你能获得什么

### 两种搜索，零配置

一个 `Ctrl K` 模糊命令面板，会在标题、描述和整页文本中进行排序——并能按名称直接 deep-link
到任意 class member。只需一个开关即可启用可选的 Pagefind 全文索引。

### 正文与 API 同处一站

手写的 Markdown 指南与从你的 JSDoc 或 TypeDoc 注释自动生成的参考文档并排而立——一个侧边栏、
一个搜索索引、一套 URL 空间。把它指向一个装着 Markdown 文件的文件夹，文件夹的布局再加上
少量 frontmatter，就构成了你的导航——本站的正文页面，包括你正在阅读的这一页，正是如此。
`{@link}` 与 `@see` 会解析为真实的跨页 anchor，每个 member 都会链接到它确切的源码行。

### 丰富的交互式内容

带标签页的代码块、复制到剪贴板、信息与警告 callouts、沙箱化的实时 embeds（CodePen 及同类），
以及一个由 Monaco 驱动的源码查看器，它会精确打开你所链接的那一行。

### 快速且无框架

带按需 hydration 的 Preact islands 的 server-rendered HTML——每个 island 只会发送到
用到它的页面。无需通过网络传输任何 client framework，也无需维护任何 build 配置。

### 浅色与深色，开箱即用

基于 OKLCH 调色板的一流浅色与深色主题——无需任何 CSS。想用时随时带上你自己的站点名称或
logo、Google Fonts、侧边栏菜单，以及自定义 CSS/JS。

### 可发布为任意语言

内置 localization：声明你的 locales，`clean-jsdoc` CLI 会为每种语言构建一个静态站点——
包括翻译后的 UI、API 描述和正文，并配有 header 语言切换器、按语言的字体，以及用于 SEO 的
`hreflang`。参见 [Localize your docs](/guides/localize-your-docs)。

### 为 LLM 而建

每个页面都会产出一份为机器阅读而撰写的配套 `.md`，外加可 opt-out 的 "copy page" 以及
"open in Claude / ChatGPT / Perplexity" 操作——这样 AI 读到的就是你的用户所读的同一份
参考文档。

### 开箱即用的 AI skill

一个可下载的 [**skill**](/theme/llm-skill)，能把任何 coding assistant 变成
`clean-jsdoc-theme` 专家——把你的 agent 指向它，然后放松一下，它会在第一次就为你配置好
config、撰写好指南，并把侧边栏组织得井井有条。无需 prompt-engineering，无需猜测。

## 这些包

`clean-jsdoc-theme` 并非单个模板。在底层，它是一小组职责单一的包，串接成一条单向的
`setu → dwar` 管道：你的源码注释从一端流入，一个快速、静态、对 LLM 友好的站点从另一端
流出。由于这个核心是共享的，同样的部件同时支撑起 JSDoc 与 TypeDoc 两个入口。

大多数用户从不直接接触它们——你安装一个[入口](#entry-points)，设置几个
[选项](/theme/configuration)，就搞定了。但每一个构建块都**发布到了 npm**，有文档，且可复用。

![Build pipeline: JSDoc / TypeDoc → setu.generateSite() → SiteManifest → dwar.render() (with components from rang) → static site](/assets/build-pipeline.svg)

### 核心管道

**setu** 把你的注释变成一个 `SiteManifest`；**dwar** 使用 **rang** 提供的 Preact
components 把那份 manifest 渲染为 HTML/CSS/JS；**utils** 持有定义边界契约的共享 types 和
Zod schemas。

| Package | 它做什么 | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/utils`](https://www.npmjs.com/package/@clean-jsdoc-theme/utils) | 共享 types、Zod schemas，以及每个其他 package 都据以构建的 `SiteManifest` 契约。 | [Overview](/packages/utils-overview) · [Examples](/packages/utils-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/utils) |
| [`@clean-jsdoc-theme/setu`](https://www.npmjs.com/package/@clean-jsdoc-theme/setu) | 把 JSDoc doclets 处理成 pages、nav 和交叉解析的 links——产出 `SiteManifest`。不做任何 I/O。 | [Overview](/packages/setu-overview) · [Examples](/packages/setu-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/setu) |
| [`@clean-jsdoc-theme/rang`](https://www.npmjs.com/package/@clean-jsdoc-theme/rang) | Preact 组件库、MDX component map 和 island registry——dwar 为 SSR 和 hydration 打包的 UI。 | [Overview](/packages/rang-overview) · [Examples](/packages/rang-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/rang) |
| [`@clean-jsdoc-theme/dwar`](https://www.npmjs.com/package/@clean-jsdoc-theme/dwar) | 把一个 `SiteManifest` 渲染为内存中的 HTML/CSS/JS（Preact + MDX + utility CSS + esbuild islands），外加一个 Pagefind hook。纯函数。 | [Overview](/packages/dwar-overview) · [Examples](/packages/dwar-examples) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/dwar) |

### Entry points

这些才是你真正安装的东西——每一个都把你的文档送入同一个 `setu → dwar` 核心，JSDoc 通过
`publish` bridge，TypeDoc 通过一个注册的 output。

| Package | 它做什么 | Getting started | Source |
| --- | --- | --- | --- |
| [`clean-jsdoc-theme`](https://www.npmjs.com/package/clean-jsdoc-theme) | JSDoc 模板。JSDoc 调用它的 `publish()` bridge，由后者编排 setu → dwar 并写出文件。 | [JSDoc Getting Started](/theme/jsdoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/clean-jsdoc-theme) |
| [`@clean-jsdoc-theme/typedoc`](https://www.npmjs.com/package/@clean-jsdoc-theme/typedoc) | TypeDoc 插件。注册一个 `clean-jsdoc-theme` output，运行 reflection → setu → dwar。 | [TypeDoc Getting Started](/theme/typedoc-getting-started) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/typedoc) |

### Localization

把你的文档发布为多种语言。**aadesh** 是驱动 extract → translate → build 工作流的
`clean-jsdoc` CLI；**bhasha** 是纯粹、浏览器安全的 i18n 核心（catalog、translator、
key scheme），由 build 和 UI 共享。从 [Localize your docs](/guides/localize-your-docs) 开始。

| Package | 它做什么 | Docs | Source |
| --- | --- | --- | --- |
| [`@clean-jsdoc-theme/aadesh`](https://www.npmjs.com/package/@clean-jsdoc-theme/aadesh) | `clean-jsdoc` localization CLI——extract、translate-prompt、validate，并为每个 locale 构建一个站点。 | [Overview](/packages/aadesh-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh) |
| [`@clean-jsdoc-theme/bhasha`](https://www.npmjs.com/package/@clean-jsdoc-theme/bhasha) | 同构的 i18n 核心：chrome catalog、`t` translator、`LanguageProvider`，以及 API key/hash scheme。 | [Overview](/packages/bhasha-overview) | [GitHub](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha) |

这些边界刻意是单向的——**setu** 从不 import dwar 或 rang，**dwar** 只消费
`SiteManifest`，并且 `render()` 是纯函数——正是这一点让两个 entry points 能够共享同一个
rendering 核心而无任何重复逻辑。想了解项目为何这样拆分，参见
[Overview](/theme/overview)；想把手写指南与你生成的参考文档结合起来，参见
[Combining guides and API](/guides/combine-guides-and-api)。

## 接下来去哪

- **Getting Started** ——安装它，并把 [JSDoc](/theme/jsdoc-getting-started) 或
  [TypeDoc](/theme/typedoc-getting-started) 指向你的项目。
- **[API Reference](/api-docs/)** ——一个由主题生成的 API 参考文档的实时示例，构建自一个
  小型 sample module。
