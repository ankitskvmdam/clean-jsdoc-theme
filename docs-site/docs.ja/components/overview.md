---
title: Overview
group: Components
order: 1
---

# Components

ドキュメントを **authoring** するときに手を伸ばす building blocks です — prose
（README、tutorials、`docs` files）の中でも、JSDoc / TypeDoc の doc comments の中
でも使えます。これらは 2 つの flavour に分かれます:

- **Visual components** — prose や comment に差し込むと、より richな UI 要素として
  render される markup です（callouts、steppers、tabs、live embeds、実行可能な
  playgrounds）。
- **Custom tags** — 基本の JSDoc/TypeDoc が定義しない doc-comment block tags で、
  theme がこれらを読み取って sidebar を形作ったり、あなたの code から live content
  を埋め込んだりします。

## Visual components

prose の中でも doc-comment description の中でも同じやり方で authoring します
（同じ converter を通って流れます）:

| Component | What it does | Page |
| --- | --- | --- |
| **Callouts** | Note / tip / warning / error admonitions (GitHub-style `> [!TIP]`). | [Callouts](/components/callouts) |
| **Steps** | A numbered `<steps>` / `<step>` stepper. | [Steps](/components/steps) |
| **Tabs** | A tabbed `<tabs>` / `<tab>` view. | [Tabs](/components/tabs) |
| **Embeds** | A sandboxed `<iframe>` live demo — a ` ```iframe ` fence or the `@iframe` tag. | [Embeds](/components/embeds) |
| **Playgrounds** | "Open in CodePen / JSFiddle / CodeSandbox" from an `@example` or a code fence. | [Playground](/components/playground) |

## Custom tags

基本の JSDoc と TypeDoc が定義しない block tags です — theme はあなたの source
comments からそれらを読み取ります。2 つは sidebar を形作り、2 つは live content を
埋め込みます（そして prose の相当物を持ちます）:

| Tag | What it does | Page |
| --- | --- | --- |
| `@category <path> [order=N]` | Put a symbol's page in an explicit sidebar group (and optionally order it). | [@category](/components/category) |
| `@order N` | A standalone within-group sort key for **any** symbol. | [@order](/components/order) |
| `@iframe <url> key=value` | Embed a sandboxed live demo from a source comment. | [Embeds](/components/embeds) |
| `@playground <providers> [filename=] [highlight=]` | Open an `@example` in a live playground. | [Playground](/components/playground) |

### まず custom tags を有効にする — `allowUnknownTags`

setup の手順は **1 つ** だけで、これらの tags が「動かない」最大の理由でもありま
す: 基本の JSDoc は、認識しない tag を theme が走る **前** に取り除いてしまいます。
あなたの `jsdoc.json` で unknown tags を on にしてください:

```json
{
  "tags": { "allowUnknownTags": true }
}
```

これがないと、`@category` は default の kind sections に潰れ、`@order` は何もせず、
`@iframe` / `@playground` は決して render されません — しかも静かに。この site の
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
はこれを設定しています。

> [!NOTE]
> **TypeDoc にはそうした flag は不要です** — これらの tags をそのまま通します。
> `allowUnknownTags` の要件は JSDoc に限られます。

## Tags vs. prose — 2 つの入り口

custom tags は **source-comment** 版です。代わりに prose を書いているとき（README、
tutorial、`docs` file）には、同じ能力が tags なしで利用できます:

- **`group` / `order` frontmatter** は guide page 上で `@category` / `@order` を
  反映します（[Build a guides site](/guides/build-a-guides-site) を参照）。
- ` ```iframe ` **fence** は `@iframe` を反映します（[Embeds](/components/embeds)
  を参照）。
- ` ```js playground ` **fence** と `<playground>` **container** は `@playground`
  を反映します（[Playground](/components/playground) を参照）。

## こちらも参照

- [Structure your sidebar](/guides/structure-your-sidebar) — `@category` /
  `@order` が `sectionOrder`、`docGroups`、`clubSidebarItems`、`menu` とどう組み合わ
  さるか。
- [Embeds](/components/embeds) — 共有の `@iframe` / ` ```iframe ` の config
  grammar の全体。
- [Playground](/components/playground) — `@playground` feature の全体:
  `opts.playground`、prose 版、そして provider ごとの options。
