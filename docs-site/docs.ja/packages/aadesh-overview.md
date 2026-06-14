---
title: 概要
group: Packages/aadesh
order: 20
---

# `@clean-jsdoc-theme/aadesh`

`@clean-jsdoc-theme/aadesh` は clean-jsdoc-theme の **localization CLI** です。これは
i18n のうち、disk-bound でプロセスをオーケストレーションする側を担当します —
[bhasha](/packages/bhasha-overview)（純粋で browser-safe な core）が意図的に行わない作業、
すなわち JSDoc/TypeDoc pipeline の spawn、committable な locale catalog の読み書き、
そして locale ごとに 1 つの static site を render することです。

> [!NOTE]
> **なぜこの名前なのか？** *aadesh* (आदेश) はサンスクリット語/ヒンディー語で
> **command / instruction** を意味します — プロジェクトの command-line interface に
> ぴったりの名前です。

公開される binary は **`clean-jsdoc`** です。ほとんどのプロジェクトは 4 つの
subcommands を通じてこれを使います（引数なしで実行すると interactive menu も
表示されます）:

```sh
clean-jsdoc extract    # sync the per-locale catalogs from your docs
clean-jsdoc prompt     # (optional) emit an LLM translation prompt
clean-jsdoc validate   # preflight the catalogs
clean-jsdoc build      # render one site per locale
```

> 単一言語の site だけを ship したいのであれば、aadesh は一切必要ありません —
> JSDoc/TypeDoc entry points がそれを直接 build します。aadesh は **複数の言語**
> が欲しくなったときに加える layer です。完全な walkthrough は
> [docs を localize する](/guides/localize-your-docs) にあります。

## どこに位置するか

Locale は **build dimension** であり、runtime toggle ではありません: 各言語は
それぞれの static output に render され（default locale は prefix なし、その他は
`/<locale>` の下）、language switcher はそれらの間の navigation にすぎません。その
fan-out は aadesh が担います。aadesh はあなたの locale config を、すでに使っている
**同じ `jsdoc.json` opts**（`opts.locales` + `opts.defaultLocale`）から読み取ります
— 別の config file はありません — そして本物の theme pipeline を 2 回駆動します:
一度は *extract mode* で translatable strings を取り出すため、そして locale ごとに
一度ずつ *build mode* で translations を stamp し戻すためです。

## The commands

- **`extract`** — pipeline を extract mode で実行し、すべての translatable string を
  収集して（UI chrome + API descriptions/summaries/example captions + parameter と
  return の descriptions）、それらを locale ごとに 1 つの committable な JSON に
  sync します。再実行は merge です: 新しい keys が追加され、source の変更は key を
  *stale* としてマークし、削除された keys は soft-delete されます（`--prune` までは
  保持される）ので、rename が translator の作業を取りこぼすことはありません。変更の
  ない run は git diff がゼロになります。
- **`prompt`** — locale ごとに、そのまま使える LLM translation prompt の **file** を
  書き出します（`clean-jsdoc-theme-artifacts/locales/prompts/` の下に、context limits
  に合わせて chunk 分割）。新しい keys と stale keys のみを対象とし、正確な return-JSON
  shape と、markdown / `{@link}` / code fences / `{var}` tokens を保持するための
  指示を含みます。各 file を LLM に paste します（または `.md` を upload します）。
  この directory は git-ignored であり、run のたびに regenerate されます。
- **`validate`** — catalogs を preflight します: coverage gap は warn し
  （"using the default"）、malformation（broken markdown-in-slot、落ちた `{var}`
  token、未知の keys）は error になります。default では resilient であり、`--strict`
  は CI 向けに warnings を failures に escalate します。
- **`build`** — template + filled catalogs → setu stamp → dwar render → locale ごとに
  1 つの site。language switcher と `hreflang` alternates を feed する cross-locale
  index を所有します。

すべての prompt には flag equivalent があり（`--config`、`--dir`、`--prune`、`--strict`、
`--locale`、`--chunk-size`、`--typedoc`）、そのため CLI は CI で headless に実行され、
決して block しません。

## The artifacts

Catalogs は `clean-jsdoc-theme-artifacts/locales/` の下に置かれ、あなたの repo に
**committed** され、手で（またはあなたの translation workflow によって）編集されます。
各 locale は 2 つの files です:

```
clean-jsdoc-theme-artifacts/locales/
  en.json        # editable: _version + chrome.* / api.* translations
  en.meta.json   # auto-managed: source hashes + soft-deleted keys (don't touch)
  ja.json
  ja.meta.json
```

editable file には translator が変更するものだけが含まれます; staleness hashes と
soft-deletes は隣の `.meta.json` に置かれるので、machine の bookkeeping があなたの
レビューする file を散らかすことはありません。

## Prose localization

keyed catalogs とは別に、free-form prose は **file 単位** で localize され、extraction
は不要です:

- **Home page** — 設定済みの README の隣にある `README.<locale>.md` が、その locale の
  home として render されます（存在しない場合は default README に fall back します）。
- **Docs** — 隣接する `docs.<locale>/` directory が、あなたの `opts.docs` を file 単位で
  overlay します: translated page が勝ち、欠けている page は default doc に fall back
  します。

## Interactive mode

`clean-jsdoc` を subcommand なしで実行すると、guided menu が表示されます: welcome
banner、各 command の description を表示する command picker、その options の prompts
（defaults が事前入力済み）、そして equivalent command をあなたの `package.json`
scripts に保存するという提案 — これにより `npm run <key>` で再実行できます。

## Read the source

- **Package directory:**
  [packages/aadesh](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh)
  ·
  [packages/aadesh/src](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src)
- **CLI entry + subcommands:**
  [`cli.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/cli.ts)
  ·
  [`runners.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/runners.ts)
  ·
  [`interactive/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/interactive)
- **Commands:**
  [`commands/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/commands)
  (extract / prompt / validate / build)
- **Catalog core (pure):**
  [`locale/`](https://github.com/ankitskvmdam/clean-jsdoc-theme/tree/master/packages/aadesh/src/locale)
  (template, merge, file model) ·
  [`artifacts.ts`](https://github.com/ankitskvmdam/clean-jsdoc-theme/blob/master/packages/aadesh/src/artifacts.ts)
  (the disk layer)

## 次へ

- [docs を localize する](/guides/localize-your-docs) — end-to-end の workflow。
- [bhasha 概要](/packages/bhasha-overview) — aadesh が構築の土台とする純粋な i18n core。
