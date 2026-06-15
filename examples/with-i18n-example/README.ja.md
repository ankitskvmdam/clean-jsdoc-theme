# Widget Kit — ローカライズされたドキュメントの例

**`clean-jsdoc-theme` の多言語サポート**のための最小構成のサンプルです。
英語（`en`、デフォルト）・日本語（`ja`）・ヒンディー語（`hi`）の 3 言語で
ビルドされています。

API リファレンス（`Widget` クラスとモジュール概要）は
`clean-jsdoc-theme-artifacts/locales/` に置かれたカタログによってロケールごとに
翻訳され、UI（検索・ナビゲーション・設定・目次）もローカライズされています。
このホームページは `README.<locale>.md` によってロケールごとにローカライズされます。
言語を切り替えるには、ヘッダーの **Languages** コントロールを使ってください
（デスクトップでは検索アイコンの右、モバイルではメニューボタンの前にあります）。

## 試してみる

```sh
pnpm install
pnpm --filter example-with-i18n run docs   # build the theme, then every locale
pnpm --filter example-with-i18n run serve  # serve ./dist
```

デフォルトのロケールはルート（`/`）に、その他は `/ja` と `/hi` に出力されます。

## ローカライズのワークフロー

```sh
clean-jsdoc i18n extract   # API + chrome キーに対してロケール別カタログを同期
clean-jsdoc i18n prompt    # （任意）未翻訳キー用の LLM プロンプトを出力
clean-jsdoc i18n validate  # カタログを事前チェック
clean-jsdoc build          # スタンプしてロケールごとにサイトをレンダリング
```

> 注: ホームページはローカライズされています。`aadesh build` は隣接する
> `README.<locale>.md`（ここでは `README.ja.md` / `README.hi.md`）を読み取り、
> そのロケールのホームとしてレンダリングします。バリアントが無い場合は
> `README.md` にフォールバックします。残るプローズトラックの課題は、ホームでは
> なく複数ページのドキュメント／チュートリアルです。
