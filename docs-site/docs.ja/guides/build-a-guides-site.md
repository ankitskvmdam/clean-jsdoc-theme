---
title: guides サイトを作る
group: Guides
order: 2
---

# guides サイトを作る

これは **prose-first** な workflow です。手書きの Markdown（または HTML）が入った
folder を theme に指し示すと、それがそのまま完全な documentation サイトになります
— sidebar、search、theme toggle、何もかも。API reference は必須ではありません。
いま読んでいるこのサイトも、まさにこの方法で作られています。

> [!TIP]
> このサイトそのものが実例です。config は
> [`docs-site/jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> で、pages は
> [`docs-site/docs/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/docs-site/docs)
> にあります。
> 以下のすべては
> [`packages/setu/src/guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
> の bridge に対して検証済みです。

## メンタルモデル

[`opts.docs`](/theme/configuration#docs) を directory に指し示します。theme はそれを
再帰的（recursively）にたどり、**各 `.md` / `.markdown` / `.html` file が 1 つの
page になります**。folder 内での file の位置が、2 つのことを自動的に決めます:

- その **URL slug** — 相対（relative）path を slugify したもの;
- その **sidebar group** — その file が置かれている directory を humanize したもの。

file ごとの YAML **frontmatter** は、これらのいずれも（さらにいくつかを）override
します。root の `index.md` は home page になります。これがシステムのすべてです。

directory の走査は bridge
（[`collectDocs`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/clean-jsdoc-theme/src/publish.ts)）
で行われ、file を読み込んで setu に渡します。setu 自身は disk I/O を一切行いません。
拾われるのは `.md`、`.markdown`、`.html`、`.htm` の file だけで —
`node_modules`、`.git`、および dotfiles/dot-dirs はスキップされます。

## セットアップする

<steps>

<step label="Create a docs folder">

ある directory に Markdown を入れます。layout はあなた次第です:

```sh
docs/
  index.md            # → home page (slug "")
  getting-started.md  # → /getting-started, ungrouped
  guides/
    advanced.md       # → /guides/advanced, group "Guides"
```

</step>

<step label="Point the config at it">

config に [`docs`](/theme/configuration#docs) を追加します。Tutorials と API は
任意です — docs folder だけでも完全なサイトになります。

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    template: "node_modules/clean-jsdoc-theme/dist",
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",
    docGroups: ["Getting Started", "Guides"],
    defaultDocGroup: "Docs",
  },
}
```

</tab>
</tabs>

</step>

<step label="Build">

いつも通り build します — toolchain のセットアップ全体については
[JSDoc Getting Started](/theme/jsdoc-getting-started) または
[TypeDoc Getting Started](/theme/typedoc-getting-started) を参照してください。

```sh
npx jsdoc -c jsdoc.json
```

</step>

</steps>

## file がどのように page になるか

各 file について、setu は page の metadata を
[`deriveDocMeta`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
で導出します。code が解決するとおりの規則は次のとおりです:

| Field   | 導出（最初に一致したものが勝つ）                                            |
| ------- | -------------------------------------------------------------------------- |
| `slug`  | frontmatter `slug` → slugified relative path（prefix なし）; `index` → `""`   |
| `title` | frontmatter `title` → path の humanized basename                       |
| `group` | frontmatter `group` → humanized **directory** path → `defaultDocGroup`     |
| `order` | frontmatter `order`                                                        |
| `hidden`| frontmatter `hidden`（default `false`）                                     |

### Slug は path から決まる

slug は拡張子を取り除いた相対 path で、各 segment ごとに `slugifyPath` を通します:
小文字化し、英数字以外の連続を `-` にまとめ、`/` で結合します。したがって
`guides/Advanced Setup.md` → `/guides/advanced-setup` となります。slug には
**prefix が付きません** — docs はきれいな top-level URL に置かれます（`tutorials/`
の下に強制される tutorials とは異なります）。

### Group は directory から決まる

file の sidebar group は default ではその **directory path** になり、各 segment
ごとに humanize されます: `guides/advanced.md` は group **Guides** に入ります;
`guides/setup/install.md` は入れ子の group **Guides/Setup** に入ります（group path
の中の `/` がそれを入れ子にします — [Structure your sidebar](/guides/structure-your-sidebar)
を参照）。
frontmatter group のない docs root の file は
[`defaultDocGroup`](/theme/configuration#defaultdocgroup) に fallback します;
それも未設定なら、その page は ungrouped になります（catch-all の "Docs" section
に入ります）。

### `index.md` → home page

path がちょうど `index` の file（docs-root の `index.md`）は home page になります:
slug `""`、`index.html` で render されます。両方が存在するとき、これは
[`readme`](/theme/configuration#readme) の home page を **override** します。

## Frontmatter overrides

Frontmatter は先頭の `---` block です。parser は意図的に小さく作られています — 単純な
`key: value` scalar（string / number / boolean）で、pipeline が必要とするのはこれだけ
です。認識される key は次のとおりです:

```markdown
---
title: Advanced Setup
group: Guides
order: 2
slug: guides/advanced
hidden: false
---

# Advanced Setup
...
```

- **`title`** — sidebar label と page の `<title>`。
- **`group`** — sidebar group（directory を override します）。入れ子にするには
  `/`-path にできます。
- **`order`** — group 内の sort key（昇順; 未設定は最後、その後アルファベット順）。
  [Structure your sidebar](/guides/structure-your-sidebar) を参照。
- **`slug`** — path から導出されたものを置き換える、カスタム URL。
- **`hidden`** — `true` のとき、page は **render されるが sidebar からは外されます**
  （直接 link / cross-reference からは依然として到達可能）。

> [!NOTE]
> frontmatter parser は意図的に最小限です: 入れ子の YAML、list、複数行の値は
> **サポートされません** — flat な `key: value` scalar だけです。不正または閉じられて
> いない block は frontmatter なしとして扱われ、body にそのまま残されます。
> [`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
> の `parseFrontmatter` を参照してください。

## Group を並べ替える

2 つのレバーが、異なるスコープで働きます:

- [`docGroups`](/theme/configuration#docgroups) は sidebar の **top-level group
  section** を並べ替えます（例: `["Getting Started", "Guides"]`）。列挙しなかった
  group は、その後にアルファベット順で追加されます。
- page の frontmatter **`order`** は、その group の **中で** page を配置します。

このサイトは両方を設定しています — その
[`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
を参照してください: `docGroups`（および `sectionOrder`）が group の順序を固定し、
各 page の `order` frontmatter が中の page を並べます。

> [!IMPORTANT]
> `docGroups` は **doc** group だけを並べ替え、それらを API kind section の **後ろ**
> に追加します。guides を API reference と混在させ、sidebar 全体を完全に制御したい
> 場合 — guides を Classes、Modules などと交互に並べたい場合 — は、代わりに
> [`sectionOrder`](/theme/configuration#sectionorder) を使ってください。
> [Combine guides + API](/guides/combine-guides-and-api) を参照。

## 次に進む先

- 生成された reference を追加する: [Build an API reference](/guides/build-an-api-reference)。
- 両方を 1 つのサイトで届ける: [Combine guides + API](/guides/combine-guides-and-api)。
- すべての sidebar レバーを使いこなす: [Structure your sidebar](/guides/structure-your-sidebar)。
- すべての option を詳しく: [Configuration](/theme/configuration)。
