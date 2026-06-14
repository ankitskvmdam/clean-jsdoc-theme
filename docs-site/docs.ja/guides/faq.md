---
title: FAQ
group: Guides
order: 6
---

# FAQ

最もよく出てくる質問への、短く実用的な回答 — live content の embed、より豊かな doc
comments の書き方、そしていくつかのよくある configuration の調整。各レシピは、詳細を
すべて載せた page へ link しています。

## Live content を embed する

theme は、任意の page に sandboxed な `<iframe>` を差し込めます — CodePen、YouTube
video、StackBlitz、あるいは任意のサイト。書き方は 2 通りあり、それらは
[1 つの config grammar](/authoring/embeds) を共有します:

- **prose の中**（README、guides、`docs` folder）— ` ```iframe ` の fenced block。
- **doc comment の中** — `@iframe <url> key=value` block tag。

最初の token が URL です; 残りは `key=value` options — `title`、`height`（px）、
`aspectRatio`（例 `16/9`）、`width`、`allow`、`sandbox`、`clickToLoad`、そして
`themed`。受け付けられるのは **`https://`**（または protocol-relative な `//`）の URL
だけです。

### CodePen を embed するには？

pen の **embed** URL を使います（`https://codepen.io/USER/embed/PEN_ID`）:

````md
```iframe
https://codepen.io/USER/embed/PEN_ID title="CodePen demo" height=400
```
````

> [!TIP]
> CodePen で **Embed** を開き、`<iframe src="…">` snippet から URL をコピーします。
> 読者が click するまで軽い poster を表示するには `clickToLoad=true` を追加します。

### YouTube video を embed するには？

**embed** URL（`https://www.youtube.com/embed/VIDEO_ID`）を使い、固定の height では
なく 16/9 の aspect ratio を与えます:

````md
```iframe
https://www.youtube.com/embed/VIDEO_ID title="Intro video" aspectRatio=16/9
```
````

### ほかの website を embed するには？

任意の `https://` URL が機能します — pixel 単位の `height` か `aspectRatio` を設定し
ます:

````md
```iframe
https://example.com title="Live preview" height=480
```
````

### JSDoc / TypeDoc comment から embed するには？

`@iframe` block tag を使います — symbol の `@example` の後に render されます:

```js
/**
 * Renders the chart.
 *
 * @iframe https://codepen.io/USER/embed/PEN_ID title="Demo" height=400
 */
export function render() {}
```

> [!IMPORTANT]
> base JSDoc にとって `@iframe` は **unknown tag** です — `jsdoc.json` に
> `tags.allowUnknownTags: true` を設定してください。さもないと JSDoc は theme が走る
> 前にそれを取り除きます。（TypeDoc にはそうした flag は不要です。）

### embed が表示されない — 何が悪いの？

- URL は **`https://`**（または `//`）で始まらなければなりません。素の `http://` や
  相対 path は拒否され、embed は静かに破棄されます。
- 未知の option key は build 警告とともに無視されます — 上記の一覧に対して綴りを確認
  してください。

### すぐにではなく click で load させられる？

`clickToLoad=true` を追加します: 読者は poster ボタンを見て（`<noscript>` fallback
付き）、iframe は click で load されます。default ではすぐに load され、JavaScript が
まったくなくても機能します。

### embed は light / dark theme に追従する？

default では、はい — theme が変わると embed URL が再解決されます（`{theme}` token が
入れ替えられるか、`?theme-id=<theme>` が付加されます）。`themed=false` でオプトアウト
できます。完全なリファレンス: [Embeds & live demos](/authoring/embeds)。

## より豊かな doc comments

theme が prose で行うことはすべて、あなたの **JSDoc / TypeDoc descriptions の中** でも
機能します — それらは同じ converter を通ります。

### comment に callout を追加するには？

description の中に GitHub-style の alert blockquote をそのまま書きます:

```js
/**
 * Connects to the database.
 *
 * > [!WARNING]
 * > Call `close()` when you're done — connections are not pooled.
 */
export function connect() {}
```

marker は 4 つの style に対応します: `[!NOTE]` / `[!INFO]` / `[!IMPORTANT]` → info、
`[!TIP]` / `[!SUCCESS]` → tip、`[!WARNING]` / `[!CAUTION]` → warning、そして
`[!ERROR]` / `[!DANGER]` → error。[Callouts](/authoring/callouts) を参照してください。

### comment の中で steps や tabs を使える？

はい — 同じ `<steps>`（および `<tabs>`）markup が description の中で機能します; 専用の
tag はなく、markup を直接書きます:

