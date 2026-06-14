---
title: 概览
group: Packages/bhasha
order: 20
---

# `@clean-jsdoc-theme/bhasha`

`@clean-jsdoc-theme/bhasha` 是 clean-jsdoc-theme 的**纯粹、浏览器安全的 i18n 核心**。
它是 [aadesh](/packages/aadesh-overview) 的对应物：aadesh 负责依赖磁盘、编排进程的工作，
而 bhasha 持有 build 和**浏览器**都依赖的语言无关原语 —— UI 字符串 catalog、翻译器、
为每次 render 限定 locale 作用域的 provider，以及为每个可翻译字符串赋予稳定标识的
key scheme。

> [!NOTE]
> **为什么叫这个名字？** *bhasha*（भाषा）在梵语/印地语中意为**语言** —— 对于这个
> 持有本地化核心的包来说再合适不过：catalog、翻译器以及 per-locale provider。

> bhasha 由 [rang](/packages/rang-overview) import，而 rang 会打包进浏览器，所以它
> **零 `node:*`** 发布 —— 它是完全 isomorphic 的。依赖磁盘的另一半（extract / build /
> translate）位于 [aadesh](/packages/aadesh-overview)。

## 它提供了什么

- **chrome 目录** —— `EN_CHROME`，即规范的英文 UI 字符串（搜索框
  placeholder、设置标签、语言切换器标签，等等）以及由其派生的
  `ChromeKey` type。这是关于哪些 UI 字符串存在的唯一可信来源；
  aadesh 的 extract 会以它为基础为每个 locale 进行 seed。
- **翻译器** —— `createI18n` / `translate` / 一个 `t(key, vars?)` 函数，带有
  回退链（active locale → default locale → key/source）以及简单的具名
  **interpolation**（`{count}`）。它是一次静态查找 —— locale 在运行时永不
  改变，因为每个 locale 都是它自己的 static site。
- **`LanguageProvider` + `useTranslation`** —— 一个*静态载体*：它在服务端为每次
  render 限定 active catalog 的作用域，并在浏览器中为每个 island root 进行
  seed。没有 setter，没有 reactivity。
- **API key scheme** —— `apiSlotKey(longname, field)` 和 `sourceHash`（FNV-1a）
  为每个可翻译的 API 字符串（`api.<longname>#<field>`）赋予稳定的 key 和一份
  content hash，从而让 setu（负责 emit slots）与 aadesh（负责追踪 staleness）
  在标识上达成一致。
- **校验原语** —— catalog 形状、markdown-in-slot lint、interpolation
  token 一致性以及覆盖率，由 aadesh 的 `validate` 使用。

## 各部分如何使用它

setu 调用 `apiSlotKey` + `sourceHash`，将可翻译的 **API slots** emit 到
manifest 中。aadesh 的 `extract` 从 `EN_CHROME_FLAT` + 那些 slots 构建出 template，
而 `build` 会将某个 locale 已填充的 catalog 通过同一套 render 反馈回去 ——
chrome 经由 `LanguageProvider`，API 字符串经由 setu 的 stamp。rang 的组件调用
`useTranslation`/`t`，而不是硬编码英文，因此同一个组件可以在任意 locale 下
render。由于 bhasha 是 isomorphic 的，那次 `t` 调用在 SSR 期间和 island
hydrate 之后表现完全一致。

## 阅读源码

- **Package directory:**
  [packages/bhasha](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha)
  ·
  [packages/bhasha/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/bhasha/src)
- **Public surface:**
  [`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/index.ts)
- **Chrome catalog:**
  [`catalog.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/catalog.ts)
- **Translator + provider:**
  [`translate.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/translate.ts)
  ·
  [`provider.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/provider.tsx)
  ·
  [`interpolate.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/interpolate.ts)
- **Keys + hashing:**
  [`keys.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/keys.ts)
- **Validation:**
  [`validate.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/bhasha/src/validate.ts)

## 下一步

- [aadesh 概览](/packages/aadesh-overview) —— 驱动 i18n 工作流的 CLI。
- [本地化你的文档](/guides/localize-your-docs) —— 端到端操作指南。
