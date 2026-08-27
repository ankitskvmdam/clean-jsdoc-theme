---
title: 与 LLM 配合使用
group: Using the Theme
order: 5
---

# 与 LLM 配合使用

本主题是**为 LLM 而构建的** —— 每个页面都附带一份配套的 `.md`，以及一个
"copy / open in Claude · ChatGPT · Perplexity" 按钮。本页是这个故事的另一
半：一个独立、可下载的 **skill 文件**，它教会*任何*助手如何**使用并扩展
`clean-jsdoc-theme` 本身**。

它位于仓库的
[`SKILLS/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/SKILLS)
文件夹中，路径为
[`SKILLS/clean-jsdoc-theme/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md)。
把它交给你的编程助手，它就不再靠猜测行事 —— 它会配置主题、撰写你的指南，
并在第一次就正确地组织你的侧边栏。

> [!NOTE]
> 随着项目的成长，`SKILLS/` 正是那些聚焦的 skill 将要存放的地方（按 package
> 划分的 skill、"build a guides site"、"build an API reference" 等等）。如今它
> 提供的是涵盖以下全部内容的总括性 `clean-jsdoc-theme` skill。

## 它是什么

`SKILL.md` 是一份自包含的 Markdown 文档，把整个主题汇集在一处 —— 它是对照源码
验证的，而非依赖模型的记忆。它以 **agent-skill** 格式编写（一个 `name` +
`description` 的 frontmatter 块），因此可以直接放入支持 skill 的 agent 中，但
它本质上就是 Markdown：任何 LLM 都能读取它。

它端到端地涵盖了：

- **Setup** —— JSDoc 和 TypeDoc，附带可运行的最小化配置。
- **每一个 configuration 选项** —— `opts` / `cleanJsdocTheme` 参考文档，外加
  仅限 JSDoc 的 `templates.default` 选项。
- **Authoring** —— callouts、steps、tabs、embeds，以及 `@category` / `@order` /
  `@iframe` 自定义标签，附带其精确的 syntax 规则。
- **docs 目录与 frontmatter** —— 文件如何变成页面。
- **sidebar 模型** —— 那一套统一的 group/order 引擎及其全部调节手段。
- **交叉引用与源码链接**、**LLM 功能**，以及 **theming（主题化）**。
- **package 架构**（`utils` · `setu` · `rang` · `dwar`），供任何扩展内部实现
  的人参考。
- 一个 **gotchas 与 troubleshooting** 章节，针对助手最常犯的错误。

## 它为何重要

`clean-jsdoc-theme` 并不是默认的 JSDoc template，一个依据通用 "JSDoc theme"
知识工作的助手会把细节搞错 —— 它会忘记
[`plugins/markdown`](/theme/jsdoc-getting-started) 是必需的、会遗漏自定义标签
需要 [`allowUnknownTags`](/components/overview)，或者会以为空格能嵌套一条
[`@category`](/components/overview) 路径，而实际上只有 `/` 才可以。

> [!TIP]
> 把 skill 前置，能把一来一回的拉锯（"那个 option 不存在……"、"换成这个试试
> ……"）变成一次正确的首答。这与主题为*你的*文档输出的配套 `.md` 是同一个思路
> —— 把真实信息源提前交给模型，它就能像人一样流畅地读懂你的项目。

## 如何使用它

<steps>

<step label="Download it">

这个 skill 是一个**文件夹** ——
[`SKILLS/clean-jsdoc-theme/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/SKILLS/clean-jsdoc-theme) ——
一份精简的 `SKILL.md` 加上按需加载的 `reference/` 文件（助手只读取它需要的那
一部分）。把整个文件夹抓取下来：

```sh
npx degit ankitskvmdam/clean-jsdoc-theme/SKILLS/clean-jsdoc-theme clean-jsdoc-theme
```

或者直接打开
[GitHub 上的 `SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md)
并复制它 —— `SKILL.md` 对大多数问题来说都是自给自足的，其余的则通过链接指向
reference 文件。

