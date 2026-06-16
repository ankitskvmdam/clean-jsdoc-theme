---
title: v4 → v5 への移行
group: Using the Theme
order: 6
---

# v4 → v5 への移行

v5 は土台から書き直されました: すべての page を server-render し、各 page に対して
companion の `.md` を emit し、built-in の search と source viewer を ship し、
`opts.docs` の prose pipeline を追加します。configuration の表面はかなり変わりまし
た — ですが移行は機械的で、この page（と下記の migration skill）が手順を案内します。

> [!TIP]
> **この作業はまるごと AI assistant に任せられます。** 専用の
> [**migration skill**](#エージェントに任せる) があります — agent をこれに向ければ、
> あなたの options を持ち上げ、引き継がれるものを rename し、なくなったものを削除し、
> build を verify します。下の [エージェントに任せる](#エージェントに任せる) を
> 参照してください。

## 知っておくべき唯一のこと

v4 は theme options を **`opts.theme_opts.*`** の下に nest していました。v5 はそれ
らを **`opts.*` から直接** 読み取ります — v5 に `theme_opts` block はありません。
つまり移行とは、要するに次のことです: options を `theme_opts` から外へ持ち上げ、
引き継がれる少数を rename し、残りを削除し、そして必要に応じて v5 の新機能を
取り入れる。

```json5
// v4 — opts.theme_opts の下に nest
{ opts: { template: "node_modules/clean-jsdoc-theme",
          theme_opts: { default_theme: "dark", title: "My Library" } } }

// v5 — opts の直下（theme_opts なし）
{ opts: { template: "node_modules/clean-jsdoc-theme",
          siteName: "My Library" } }
```

## 手順

<steps>

<step label="Check compatibility">

v5 には **JSDoc ≥ 4** と **Node ≥ 20** が必要です。`plugins/markdown` plugin は
theme にとってもう必須ではありません（v5 は Markdown を自前で render します）が、
残しておいても無害です。当面は v4 にとどまりたいですか? `"clean-jsdoc-theme": "^4"`
で pin してください — v5 prereleases は npm の `next` tag の下に publish されるため、
`^4` はそれらを引き込みません。

</step>

<step label="Upgrade the package">

```sh
npm i -D clean-jsdoc-theme@latest   # または v5 prerelease 中は @next
```

</step>

<step label="Lift and rename options">

すべての key を `theme_opts` から外へ出して `opts` まで持ち上げ、
[mapping table](#option-mapping) を適用し、それから空の `theme_opts` block を削除
します。引き継がれる options は次のとおりです（それ以外はすべて削除されます）:

- `base_url` → [`basePath`](/theme/configuration#basepath)
- `title` → [`siteName`](/theme/configuration#sitename)
- `sections` → [`sectionOrder`](/theme/configuration#sectionorder)
- `create_style` → `customCss`、`include_css` / `add_style_path` →
  [`customCssFile`](/theme/configuration#customcssfile-and-customjsfile)
- `add_scripts` → `customJs`、`include_js` / `add_script_path` → `customJsFile`
- `menu` → [`menu`](/theme/configuration#menu)（再構成 — 下記参照）

</step>

<step label="Build and verify">

```sh
npx jsdoc -c jsdoc.json
npx serve <destination>   # Pagefind の full-text search には HTTP が必要
```

v5 は、残っている `theme_opts` key や v4 の option 名に対して **警告** を出し
（「もしかして?」のヒント付き）、build を続行します — 出力を読み、指摘されたものを
修正してください。移行中はそれらの警告を厳格な errors に変えるために
[`strict: true`](/theme/configuration#strict) を設定し、終わったら緩めてください。

</step>

</steps>

## Option mapping

`opts.theme_opts.<v4>` → `opts.<v5>`。

| v4 (`theme_opts.*`) | v5 (`opts.*`) | 状態 | 注記 |
| --- | --- | --- | --- |
| `default_theme` | — | 削除 | Light/dark token sets + runtime toggle; picker なし。 |
| `base_url` | `basePath` | renamed | links に prefix される site root。 |
| `title` | `siteName` | 変更 | String **または** logo set `{ default, dark, light, alt }`。 |
| `menu` | `menu` | 変更 | 再構成: `{ id?, title?, link/href?, icon? }`; `target`/`class` は削除。 |
| `sections` | `sectionOrder` | renamed | sidebar sections を filter + order。 |
| `create_style` | `customCss` | renamed | Inline CSS（theme stylesheet の後に load）。 |
| `include_css` / `add_style_path` | `customCssFile` | renamed/変更 | CSS file → content-hashed asset link。 |
| `add_scripts` | `customJs` | renamed | Inline JS（最後に実行）。 |
| `include_js` / `add_script_path` | `customJsFile` | renamed/変更 | JS file → content-hashed asset。 |
| `favicon` | — | 削除 | JSDoc 自身の static-file copying を使用。 |
| `homepageTitle` | — | 削除 | Home `<title>` は README / `docs/index.md` + `siteName` から derive。 |
| `includeFilesListInHomepage` | — | 削除 | Source Files section が files を列挙。 |
| `meta` | — | 削除 | custom `<meta>` injection なし。 |
| `search` | — | 削除 | 常時 on の fuzzy search + 省略可能な Pagefind。 |
| `codepen` | — | 削除 | [`@iframe`](/components/embeds) embeds を使用。 |
| `static_dir` | — | 削除 | JSDoc 自身の static-file config を使用。 |
| `footer` | — | 削除 | `siteName` / `pkg` から derive。 |
| `exclude_inherited`, `displayModuleHeader`, `sort`, `shouldRemoveScrollbarStyle` | — | 削除 | 相当なし。 |

> [!NOTE]
> **menu** が再構成されました: v4 の entry `{ title, link, target, class, id }` は
> v5 の `{ id?, title?, link (or href)?, icon? }` になります — `target`/`class` を
> 削除し、`icon`（`lucide:<name>` / `simpleicons:<name>`）を追加します。v5 では、
> `id` は built-ins も選択し（`{ id: "home" }`、`{ id: "source" }`）、`menu` は
> `sectionOrder` より優先されます。[`menu`](/theme/configuration#menu) と
> [Structure your sidebar](/guides/structure-your-sidebar) を参照してください。

## 移行前 / 移行後

<tabs group="version">

<tab label="v4 (theme_opts)">

```json5
{
  plugins: ["plugins/markdown"],
  opts: {
    template: "./node_modules/clean-jsdoc-theme",
    theme_opts: {
      default_theme: "dark",
      base_url: "https://example.com/docs/",
      title: "My Library",
      menu: [{ title: "GitHub", link: "https://github.com/me/lib", target: "_blank" }],
      sections: ["Classes", "Modules", "Global"],
      search: true,
      footer: "© My Library",
      include_css: ["./static/custom.css"],
    },
  },
}
```

</tab>

<tab label="v5 (opts)">

```json5
{
  opts: {
    template: "./node_modules/clean-jsdoc-theme",
    basePath: "https://example.com/docs/",
    siteName: "My Library",
    menu: [
      { id: "home", title: "Home" },
      { title: "GitHub", link: "https://github.com/me/lib", icon: "simpleicons:github" },
    ],
    sectionOrder: ["Classes", "Modules", "Global"],
    customCssFile: "./static/custom.css",
    // 削除: default_theme (auto), search (常時 on), footer (derived)
    docs: "./docs", // 省略可能な v5 の利点
  },
}
```

</tab>

</tabs>

## v5 で解放されるもの

移行は upgrade でもあります。v5 に移ったら、次に手を伸ばしてください:

- [**API のそばに Prose guides**](/guides/combine-guides-and-api) — `docs` +
  `docGroups`、このサイトが使っているのと同じ pipeline。
- [**Authoring primitives**](/components/callouts) — comments と prose の中の
  callouts、steps、tabs、live embeds。
- [**Sidebar structure**](/guides/structure-your-sidebar) — `@category` / `@order`
  tags、`clubSidebarItems`、`menu`。
- [**LLM features**](/theme/llm-skill) — page ごとの companion `.md`、copy-page
  ボタン、`aiPrompt`。

## エージェントに任せる

手作業でやりたくないですか? **AI assistant を migration skill に向けてください。**
これは焦点を絞った、source-verified な手順で、あなたの v4 config を検出し、上記の
mapping を適用し、menu を再構成し、なくなったものを削除し、build を verify します
— それから umbrella skill を渡し、assistant が新しい v5 features の採用を手伝える
ようにします。

- **Migration skill:**
  [`SKILLS/migrate-v4-to-v5/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/migrate-v4-to-v5/SKILL.md)
  — [umbrella skill](/theme/llm-skill) と同じ方法で download してください:

  ```sh
  curl -O https://raw.githubusercontent.com/ankitskvmdam/clean-jsdoc-theme/master/SKILLS/migrate-v4-to-v5/SKILL.md
  ```

  それを assistant に添付し（または `.claude/skills/` に置き）、
  *"migrate my project from clean-jsdoc-theme v4 to v5."* と伝えてください。

- **Canonical reference:** 網羅的な
  [`MIGRATION.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/MIGRATION.md)
  と machine-readable な
  [`migration-map.json`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/migration-map.json)
  が skill を支えています — codemods に役立ちます。

## 関連項目

- [Use with an LLM](/theme/llm-skill) — umbrella skill と、それを assistant に
  渡す方法。
- [Configuration](/theme/configuration) — すべての v5 option を詳細に。
- [JSDoc Getting Started](/theme/jsdoc-getting-started) — ゼロからの新しい v5 setup。
