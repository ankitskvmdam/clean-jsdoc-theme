---
title: 概览
group: Packages/aadesh
order: 20
---

# `@clean-jsdoc-theme/aadesh`

`@clean-jsdoc-theme/aadesh` 是 clean-jsdoc-theme 的 **localization CLI**。它负责 i18n
中那一半与磁盘绑定、需要编排进程的工作 ——
[bhasha](/packages/bhasha-overview)（纯粹的、browser-safe 的核心）刻意不去做的那部分：
启动你的 JSDoc/TypeDoc pipeline、读写可提交的 locale catalog，以及为每个 locale
渲染出一个 static site。

> [!NOTE]
> **为什么叫这个名字？** *aadesh*（आदेश）在梵语/印地语中表示 **command / instruction**
> —— 非常契合本项目的命令行接口。

发布的二进制文件是 **`clean-jsdoc`**。大多数项目通过四个 subcommand 来使用它
（在不带任何参数运行它时还会进入交互式菜单）：

```sh
clean-jsdoc extract    # sync the per-locale catalogs from your docs
clean-jsdoc prompt     # (optional) emit an LLM translation prompt
clean-jsdoc validate   # preflight the catalogs
clean-jsdoc build      # render one site per locale
```

> 如果你只想发布一个单语言站点，那么你永远不需要 aadesh ——
> JSDoc/TypeDoc entry points 会直接构建它。aadesh 是当你需要 **多种语言** 时才加入的那一层。
> 完整的操作演练见
> [本地化你的文档](/guides/localize-your-docs)。

## 它处于什么位置

Locale 是一个 **build dimension**，而不是运行时开关：每种语言都会渲染到它自己的
static output 中（默认 locale 不带前缀，其余的位于 `/<locale>` 之下），而
language switcher 只是在它们之间进行导航。这一 fan-out 由 aadesh 掌管。它从你早已在使用的
**同一份 `jsdoc.json` opts** 中读取你的 locale 配置（`opts.locales` + `opts.defaultLocale`）——
没有单独的 config file —— 并将真正的 theme pipeline 运行两次：一次以 *extract mode*
提取可翻译的字符串，另一次按 locale 以 *build mode* 把翻译结果重新 stamp 回去。

## 各个命令

- **`extract`** —— 以 extract mode 运行 pipeline，收集每一条可翻译的字符串
  （UI chrome + API descriptions/summaries/example captions + parameter 和
  return descriptions），并将它们按 locale 同步进一份可提交的 JSON。重新运行是一次 merge：
  新增的 key 会被添加，source 的变更会把某个 key 标记为 *stale*，被移除的 key 则做
  soft-delete（保留到 `--prune` 为止），这样一次 rename 就绝不会丢掉某个 translator
  的工作。无变更的运行产生的是零 git diff。
- **`prompt`** —— 按 locale 写出一个开箱即用的 LLM 翻译 prompt **file**
  （位于 `clean-jsdoc-theme-artifacts/locales/prompts/` 之下，为应对 context limits
  而分块），其中只覆盖新增的和 stale 的 key，并附带精确的 return-JSON 结构以及保留
  markdown / `{@link}` / code fences / `{var}` token 的说明。你把每个 file 粘贴进某个
  LLM（或上传 `.md`）；该 directory 被 git-ignored，每次运行都会重新生成。
- **`validate`** —— 对 catalog 做预检：一处 coverage gap 会给出警告（"using the
  default"），而一处 malformation（broken markdown-in-slot、丢失的 `{var}` token、
  未知的 key）则报错。默认是有弹性的（resilient）；`--strict` 会把警告升级为失败，
  以供 CI 使用。
- **`build`** —— template + 填好的 catalog → setu stamp → dwar render → 每个 locale
  一个 site。它掌管为 language switcher 和 `hreflang` 备选项供给数据的那份
  cross-locale index。

每个 prompt 都有一个等价的 flag（`--config`、`--dir`、`--prune`、`--strict`、
`--locale`、`--chunk-size`、`--typedoc`），因此该 CLI 能在 CI 中无头（headless）运行，
绝不阻塞。

## 产物（artifacts）

Catalog 位于 `clean-jsdoc-theme-artifacts/locales/` 之下，**committed** 到你的 repo
并由人工编辑（或由你的 translation workflow 编辑）。每个 locale 是两个 file：

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # editable: _version + chrome.* / api.* translations
  en.meta.json   # auto-managed: source hashes + soft-deleted keys (don't touch)
  ja.json
  ja.meta.json
```

可编辑的 file 只包含 translator 会改动的内容；staleness hash 和 soft-delete 则位于相邻的
`.meta.json` 中，这样机器的簿记工作就绝不会扰乱你要审阅的那个 file。

## 正文本地化

在带 key 的 catalog 之外，自由格式的正文是 **按 file** 本地化的，无需提取：

- **首页（Home page）** —— 在你配置的 README 旁边放一个相邻的 `README.<locale>.md`，
  它会作为该 locale 的首页渲染（缺失时回退到默认 README）。
- **文档（Docs）** —— 一个相邻的 `docs.<locale>/` directory 会按 file 覆盖你的
  `opts.docs`：已翻译的 page 胜出，缺失的 page 则回退到默认 doc。

## 交互模式

不带任何 subcommand 运行 `clean-jsdoc`，即可获得一个引导式菜单：一个欢迎横幅、
一个会显示每个命令 description 的 command picker、针对其选项的提示（defaults 已预先填好），
以及一个把等价命令保存进你 `package.json` scripts 的提议，这样你就能用
`npm run <key>` 重新运行它。

## 阅读源码

- **Package directory:**
  [packages/aadesh](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh)
  ·
  [packages/aadesh/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src)
- **CLI entry + subcommands:**
  [`cli.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/cli.ts)
  ·
  [`runners.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/runners.ts)
  ·
  [`interactive/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/interactive)
- **Commands:**
  [`commands/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/commands)
  (extract / prompt / validate / build)
- **Catalog core (pure):**
  [`locale/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/locale)
  (template, merge, file model) ·
  [`artifacts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/artifacts.ts)
  (the disk layer)

## 下一步

- [本地化你的文档](/guides/localize-your-docs) —— 端到端的工作流。
- [bhasha 概览](/packages/bhasha-overview) —— aadesh 所基于的纯粹 i18n 核心。
