---
title: 概要
group: Using the Theme
order: 1
---

# 概要

`clean-jsdoc-theme` は **JSDoc** または **TypeDoc** プロジェクトを、高速で
モダンな LLM-friendly documentation site に変えます。あなたの source comments
に対して、そして任意で Markdown guides の folder に対して指定すると、
server-rendered HTML、遅延 (lazily) hydrate される interactive islands、
fuzzy + full-text search、light テーマと dark テーマ、そしてすべての page の
companion `.md` を生成します。

これは単一の template ではありません。裏側では、一方向の pipeline に組み込まれた
single-responsibility [packages](/#the-packages) の小さな集合であり、同じ core が
JSDoc と TypeDoc の両方の entry points を動かします。

## 仕組み

<steps>

<step label="Document your code">

JSDoc または TypeDoc comments を、いつもどおりに書きます。任意で、手書きの
Markdown guides の folder と並べて書くこともできます。

</step>

<step label="Point your tool at the theme">

theme をあなたの `jsdoc.json` または `typedoc.json` に追加します。始めるにあたって
CSS や build configuration は不要です。

</step>

<step label="Build">

JSDoc または TypeDoc を実行します。theme は完全な static site を構築します。
HTML、islands、search index、そしてすべての page の companion `.md` が、
どこへでも deploy できる状態で揃います。

</step>

</steps>

## clean-jsdoc-theme は誰のためのものか

- **JSDoc users** — default template の代わりに、モダンで responsive、検索可能な
  site を求める人。始めるのに CSS や build config は不要です。
- **TypeScript / TypeDoc users** — 既存の reflection-based docs から同じ output
  を求める人。
- **Library authors** — 手書きの Markdown guides と auto-generated な API
  reference を、**一つの** site、一つの sidebar、一つの search にまとめたい人。
- **AI を重視する Teams** — assistants や LLMs が人間と同じくらい簡単に docs を
  読めるよう、すべての page がきれいな companion `.md` を ship することを望む人。
- **localization が必要な Projects** — docs を複数言語で ship したい人。
  translated UI、API descriptions、prose を、language switcher 付きで locale ごと
  に 1 つの static site として提供します。
  [Localize your docs](/guides/localize-your-docs) を参照してください。

## 道案内

- **Getting started** — [JSDoc](/theme/jsdoc-getting-started) または
  [TypeDoc](/theme/typedoc-getting-started): theme を install して最初の site を
  構築します。
- **[Configuration](/theme/configuration)** — すべての theme option を、JSDoc と
  TypeDoc の形式を並べて示します。
- **Guides** — [guides site を構築する](/guides/build-a-guides-site)、
  [API reference](/guides/build-an-api-reference)、
  [両者を組み合わせる](/guides/combine-guides-and-api)、そして
  [sidebar を構成する](/guides/structure-your-sidebar)。
- **Authoring** — prose や doc comments で使える [callouts](/components/callouts)、
  [steps](/components/steps)、[tabs](/components/tabs)、[embeds](/components/embeds)、
  そして [custom tags](/components/overview)。
- **[Packages](/#the-packages)** — internals を理解したり拡張したりしたい場合の
  building blocks。

セットアップの準備はできましたか？ **[JSDoc Getting Started](/theme/jsdoc-getting-started)**
または **[TypeDoc Getting Started](/theme/typedoc-getting-started)** へどうぞ。
