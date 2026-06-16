---
title: Playground
group: Components
order: 2
---

# Playground

この guide では、読者が docs を離れずにあなたの examples を実行できるようにします。
**playground** feature を on にすると、code block の header に **"Open Code in"**
ボタンが現れ、そのコードを — 事前入力済みで — **CodePen**、**JSFiddle**、
**CodeSandbox** で開けます。すべて読者の browser の中で起こります（CodePen/JSFiddle
には form `POST`、CodeSandbox には parameterized link）— **backend なし、API key
なし** です。

同じ `@playground` tag は、provider が **あってもなくても** 機能する 2 つの提示上の
工夫も与えてくれます: **`filename`** の header label と、行の **`highlight`** です。

## 1. 有効にする

この feature は、`jsdoc.json` の `opts` に `playground` を追加するまで **off** です。
shorthand の `true` は defaults で on にします（すべての provider、example ごとに
opt-in）。object 形式なら制御できます:

```json5
opts: {
  template: "./node_modules/clean-jsdoc-theme",
  playground: {
    // Turn every @example into a playground (default false → opt-in per tag).
    enableForAllExamples: false,
    // Which providers to offer, in this order (default: all three).
    providers: ["codepen", "jsfiddle", "codesandbox"],
    // Site-wide per-provider options (see "Set provider options" below).
    codepen: { js_pre_processor: "babel", css_external: "https://unpkg.com/some.css" },
    jsfiddle: { resources: "https://unpkg.com/some.js", wrap: "b" },
    codesandbox: { dependencies: { lodash: "latest" } }
  }
}
```

知っておくべきことをいくつか:

- `playground: false`（または省略）は、出力を **byte-identical** に保ちます — code
  blocks は以前とまったく同じように render されます。
- `enableForAllExamples: true` は **すべての** `@example` を opt-in にします
  （example は `@playground none` でなお opt-out できます）。
- `providers` は default の集合と順序を設定します。3 つすべてにするには省略します。

## 2. example に tag を付ける

doc comment の中、`@example` の隣に `@playground` を追加します。grammar は
whitespace 区切りの tokens の list です（[`@iframe`](/components/embeds) と同じ
parser）:

```js
/**
 * Resize an image to a target width.
 *
 * @example
 * const out = resize(img, 200);
 * render(out);
 * @playground codepen jsfiddle filename=resize.js highlight=2
 */
export function resize(img, width) {}
```

| Token | What it does |
| --- | --- |
| `codepen` / `jsfiddle` / `codesandbox` | Offer only these providers (your order is kept). |
| *(bare `@playground`)* | Use the default `providers` from `opts.playground`. |
| `none` / `off` | Opt this example **out** (handy with `enableForAllExamples`). |
| `filename=<name>` | Show `<name>` as the header label instead of `CODE`. |
| `highlight=1,4,8` | Highlight lines 1, 4 and 8 (1-based). `highlight=[1,4,8]` also works. |

`filename` と `highlight` は `none`/provider なしでも適用されます — つまり
playground をまったく提供しなくても、snippet に label を付けたり highlight したり
できます。

> [!IMPORTANT]
> 基本の JSDoc にとって `@playground` は **unknown tag** なので、`jsdoc.json` に
> `tags.allowUnknownTags: true` を設定してください（`@iframe` が必要とするのと同じ
> flag）— さもないと JSDoc は theme が走る前にそれを取り除きます。TypeDoc にはそう
> した flag は不要です。

## 3. prose の中で使う

doc comments の外 — `docs` folder、tutorials、README の中 — では、prose の処理のされ
方ゆえに、2 つの authoring 形式があります:

**` ```js playground ` fence** は `docs` directory と **Markdown** tutorials で機能
します。fence の info string で language の後に `playground`（と任意の tokens）を
置きます:

````markdown
```js playground codepen filename=demo.js highlight=2
const out = resize(img, 200);
render(out);
```
````

**`<playground>` container** は README や HTML tutorials を含め **どこでも** 機能し
ます。単一の fenced code block を包みます:

````markdown
<playground codepen jsfiddle filename="demo.js" highlight="2">

```js
const out = resize(img, 200);
render(out);
```

</playground>
````

> [!TIP]
> **なぜ 2 つの形式?** fence の language の後の info string（"meta"）は、README/HTML
> prose が normalize されるときに落とされます。そのため fence 形式は、raw Markdown
> として届く sources（`docs`、Markdown tutorials）でしか機能しません。`<playground>`
> container はその normalization を生き延びるので、README ではこちらに手を伸ばして
> ください。内側の fence の周りには空行を残してください（[`<steps>`/`<tabs>`](/components/steps)
> と同じ規則）。

provider tokens のない素の prose `playground` は **すべての** provider を提供します
— prose には site-wide の `providers` default へのアクセスがありません。

## 4. provider options を設定する

`opts.playground` の中の provider ごとの records は、各サービスの prefill API に
そのまま渡され、site 上の **すべての** playground に適用されます:

- **CodePen** — [`/pen/define` prefill](https://blog.codepen.io/documentation/prefill/)
  の fields: `js_pre_processor`、`js_external`、`css`、`css_external`、`html`、
  `editors`、`layout`、`title`、… example のコードが pen の JS になります。
- **JSFiddle** — [post API](https://docs.jsfiddle.net/api/display-a-fiddle-from-post)
  の fields: `resources`（comma 区切りの external URLs）、`wrap`、`html`、`css`、
  `title`、`description`。
- **CodeSandbox** — [define API](https://codesandbox.io/docs/learn/sandboxes/cli-api#define-api):
  `dependencies` が `package.json` を seed し、example が `index.js` になります。

header strip や highlight された行の tint を再配色するには、
[`colors` / `darkColors`](/theme/configuration#colors-and-darkcolors) の下の
`codeHeaderBg` / `codeHeaderFg` / `codeHighlightBg` keys を設定してください。

## こちらも参照

- [Custom tags](/components/overview) — `@iframe` / `@category` / `@order` と並ぶ
  `@playground`、そして `allowUnknownTags` の要件。
- [Embeds & live demos](/components/embeds) — 既存の pen、video、live demo を URL で
  埋め込むための `@iframe` / ` ```iframe `。
