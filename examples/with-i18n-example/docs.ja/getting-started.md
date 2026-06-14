---
title: はじめに
group: Guide
order: 1
---

# はじめに

これらの文章ページは `opts.docs`（`docs/` ディレクトリ）にあり、隣接する
`docs.<locale>/` オーバーレイによってロケールごとにローカライズされます。翻訳
されたページが優先され、未翻訳のページはこのデフォルトにフォールバックします。

## インストール

```sh
pnpm add -D clean-jsdoc-theme @clean-jsdoc-theme/aadesh
```

## ロケールを宣言する

`jsdoc.json` に `opts.locales` と `opts.defaultLocale` を追加し、ビルドを実行します。

```sh
clean-jsdoc extract   # カタログを同期
clean-jsdoc build     # ロケールごとにサイトをレンダリング
```

デフォルトロケールはルートに、その他のロケールは `/<locale>` の下に出力されます。
