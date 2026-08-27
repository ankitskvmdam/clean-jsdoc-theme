---
title: LLM と一緒に使う
group: Using the Theme
order: 5
---

# LLM と一緒に使う

この theme は **LLMs のために作られています** — すべての page は companion の
`.md` と、「copy / open in Claude · ChatGPT · Perplexity」ボタンを ship します。
この page はその物語のもう半分です: *どんな* assistant にも **`clean-jsdoc-theme`
そのものの使い方と拡張の仕方** を教える、単一の download 可能な **skill file** に
ついて。

これは repo の
[`SKILLS/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/SKILLS)
folder に
[`SKILLS/clean-jsdoc-theme/SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md)
として置かれています。これを coding assistant に渡せば、推測をやめます — theme を
configure し、guides を author し、sidebar を最初から正しく構成します。

> [!NOTE]
> project の成長とともに、焦点を絞った skills が住む場所が `SKILLS/` です（package
> ごとの skills、「build a guides site」、「build an API reference」、…）。今日は、
> 以下のすべてをカバーする umbrella の `clean-jsdoc-theme` skill を ship します。

## これは何か

`SKILL.md` は、theme 全体を一箇所にまとめた自己完結型の Markdown document です —
model の memory ではなく、source に対して verified されています。これは
**agent-skill** 形式（`name` + `description` の frontmatter block）で書かれており、
skills をサポートする agents にそのまま落とし込めますが、ただの Markdown でもあり
ます: どんな LLM でも読めます。

これは端から端まで次をカバーします:

- **Setup** — JSDoc と TypeDoc、最小の動作する configs 付き。
- **すべての configuration option** — `opts` / `cleanJsdocTheme` の reference、
  さらに JSDoc-only の `templates.default` のもの。
- **Authoring** — callouts、steps、tabs、embeds、そして `@category` / `@order` /
  `@iframe` の custom tags、それらの正確な syntax 規則付き。
- **docs directory と frontmatter** — files がどう pages になるか。
- **sidebar model** — 単一の group/order engine とそのすべての levers。
- **Cross-references と source links**、**LLM features**、そして **theming**。
- **package architecture**（`utils` · `setu` · `rang` · `dwar`）— internals を
  拡張する人のために。
- assistants が最もよく犯す間違いのための **gotchas と troubleshooting** section。

## なぜ重要か

`clean-jsdoc-theme` は default の JSDoc template ではありません。一般的な「JSDoc
theme」の知識から作業する assistant は細部を間違えます — [`plugins/markdown`](/theme/jsdoc-getting-started)
が必須であることを忘れたり、custom tags に [`allowUnknownTags`](/components/overview)
が必要なことを見落としたり、[`@category`](/components/overview) の path を nest
するのは `/` だけなのに space が nest すると思い込んだりします。

> [!TIP]
> skill を前もって与えると、行ったり来たり（「その option は存在しません…」「代わり
> にこれを試してください…」）が、正しい最初の回答に変わります。これは theme が
> *あなたの* docs のために emit する companion `.md` と同じ発想です — model に真実の
> 源を前もって与えれば、人と同じくらい流暢にあなたの project を読み取ります。

## 使い方

<steps>

<step label="Download it">

skill は **folder** です —
[`SKILLS/clean-jsdoc-theme/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/SKILLS/clean-jsdoc-theme) —
軽量な `SKILL.md` と、必要に応じて読む `reference/` files（assistant は必要な部分
だけを読みます）。folder 全体を取得してください:

```sh
npx degit ankitskvmdam/clean-jsdoc-theme/SKILLS/clean-jsdoc-theme clean-jsdoc-theme
```

あるいは
[GitHub の `SKILL.md`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/SKILLS/clean-jsdoc-theme/SKILL.md)
を開いて copy するだけでもかまいません — `SKILL.md` はほとんどの質問に自己完結で
対応でき、残りについては reference files に link します。

</step>

<step label="Give it to your assistant">

お使いの setup に合うものを選んでください:

<tabs group="assistant">

<tab label="Claude Code / agents">

これはそのまま使える **skill** です。folder を project（または user）の skills
directory に置けば、agent がそれを — そしてその `reference/` files を — 必要に応じ
て load します:

```sh
npx degit ankitskvmdam/clean-jsdoc-theme/SKILLS/clean-jsdoc-theme .claude/skills/clean-jsdoc-theme
```

`name` / `description` の frontmatter こそが、いつそれを適用するかを agent に決め
させるものです。その後 `SKILL.md` がタスクごとに合致する `reference/` file を
取り込みます。

</tab>

<tab label="ChatGPT / Claude.ai / Perplexity">

chat の冒頭で `SKILL.md` を **添付または貼り付け** し、それから質問してください:

> _これは clean-jsdoc-theme 用の skill です。これを使って、sidebar で私の guides を
> API reference の上に置く `typedoc.json` をセットアップしてください。_

</tab>

<tab label="Cursor / Copilot / Windsurf">

editor の **project rules / context** に追加してください — たとえば rule file
として保存する（`.cursor/rules/clean-jsdoc-theme.md` やお使いの tool の相当物）か、
chat で file を `@`-mention して context に取り込ませます。

</tab>

</tabs>

</step>

<step label="Ask away">

「guides-only な site 用の `jsdoc.json` を書いて」から「私の `@category` がなぜ 2 つ
の groups を表示しているの?」まで — どんなことにも、theme が実際にどう動くかに
根ざした答えが返ってきます。

</step>

</steps>

## 常に最新に保つ

`SKILL.md` は code と一緒に versioned されており（`skill-revision` の stamp を
持ちます）、source に対して verified されているので、新しい copy は常にあなたが
使っている theme と一致します。skill は assistant に **updates の確認も教えます** —
関連がある場合に、session ごとに最大 1 回、自身の revision を published copy と、
あなたの installed theme version を npm の latest と比較し、どちらかが遅れていれば
update を提案します。theme を upgrade した後は、新しい options と features を
取り込むために再度 download してください。

## 自分のドキュメントに `llms.txt` を用意する

上記の skill は *この theme* についてのものです。もう一方の面は、**あなたの**
生成サイトを LLM が読めるようにすること — それは theme が代わりに行います。

すべての content page には既に companion `<page>/index.md` が付属しています
（copy-page ボタンが Claude / ChatGPT / Perplexity に渡すのがこれです）。
[`llmsTxt`](/theme/configuration#llmstxt) を設定すると、build がそれらを束ねる
index を追加します:

```json5
// jsdoc.json
opts: { siteUrl: "https://example.com", llmsTxt: true }
```

- **`/llms.txt`** — [llmstxt.org](https://llmstxt.org) の index: project 名、
  1 行の summary、そして sidebar group ごとの section。各エントリは page の
  HTML ではなく Markdown にリンクします。
- **`/llms-full.txt`** — 全 page を連結したもの。docs site 全体を 1 つの context
  window に貼り付けるときに使えます。

`siteUrl` は必須です（ファイルは単体で fetch されるため、リンクは絶対 URL で
なければなりません）。大きな API reference では `llmsTxt: { api: "index" }` に
すると index は完全なまま、生成された symbol の body を full file から外せます。

## 関連項目

- [Configuration](/theme/configuration) — skill が document するのと同じ options
  を、閲覧可能な reference として render したもの。
- [JSDoc Getting Started](/theme/jsdoc-getting-started) ·
  [TypeDoc Getting Started](/theme/typedoc-getting-started) — build をセットアップ。
- [Structure your sidebar](/guides/structure-your-sidebar) と
  [Authoring](/components/callouts) — skill が凝縮している深掘り。
