---
title: Guides + API を組み合わせる
group: Guides
order: 3
---

# Guides + API を組み合わせる

これは theme の代名詞ともいえる能力です: **手書きの guides と生成された API
reference を 1 つのサイトに** — 1 つの sidebar、1 つの search index、1 つの URL space。
deploy する 2 つ目のサイトもなく、読者にとっての context-switch もありません。

2 つの半分はすでに見てきました:

- [Build a guides site](/guides/build-a-guides-site) —
  [`docs`](/theme/configuration#docs) folder からの prose pages。
- [Build an API reference](/guides/build-an-api-reference) — あなたの source から
  生成された pages。

両方を同時に on にすると、それらは merge されます。この page はそのメンタルモデルです。

## 1 つの config で全体像

<tabs group="tool">
<tab label="JSDoc (jsdoc.json)" value="JSDoc (jsdoc.json)">

```json5
{
  source: { include: ["./src", "./README.md"] },
  plugins: ["plugins/markdown"],
  opts: {
    destination: "dist",
    recurse: true,
    template: "node_modules/clean-jsdoc-theme/dist",

    readme: "./README.md",   // → home page
    docs: "./docs",          // → prose guide pages
    // src above → generated API pages

    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
<tab label="TypeDoc (typedoc.json)" value="TypeDoc (typedoc.json)">

```json5
{
  entryPoints: ["src/index.ts"],
  readme: "README.md",       // → home page
  plugin: ["@clean-jsdoc-theme/typedoc"],
  outputs: [{ name: "clean-jsdoc-theme", path: "dist" }],
  cleanJsdocTheme: {
    docs: "./docs",          // → prose guide pages
    sectionOrder: ["Getting Started", "Guides", "Classes", "Modules"],
  },
}
```

</tab>
</tabs>

その単一の build が guide pages、API pages、home page、そして（JSDoc では default で）
source viewer を生成します — すべてが 1 つの nav に縫い合わされます。

## メンタルモデル

すべては **pages の 1 つの flat list** と **`assembleNav` への 1 回の呼び出し**
（[`packages/setu/src/generate-site.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
内）に集約されます。sources は異なりますが、sidebar はそれらを一様に扱います:

1. **Home** — 常に最初、常に ungrouped。README home page、**ただし** docs-root の
   `index.md` が存在する場合はそれが override します。
2. **Sections**、有効な順序（下記）で。各 top-level group は太字の sidebar title
   です:
   - **API kind sections** — untagged な symbol については Classes、Modules、
     Namespaces、…; あるいは自分の `@category` group 名。
   - **Doc groups** — guide pages が宣言する group（frontmatter または directory）。
   - **Tutorials** — JSDoc の `--tutorials` directory を使う場合。
3. **Source Files** — 常に最後、常に ungrouped（JSDoc で `outputSourceFiles` が on
   のとき）。

肝心な洞察: **guide page の group と API symbol の `@category` は同じ種類のもの**
です。どちらも最終的には `frontmatter.group` になり、どちらも同じ ordering の仕組み
に流れ込みます。group 名を共有すれば、guide と class は *同じ* sidebar group に並ぶ
ことができます。

```text
  README / index.md ──▶ Home
  docs/ folder ───────▶ Doc groups          ┐
  source code ────────▶ API kind sections   │
                        / @category groups   ├─▶  assembleNav  ──▶  one sidebar
  tutorials/ ─────────▶ Tutorials            │
  source files ───────▶ Source Files         ┘
```

## 2 つをどう一緒に並べ替えるか

ここは正しく押さえる価値のある部分です。有効な top-level の順序は
[`assembleNav`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/generate-site.ts)
で構築されます:

1. **[`sectionOrder`](/theme/configuration#sectionorder) が最初に来ます**。あなたが
   列挙した順序で。これは 1 つの統一された list です — API kind labels（`Classes`）、
   `@category` group 名、**そして** doc-group 名を、好きなように交互に並べて指定でき
   ます。
2. **kind labels** については、`sectionOrder` は filter *かつ* 順序です — 省いた kind
   label は **sidebar から外されます**。
3. **Category と doc groups は省略によって外されることはありません**。`sectionOrder`
   に名前のないものは、列挙された section の *後ろ* に追加されます — まず
   [`docGroups`](/theme/configuration#docgroups) の順序で doc groups、それから残りが
   アルファベット順。
4. **Home** は常に最初、**Source Files** は常に最後で、`sectionOrder` に関わらず変わ
   りません。

> [!IMPORTANT]
> `sectionOrder` は doc groups *と* kind labels を 1 つの list に混在させるため、真の
> 交互配置のための道具です — 例えば **Getting Started**（guide group）、次に
> **Classes**（API）、次に **Guides**（さらに prose）、次に **Modules**。これは
> まさにこのサイトが行っていることです; その
> [`jsdoc.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/docs-site/jsdoc.json)
> を参照してください。doc groups を並べ替えつつ API section は default のままにしたい
> 場合にのみ `docGroups` を使ってください。

### group の中で

- **API symbols** は `@order` / `@category … order=` でソートされ、その後アルファ
  ベット順 — untagged な kind section は純粋にアルファベット順のままです。
- **Guide pages** は frontmatter `order` でソートされ、その後 title。
- **Tutorials** は解決された tree の順序を保ちます。

より深い仕組み — 入れ子の `/`-path groups、`clubSidebarItems`、leaf-vs-branch の
ordering — は [Structure your sidebar](/guides/structure-your-sidebar) でカバーされて
います。

## home page、一度きりで確定

sources を組み合わせると、複数のものが home page になり *うる* 状態になります。
precedence は次のとおり（
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
の `generateSite` を参照）:

1. docs-root の **`index.md`**（slug `""`、`kind: 'index'`）— 存在すれば勝ちます。
2. それ以外は **`readme`** HTML。

つまり `docs/index.md` を使えば、あつらえの landing page を書きつつ、なお
`README.md` を npm/GitHub readme として使えます。

## Collision は解決され、致命的になることはない

すべての pages は 1 つの URL space を共有するため、slug は一意でなければなりません。
setu は固定の順序で slug を要求します — **まず API pages**、次に docs、次に
tutorials、次に source pages — そして slug がすでに要求済みの（または home を覆い隠す）
後続の page は、**警告とともにスキップされ**、決して crash しません。したがって guide
の slug がたまたま生成された class page と衝突した場合、API page が勝ち、guide は外され
ます（名前を変えるか frontmatter `slug` を設定してください）。
[`index.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/index.ts)
の collision handling で検証済み。

## 2 つの半分のあいだの cross-linking

これは 1 つのサイトなので、link はそのまま機能します。guide からは、生成された page
へその slug で link します; doc comment からは `{@link}` / `@tutorial` を使うと setu が
正しい page に解決します（doc pages は slug で、tutorials は name で keyed されます —
[`guide-view.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/setu/src/guide-view.ts)
の resolvers を参照）。

## 次に進む先

- merge された sidebar を細かく調整する: [Structure your sidebar](/guides/structure-your-sidebar)。
- symbol の group/order tags: [Custom tags](/components/overview)。
- すべての option を詳しく: [Configuration](/theme/configuration)。