</step>

<step label="Give it to your assistant">

挑选与你的配置相符的方式：

<tabs group="assistant">

<tab label="Claude Code / agents">

它是一个开箱即用的 **skill**。把这个文件夹放入你的项目（或用户）skill 目录，
这样 agent 就会按需加载它 —— 以及它的 `reference/` 文件：

```sh
npx degit ankitskvmdam/clean-jsdoc-theme/SKILLS/clean-jsdoc-theme .claude/skills/clean-jsdoc-theme
```

正是 `name` / `description` frontmatter 让 agent 能够决定何时应用它；随后
`SKILL.md` 会按每项任务拉取相匹配的 `reference/` 文件。

</tab>

<tab label="ChatGPT / Claude.ai / Perplexity">

在一次对话的开头**附加或粘贴** `SKILL.md`，然后提出你的问题：

> _这是 clean-jsdoc-theme 的 skill。请使用它，配置一个 `typedoc.json`，让我
> 的指南在 sidebar 中排在 API reference 上方。_

</tab>

<tab label="Cursor / Copilot / Windsurf">

把它加入你编辑器的 **project rules / context** —— 例如将它保存为一个规则文件
（`.cursor/rules/clean-jsdoc-theme.md` 或你工具的等价物），或在 chat 中用 `@`
提及该文件，使其被拉入上下文。

</tab>

</tabs>

</step>

<step label="Ask away">

从"为一个 guides-only 站点写出 `jsdoc.json`"到"为什么我的 `@category` 显示出
了两个 group？"—— 现在每一个问题都能得到一个基于主题实际运作方式的答案。

</step>

</steps>

## 保持它最新

`SKILL.md` 与代码一同进行了版本管理（它带有一个 `skill-revision` 戳记），并对
照源码做了验证，因此一份全新的副本总是与你当前所用的主题相符。这个 skill 还
**教会助手检查更新** —— 在相关的时候，且每个 session 至多一次，它会把自身的
revision 与已发布的副本作比较、把你已安装的主题版本与 npm 上的 latest 作比较，
若其中任一落后，便会主动提出更新。升级主题之后，请重新下载它，以获取新的选项
和功能。

## 为你自己的文档提供 `llms.txt`

上面的 skill 讲的是*这个 theme*。另一面是让 **你的** 生成站点对 LLM 可读——
而这一步 theme 已经替你做了。

每个内容页面都已附带一份 companion `<page>/index.md`（copy-page 按钮交给
Claude / ChatGPT / Perplexity 的正是它）。设置
[`llmsTxt`](/theme/configuration#llmstxt)，构建就会补上把它们串起来的索引：

```json5
// jsdoc.json
opts: { siteUrl: "https://example.com", llmsTxt: true }
```

- **`/llms.txt`** —— 一个 [llmstxt.org](https://llmstxt.org) 索引：项目名称、
  一行摘要，然后每个 sidebar 分组一个 section，每条记录链接页面的 Markdown
  而不是 HTML。
- **`/llms-full.txt`** —— 所有页面拼接在一起，便于把整个文档站粘进一个上下文
  窗口。

`siteUrl` 是必需的（该文件会被单独抓取，因此其中链接必须是绝对 URL）。对于大型
API 参考，`llmsTxt: { api: "index" }` 可以保持索引完整，同时把生成的符号正文排除
在完整文件之外。

## 另见

- [Configuration](/theme/configuration) —— skill 所记录的同一批选项，以可浏览
  的参考文档形式呈现。
- [JSDoc Getting Started](/theme/jsdoc-getting-started) ·
  [TypeDoc Getting Started](/theme/typedoc-getting-started) —— 搭建构建流程。
- [Structure your sidebar](/guides/structure-your-sidebar) 与
  [Authoring](/components/callouts) —— skill 所浓缩的那些深入讲解。
