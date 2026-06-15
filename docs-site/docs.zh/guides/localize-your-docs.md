---
title: 本地化你的文档
group: Guides
order: 5
---

# 本地化你的文档

clean-jsdoc-theme 可以将你的文档以**多种语言**发布。每个 locale 都会渲染到各自独立的静态输出——默认语言位于根目录，其他语言位于 `/<locale>` 之下——并且头部的语言切换器可在它们之间导航。会被翻译的内容有三类：

| Content | Source | How |
| --- | --- | --- |
| **UI chrome**（search、settings、nav labels） | 一个 key→string catalog | 在 locale JSON 中翻译 |
| **API descriptions**（class/member/param/return 正文） | 你的 doclets | 在 locale JSON 中翻译 |
| **Prose**（home page、docs pages） | 每个 locale 一份文件 | `README.<locale>.md` + `docs.<locale>/` |

整个工作流通过 [`clean-jsdoc`](/packages/aadesh-overview) CLI（即 **aadesh** 包）运行，其背后由纯粹的 i18n core（[**bhasha**](/packages/bhasha-overview)）支撑。

> [!NOTE]
> 在安装主题的同时安装 CLI：
> `pnpm add -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh`

> [!INFO]
> 本地化**构建**目前仅支持 JSDoc。TypeDoc bridge 可以*提取* catalog，但尚不能渲染每个 locale 的站点——完整的多语言输出在 JSDoc 路径上。

## 1. 声明你的 locale

Locale 位于你现有的 `jsdoc.json` opts 中（TypeDoc：即 `cleanJsdocTheme` 块）——没有单独的配置文件：

```json
{
  "opts": {
    "destination": "dist",
    "readme": "./README.md",
    "docs": "docs",
    "locales": [
      { "code": "en", "name": "English" },
      { "code": "ja", "name": "日本語" },
      { "code": "hi", "name": "हिन्दी" }
    ],
    "defaultLocale": "en"
  }
}
```

一个 `{ code, name }` 列表（或裸 `"en"` 字符串）加上默认值。`name` 是切换器的标签，code 则类似 BCP-47（`en`、`pt-BR`）。`defaultLocale` 是可选的——它默认为列表中的第一个 locale。单 locale（或没有 `locales`）的构建不受影响——它的渲染与以往完全一致。

## 2. 提取 catalog

```sh
clean-jsdoc i18n extract
```

它会运行你的管线，收集每一条可翻译的字符串（chrome + API），并在 `clean-jsdoc-theme-artifacts/locales/` 之下为每个 locale 写出一份可提交的 catalog：

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # the skeleton — values ARE the source text
  en.meta.json   # auto-managed bookkeeping (don't edit)
  ja.json        # values blank until you translate them
  ja.meta.json
  ...
```

每当你的文档发生变化时，重新运行 `extract`——它会**合并**：新增的 key 被加入，源文本变化会将某个 key 标记为陈旧，被移除的 key 会被软删除（在 `--prune` 之前一直保留）。一次无变化的运行会产生零 git diff。

## 3. 翻译

逐一手动编辑每个 locale 的 `<code>.json`，或为 LLM 生成一份提示：

```sh
clean-jsdoc i18n prompt
```

`prompt` 会在 `clean-jsdoc-theme-artifacts/locales/prompts/` 之下为每个 locale 写出一份开箱即用的提示**文件**——对于较小的 catalog 是 `<code>.md`，或为应对上下文限制而分块的 `<code>.part-01.md`、`<code>.part-02.md`、……。每个文件仅包含未翻译和陈旧的条目，并附有保留 markdown、`{@link}`、code fences 以及 `{var}` 插值 token 的说明。CLI 会打印文件落在何处：

```text
ja: 60 entries → 2 prompt files:
  clean-jsdoc-theme-artifacts/locales/prompts/ja.part-01.md
  clean-jsdoc-theme-artifacts/locales/prompts/ja.part-02.md
```

打开每个文件，将其内容粘贴到你的 LLM 中——或直接上传该 `.md`——然后把返回的翻译复制回对应的 `<code>.json` catalog。（prompts 目录在每次运行时都会重新生成且被 git 忽略，因此它绝不会弄乱你的提交。）

你不必翻译所有内容——任何留空的部分都会回退到默认语言，因此一个部分翻译的站点也没问题（而且覆盖率会显示在报告中）。

## 4. 校验（可选）

```sh
clean-jsdoc i18n validate          # warns on gaps, errors on malformations
clean-jsdoc i18n validate --strict # gaps become failures too (for CI)
```

## 5. 构建

```sh
clean-jsdoc build
```

每个 locale 一个站点：默认 locale 位于 `destination`，其他每个 locale 位于 `destination/<locale>` 之下。语言切换器和 `hreflang` 备用链接会根据每个页面实际存在于其中的 locale 集合自动接线。

## 本地化正文

Catalog 涵盖 chrome 和 API 参考。自由格式的正文按**文件**进行本地化——无需提取：

- **Home page**——在你配置的 README 旁边添加一个 `README.<locale>.md`（`README.ja.md`、`README.hi.md`、……）。aadesh 会将其渲染为该 locale 的主页；缺失的变体会回退到默认的 README。
- **Docs pages**——在你的 `opts.docs` 文件夹旁边添加一个同级的 `docs.<locale>/` 目录，并翻译你想翻译的文件。它会**按文件**叠加在默认文档之上：已翻译的页面胜出，缺失的页面回退到默认。因此一个 locale 只需要它实际翻译过的那些页面。

```
README.md            docs/                 # default language
README.ja.md         docs.ja/              # Japanese overlay (translate what you want)
README.hi.md         docs.hi/              # Hindi overlay
```

> [!TIP]
> 让一篇文档的 `group` frontmatter 值在所有 locale 中保持一致（翻译 `title`，而非 `group`）——否则同一个章节可能会被拆分到两个侧边栏分组中。

## 按语言区分的字体

以 Latin 显示字体渲染的翻译标题，对于 CJK 或 Devanagari 来说可能看起来不对。在 `opts.fonts` 中用 `<locale>:` 前缀按 locale 覆盖字体——任何不带前缀的项都是默认值，而省略某个槽位的 locale 会回退到它：

```json
{
  "opts": {
    "fonts": {
      "heading": "Source Serif 4",
      "body": "Roboto",
      "ja:heading": "Noto Sans JP",
      "ja:body": "Noto Sans JP",
      "hi:heading": "Noto Sans Devanagari",
      "hi:body": "Noto Sans Devanagari"
    }
  }
}
```

随后每个 locale 的构建只会从 Google Fonts 请求它自己的字体族。

## Interactive mode

更喜欢有引导的运行？不带任何参数调用 CLI：

```sh
clean-jsdoc
```

它会打开一个欢迎横幅和一个命令选择器，为每个命令的选项给出提示，并提供将等效命令保存到你的 `package.json` scripts 中的选项。

## 一个完整的示例

参见仓库中的 [`examples/with-i18n-example`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/examples/with-i18n-example)——一个三 locale（en / ja / hi）的项目，其中包含翻译过的 API descriptions、chrome、一个按 locale 的主页、一个本地化的 **Guide** 文档章节（带有一个刻意的回退以展示部分翻译），以及按语言区分的字体。

## 下一步

- [aadesh Overview](/packages/aadesh-overview)——深入了解 CLI。
- [bhasha Overview](/packages/bhasha-overview)——i18n core。
- [Configuration](/theme/configuration)——每一个主题选项。
