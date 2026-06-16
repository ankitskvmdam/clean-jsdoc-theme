---
title: Tabs
group: Components
order: 6
---

# Tabs

> [!NOTE]
> **どこで使えるか — prose と source comments。** `<tabs>` markup は任意の
> prose（README、tutorials、docs directory）の中、**または** JSDoc /
> TypeDoc comment の **description** の中に直接書きます — どちらも同じ
> converter を通って流れます。専用の block tag はありません。どちらの場所でも
> 同じ markup を書きます。

`<tabs>` は tabbed view を render します — 一群の panels の上に並ぶ clickable な
tab buttons の列で、一度に 1 つの panel を表示します。あなたは prose の中（または
doc-comment description の中）に lowercase の `<tabs>` / `<tab>` tags を書きます。
theme はそれらを、rang が render する capitalized な `<Tabs>` / `<Tab>`
components へと書き換えます。

この書き換えは raw-string レベルで
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
にて起こります（`splitContainers` / `parseItems`）。これは HTML round-trip の
前で、その round-trip はこれらの custom tags を取り除いてしまいます。Component は
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx)
にあります。

> [!TIP]
> tabs を live で見たいですか？ [Configuration](/theme/configuration) page 全体が
> これらで作られています — どの option の snippet も synced な JSDoc/TypeDoc tab
> group です。[JSDoc](/theme/jsdoc-getting-started) と
> [TypeDoc](/theme/typedoc-getting-started) の getting-started pages もこれらを
> 使っています。実際の、copy できる例については、これらいずれかの page sources を
> GitHub で見てください。

## Syntax

1 つの `<tabs>` container は、それぞれ `label` を持つ 1 つ以上の `<tab>` items を
包みます:

````markdown
<tabs>

<tab label="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

> [!IMPORTANT]
> 各 tab の内側の content（fenced code、lists、paragraphs）の **周りに空行** を
> 残してください。各 item の body は Markdown として再 parse されるため、それらの
> 空行こそが content を正しく render させるものです。

## Attributes

| Tag      | Attribute | Effect |
| -------- | --------- | ------ |
| `<tab>`  | `label`   | The tab button text. Falls back to `Tab N` when omitted. |
| `<tab>`  | `value`   | The cross-block **sync key** (see below). Defaults to the normalized label (lower-cased, trimmed). |
| `<tabs>` | `group`   | Opts the whole block into cross-block syncing under a shared group name. |

`readAttr` は single または double quotes を受け入れます。`<tabs>` の外側の
`<tab>` は何も render しません — `Tab` は論理的な marker で、`Tabs` が直接
読み取ります。

tab bar は完全に SSR-rendered です（最初の tab が見え、残りは `hidden`）。本物の
ARIA tablist + panels を伴います。小さな `tabs` island はその markup を
**強化する** だけです — click とキーボード操作で `aria-selected` / `tabIndex` /
`hidden` を toggle します。panels を Preact 経由で再 render はしないので、panel
content は任意の rendered MDX であってかまいません。

## page をまたいで tab groups を sync する — `group`

複数の `<tabs>` blocks に同じ `group` を与えると、それらは sync します: 1 つを
switch すると page 上の他のすべての grouped block が switch し（各 tab の `value`
でマッチされます）、その選択は次回の訪問まで保持されます。

`value` は group の中で tabs がマッチされる key です。これを省略すると、normalized
label に default されます（lower-cased および trimmed、
[`Tabs.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Tabs.tsx)
の `tabValue` に従います）。そのため **同一の labels は無料で sync します**。
labels が casing や言い回しで異なるが、それでも sync させたい場合は、明示的な
`value` を set します。

````markdown
<tabs group="pm">

<tab label="npm" value="npm">

```sh
npm install clean-jsdoc-theme
```

</tab>

<tab label="pnpm" value="pnpm">

```sh
pnpm add clean-jsdoc-theme
```

</tab>

</tabs>
````

同じ page 上の別の `<tabs>` block に同じ `group` を与えると、両者は lockstep に
保たれます — 一方で 1 つの tab を選ぶと、他のすべての grouped block が追従します。
これは [Configuration](/theme/configuration) が JSDoc-対-TypeDoc の snippets を
sync に保つために使うのとまさに同じ mechanism です: どの option の tabs も
`group="tool"` を共有するので、一度 "TypeDoc" を選べば page 全体が switch します。

## doc comment の中で

`<tabs>` は JSDoc / TypeDoc の **description** の中でも動作します。live demo の
module page にある install tabs は、その `@module` comment の中に直接書かれて
います:

`````js
/**
 * Install it with your package manager of choice:
 *
 * <tabs>
 *
 * <tab label="npm">
 *
 * ```sh
 * npm install --save-dev jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * <tab label="pnpm">
 *
 * ```sh
 * pnpm add -D jsdoc clean-jsdoc-theme
 * ```
 *
 * </tab>
 *
 * </tabs>
 *
 * @module sample-api
 */
`````

> [!TIP]
> これらの tabs を live demo の
> **[sample-api module page](/api-docs/module/sample-api)** で rendered された
> 状態で見てください — source は
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)
> にあります。

## こちらも参照

- [Steps](/components/steps) — 兄弟の stepper container（step の内側に tabs を
  nest できます）。
- [Callouts](/components/callouts) — `[!NOTE]`-style の notices について。
- [Structure your sidebar](/guides/structure-your-sidebar) — guide pages がどう
  group 化されるかについて。