`````js
/**
 * @module my-api
 *
 * <steps>
 *
 * <step label="Install">
 *
 * ```sh
 * npm install my-api
 * ```
 *
 * </step>
 *
 * <step label="Use">
 *
 * ```js
 * import { go } from 'my-api';
 * ```
 *
 * </step>
 *
 * </steps>
 */
`````

完全な syntax と blank-line の規則については [Steps](/authoring/steps) と
[Tabs](/authoring/tabs) を、render された姿を見るには live の
[sample-api module page](/api-docs/module/sample-api) を参照してください。

### deprecation notice はどうする？

ただ `@deprecated` を使うだけです — theme はそれを自動的に callout として render し、
marker は不要です:

```js
/**
 * @deprecated Use {@link connect} instead.
 */
```

## Configuration の調整

### site-name のテキストの代わりに logo を使うには？

`siteName` を `light` / `dark` の image path（と `alt` fallback）を持つ logo object
に設定します — [`siteName`](/theme/configuration#sitename) を参照してください。

### sidebar の grouping と順序を制御するには？

symbol には `@category` / `@order`、guide pages には frontmatter `group` / `order`、
そして `sectionOrder` option を使います。[Structure your
sidebar](/guides/structure-your-sidebar) があらゆるレバーをカバーします。

### API reference の隣に手書きの guides を追加するには？

`opts.docs` を Markdown の folder に指し示します。[Build a guides
site](/guides/build-a-guides-site) と [Combine guides +
API](/guides/combine-guides-and-api) を参照してください。

### "copy page" / "open in LLM" ボタンを無効にするには？

[`copyPage`](/theme/configuration#copypage) で設定または無効化します。

### build が unknown option について警告するのはなぜ？

未知または綴りの誤った option は default で **警告** します（"did you mean?" のヒント
付き）が、build は続行します。それらの警告を error に変えるには
[`strict`](/theme/configuration#strict) を設定してください。

## Localization

### localized（多言語）サイトを作るには？

同じ `opts` block で言語を宣言し、build を `clean-jsdoc` CLI（the
`@clean-jsdoc-theme/aadesh` package）で駆動します:

```json
{
  "opts": {
    "locales": [
      { "code": "en", "name": "English" },
      { "code": "ja", "name": "日本語" }
    ],
    "defaultLocale": "en"
  }
}
```

```sh
npm i -D @clean-jsdoc-theme/aadesh
clean-jsdoc extract    # build the per-locale translation catalogs
# …translate the JSON (or `clean-jsdoc prompt` for an LLM prompt)…
clean-jsdoc build      # render one static site per locale
```

言語ごとに 1 つのサイトが得られます（default が root、ほかは `/<locale>` の下）。
header の language switcher、そして `hreflang` tags も付きます。Prose は file ごとに
localize されます — `README.<locale>.md` の home page と `docs.<locale>/` overlay —
そして locale ごとの fonts は `"ja:heading"` 形式の key を介して指定します。完全な
ウォークスルーは [Localize your docs](/guides/localize-your-docs) にあります。

## LLM と付き合う

### 開発に LLM を使っている — clean-jsdoc-theme を最大限に活かすには？

clean-jsdoc-theme は、2 つの方向で **LLM-friendly** になるよう作られています:

- **生成されたサイトは AI が読める。** すべての page は companion な Markdown file
  （`<page>/index.md`）を emit し、page ごとの **copy / open-in-LLM** ボタンが、その
  きれいな `.md` を Claude / ChatGPT / Perplexity にそのまま手渡します — つまり
  assistant は、あなたの users が読むのとまったく同じ reference を読みます。受け渡しは
  [`copyPage`](/theme/configuration#copypage) と
  [`aiPrompt`](/theme/configuration#aiprompt) で調整します。
- **theme のセットアップ自体が AI 支援される。** ダウンロード可能な
  [**skill**](/theme/llm-skill) があり、任意の coding assistant を clean-jsdoc-theme
  の専門家に変えます — あなたの agent をそれに指し示せば、`jsdoc.json`/`typedoc.json`
  を書き、callouts/steps/tabs で guides を書き、sidebar を構成し、cross-links を結び、
  localization をセットアップし、build を debug することが、当て推量ではなく
  source 検証済みの知識からできます。skill folder を assistant に入れ（例えば
  `.claude/skills/`）、あとはやりたいことを頼むだけです。

つまり LLM があなたの docs を **読んで** いるにせよ、それを **作って** いるにせよ、
あなたが翻訳をする必要はありません — companion な `.md` と skill にそれを指し示すだけ
です。
