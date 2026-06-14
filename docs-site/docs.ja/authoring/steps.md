---
title: Steps
group: Authoring
order: 2
---

# Steps

> [!NOTE]
> **どこで使えるか — prose と source comments。** `<steps>` markup は任意の
> prose（README、tutorials、docs directory）の中、**または** JSDoc /
> TypeDoc comment の **description** の中に直接書きます — どちらも同じ
> converter を通って流れます。専用の block tag はありません。どちらの場所でも
> 同じ markup を書きます。

`<steps>` は縦向きの、番号付き stepper を render します — docs sites が
install / configure / build の流れに使う、あの "1, 2, 3" の walkthrough です。
あなたは prose の中（または doc-comment description の中）に lowercase の
`<steps>` / `<step>` tags を書きます。theme はそれらを、rang が render する
capitalized な `<Steps>` / `<Step>` components へと書き換えます。

この書き換えは raw-string レベルで
[`from-html.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/mdast/from-html.ts)
にて起こります（`splitContainers` / `parseItems` / `expandContainers`）。これは
HTML round-trip の前であり、そうでなければその round-trip がこれらの custom tags
を取り除いてしまいます。Components は
[`Steps.tsx`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/rang/src/components/Steps.tsx)
にあります。

> [!TIP]
> steps を live で見たいですか？ [JSDoc Getting Started](/theme/jsdoc-getting-started)
> と [TypeDoc Getting Started](/theme/typedoc-getting-started) の pages は
> install の walkthroughs を steppers として配置しています — 実際の、copy できる
> 例については、どちらかの page の source を GitHub で見てください。

## Syntax

1 つの `<steps>` container は 1 つ以上の `<step>` items を包みます。各 step は
**任意の** `label` attribute を取ります — step body の上に表示される bold な
heading です:

````markdown
<steps>

<step label="Install">

Add the package as a dev dependency.

</step>

<step label="Build">

Run the build command and open the output.

</step>

</steps>
````

> [!IMPORTANT]
> 各 step の内側の content（fenced code、lists、paragraphs）の **周りに空行** を
> 残してください。各 step の body は Markdown として再 parse されるため
> （`expandContainers` がそれを converter に通して route し直します）、それらの
> 空行こそが content を正しく parse させるものです。

## Attributes

読み取られる attribute は 1 つだけで、それも `<step>` 上のみです:

| Tag       | Attribute | Effect |
| --------- | --------- | ------ |
| `<step>`  | `label`   | Optional bold heading above the step body. Omit it for an unlabeled step. |

`readAttr` は single または double quotes のいずれも受け入れます（`label="…"`
または `label='…'`）。`<steps>` の外側の `<step>` は何も render しません —
`Step` は論理的な marker で、`Steps` がその props を直接読み取ります。はぐれた
`<step>` は markup を漏らす代わりに `null` を返します。

`Steps` は **SSR-only** な static markup です — client JavaScript はなく、
hydration island もありません。純粋な layout です。

## 他の components を nest する

step の body は再帰的に再 parse されるので、step の内側に **callouts**、
**tabs**、code blocks、さらにはもう 1 つの `<steps>` を nest できます:

````markdown
<steps>

<step label="Choose your package manager">

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

<step label="Heads up">

> [!TIP]
> Callouts work inside steps too.

</step>

</steps>
````

これは [JSDoc Getting Started](/theme/jsdoc-getting-started) の walkthrough が
使うのと同じ pattern です — `<step>` の内側に nest された `<tabs>` block です。

## doc comment の中の実例

同じ markup は JSDoc / TypeDoc の **description** の中でも動作します。これが
live demo を駆動する `@module` comment です — `Cache` class の 3 step の
walkthrough で、`<tabs>` install block と `[!INFO]` callout を伴います:

`````js
/**
 * A small, fully-documented sample module …
 *
 * > [!INFO]
 * > Everything below is authored inline in the `@module` doc comment.
 *
 * ## Quick start
 *
 * <steps>
 *
 * <step label="Initialize the cache">
 *
 * Create a {@link Cache}, optionally capping how many entries it holds:
 *
 * ```js
 * const cache = new Cache({ maxSize: 2 });
 * ```
 *
 * </step>
 *
 * <step label="Store some values">
 *
 * `set()` returns the cache, so calls chain:
 *
 * ```js
 * cache.set('a', 1).set('b', 2);
 * ```
 *
 * </step>
 *
 * <step label="Read them back">
 *
 * ```js
 * cache.get('a'); // => 1
 * ```
 *
 * </step>
 *
 * </steps>
 *
 * @module sample-api
 */
`````

> [!TIP]
> これを live API demo の
> **[sample-api module page](/api-docs/module/sample-api)** で rendered された
> 状態で見てください —
> [`docs-site/src/index.js`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/src/index.js)
> からそのまま generated されています。

## こちらも参照

- [Tabs](/authoring/tabs) — 兄弟の tabbed-view container。
- [Callouts](/authoring/callouts) — `[!NOTE]`-style の notices について。
- [Build a guides site](/guides/build-a-guides-site) — prose pages が置かれる場所
  について。
