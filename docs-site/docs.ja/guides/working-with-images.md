---
title: 画像を扱う
group: Guides
order: 6
---

# 画像を扱う

documentation のどこからでも local な画像を reference できます — docs page、
tutorial、README、あるいは JSDoc / TypeScript の doc comment — すると theme がその
file をビルド後のサイトに copy し、link をあなたの代わりに rewrite します。output
へ手作業で file を copy する必要はなく、absolute URL も不要です。

下の diagram は、このサイトの `assets/` folder にある local な SVG で、
root-relative な path で reference しています：

![The clean-jsdoc-theme build pipeline](/assets/build-pipeline.svg)

> [!TIP]
> この page そのものが実例です — source は
> [`docs-site/docs/guides/working-with-images.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/docs/guides/working-with-images.md)
> にあります。

## どこで効くか

Local な画像の解決は、theme が render するすべての prose source に適用されます：

- **Docs pages** (`opts.docs`) — このようなサイトを構築する Markdown/HTML の file。
- **Tutorials** (`--tutorials`) — JSDoc の tutorial tree。
- **README** — home page になる project の README。
- **API comments** — JSDoc または TypeScript の doc comment（class / function /
  method の description）に書いた画像。

どの場合も、普通の Markdown 画像（または raw な `<img>` tag）を書くだけで、残りは
theme が引き受けます — 設定するものは何もありません。

## path はどう解決されるか

書いた `src` は、それが現れる file を基準に解決されます：

| 書く `src` | 何を基準に解決されるか |
| --- | --- |
| relative な path（`./img/x.svg`、`../img/x.svg`） | その source file 自身の directory |
| root-relative な path（`/assets/x.svg`） | あなたの project root |
| `http(s)://…` URL または `data:` URI | そのまま（external として残す） |

つまり docs page は自身の folder を基準に、tutorial は tutorials directory を基準
に、README は project root を基準に、API comment は **その comment があるソース
file** を基準に解決されます。

解決された画像は `_assets/<name>.<hash>.<ext>` に **content-hashed** な名前で copy
され（build をまたいで安定し、変更時には cache-busting）、reference はそこを指すよう
rewrite されます。raw な HTML `<img src="…">` も Markdown の `![](…)` とまったく
同じように扱われます。

## JSDoc / TypeScript comment の中

API reference の画像も特別扱いではありません — doc comment に直接 Markdown 画像を
書けば、**その comment があるソース file** を基準に解決され、ほかの画像と同じように
`_assets/` へ hash されます:

```js
/**
 * Processes a data stream and emits the running total.
 *
 * ![Data flow](../img/data-flow.svg)
 *
 * @param {string[]} data - The items to process.
 * @returns {Promise<number>} The processed count.
 */
async function process(data) { /* … */ }
```

JSDoc の `plugins/markdown` が theme の見る前に `<img>` へ render し、TypeDoc の
doc comment も同じように動きます。

## JSDoc `staticFiles`

JSDoc には static asset の folder を配布するための標準オプションがあります —
`templates.default.staticFiles.include` — これは file を output root に置き、
**素の名前**（`![diagram](classes-io.png)`）で参照する仕組みで、ふつうは
`resources/doc/img` のような directory から使います:

```json5
// jsdoc.json
templates: { default: { staticFiles: { include: ["resources/doc/img"] } } }
```

theme はこの慣習を尊重します。そこに列挙した各 directory は **fallback の検索
ルート**になるので、素の（または root-relative な）画像参照が解決され、上で説明
した同じ content-hashed `_assets/` pipeline を通ります — 既存の comment や
tutorial を relative path に書き換える必要はありません。それらの directory にある
**画像以外**の file（`.puml` の source、PDF など）は、JSDoc の挙動どおり site root
に **verbatim** で copy されます。pipeline が既に `_assets/` から提供した画像が
root にもう一度 copy されることはありません。

> [!NOTE]
> `staticFiles` は JSDoc のオプションです。TypeDoc では画像を source の隣か
> `docs` folder に置き、relative または root-relative な path で参照してください
> — 同じ `_assets/` pipeline を通ります。

## SVG は theme に追従する

`.svg` file にはもう一手間あります： markup を `<img>` 経由で読み込むのではなく、
page に直接 **inline** します。これにより SVG 自身の `[data-theme="dark"]` styles
（あるいは `currentColor` の塗り）が in-page の theme toggle に追従できます —
`<img>` で読み込まれた SVG は operating system のカラースキームしか見えず、サイトの
toggle は見えません。この page を light と dark で切り替えてみてください。上の
diagram もそれに合わせて色が変わります。

## code 例は安全です

**例として** 示した画像 syntax — inline の `code span` や fenced block の中 — は
書いたとおりにそのまま残ります。copy されて rewrite されるのは prose 中の実際の
画像だけです。だからこの page の `![…](…)` の各 snippet は `_assets/` link に
変わらず、そのまま literal に表示されます。

## 次へ

- [Configuration → How assets are handled](/theme/configuration#how-assets-are-handled)
  — 内部の asset pipeline。logos や custom CSS/JS と共有しています。
- [Build a guides site](/guides/build-a-guides-site) — このサイトを構築している
  prose-first な workflow。
