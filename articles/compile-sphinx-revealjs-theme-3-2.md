---
title: "sphinx-revealjs 3.2 以降のスライドテーマビルドの注意点"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["sphinx", "revealjs", "sass"]
published: false
---

少し前に、sphinx-revealjsのv3.2.0をリリースしました。

https://pypi.org/project/sphinx-revealjs/3.2.0/


## そもそもsphinx-revealjsって？

主にPythonista向けのプレゼンテーションビルダーです。
Sphinxをベースにしており、reStructuredTextやMarkdown(MyST-Markdown)から、Reveal.jsを使ったHTMLプレゼンテーションを生成できます。

細かく知りたい人は、上記リンク経由でGitリポジトリやドキュメントを見てください。

## 変更点

大雑把に書くと、このあたりに変更がかかっています。

* バンドルしているReveal.jsのバージョンをv5.1.0からv5.2.1に変更。 [^1]
* オプション拡張として、 `sphinx_revealjs.ext.oembed` と `sphinx_revealjs.ext.sass` を追加。 [^2]
* 要求Sphinxバージョンを少し固定。

[^1]: v5.2.0もあったのですが、追従作業が間に合いませんでした。
[^2]: この内、`sphinx_revealjs.ext.oembed` は今回の記事では取り上げません。

sphinx-revealjsはリリースバージョン管理にSemantic Versioningを採用しており、今回はマイナーバージョンの更新です。
そのため、ほとんどのユーザーにとっては何も気にせずアップデートして問題ない想定でいます。
（Sphinxのバージョンが古くてビルドに失敗する人は、この機会に更新しましょう）

しかしながら、SemVerにおける【パブリックなAPI】の変更ではないのにもかかわらず、特定条件下でビルドに失敗するケースがあります。

## ビルドが失敗する条件

先ほど触れた「特定条件下」とは、下記のようなものとなっています。

* sphinx-revealjsをv3.2.0以前から使っている。
* 組み込みのテーマ [^3] ではなくカスタムテーマを使っている。
* カスタムテーマの生成に際して、Sassコンパイルを行っている。 [^4]
* Sassコンパイルの手法が、Pythonの`libsass`だったり、Sphinx拡張の`sphinxcontrib-sass`を用いたりしたものである。

[^3]: いわゆる、`conf.py` の `revealjs_style_theme` に `"black"` のような単純文字列ではなく、 `"theme.css"` のようなファイルを直接指定しているケース。
[^4]: 例えば、`theme.css`内でオリジナルのテーマCSSを`@import`で読み込む手法でのカスタマイズも可能です。

## 対処方法

手っ取り早く対処するには、sphinx-revealjsのバージョンをv3.2.0に更新するタイミングで、下記のことをすればよいです。

* `conf.py` の `extensions` に `"sphinx_revealjs.ext.sass"` を加える。
* ※ `conf.py` の `extensions` から `"sphinxcontrib.sass"` を取り除く。 [^5]
* `conf.py` にある、 `sass_` で始まる変数を、すべて `revealjs_sass_` で始まるようにプレフィックスを更新する。

基本的にこれだけで、正常にテーマのビルドが出来るようになっているでしょう。 [^6]

[^5]: ※をつけているのは、取り除かなくても害はない認識のため。
[^6]: https://github.com/attakei/slides/commit/17d5e3a41255587f3d4c2d5d6c3bbb6cda7689d8

## この事象はなぜ起きたのか？

Reveal.js が v5.1.0からv5.2.0にアップデートする過程で、「とある変更」が加わりました。

https://github.com/hakimel/reveal.js/compare/5.1.0...5.2.0#diff-391523b6570a8aa73c937279be7cb07bc2083a2f9655a6db4b81fcbfddce70be

下記のコードはリンク先にあるDiffを抜粋したものです。

```diff:scss:css/theme/source/beige.scss
  // Default mixins and settings -----------------
+ @use "sass:color";
  @import "../template/mixins";
  @import "../template/settings";
  // ---------------------------------------------
  @@ -23,7 +24,7 @@ $headingColor: #333;
  $headingTextShadow: none;
  $backgroundColor: #f7f3de;
  $linkColor: #8b743d;
- $linkColorHover: lighten( $linkColor, 20% );
+ $linkColorHover: color.scale( $linkColor, $lightness: 20% );
  $selectionBackgroundColor: rgba(79, 64, 28, 0.99);
```

先頭で `@use` を使ったmixinのロードが行われ、変数 `$linkColorHover` の値がロードした `color` を使用したものに置き換わっています。 [^7]

この `@use` 構文はDart Sassの1.23.0でサポートされれているのですが、[仕様のページ](https://sass-lang.com/documentation/at-rules/use/)にあるとおり、LibSassなどでは対応されていません。
つまり、Reveal.jsからv5.2.0からはついに **【Sass実装の互換性】が無くなり、Dart Sassでしかコンパイルできなくなりました。**

`sphinxcontrib-sass`は内部でのSass/SCSSのコンパイルにLibSassを用いています。
結果として、コンパイル不可能なソースが渡されるようになってしまい、ビルド全体がエラーになってしまいます。

[^7]: ざっと見た感じでは、全部のテーマSCSSファイルに適用されています。

## 【対処方法】はどのような取り組みをしたのか

この対処方法に重要な役割を果たすのが、新しく追加したオプション拡張である `sphinx_revealjs.ext.sass` です。

これは名前の通り「sphinx-revealjsのプロセスに寄せて、Sass/SCSSをCSSにコンパイルする」機能を持ちます。
言ってしまえば「sphinx-revealjsに特化した `sphinxcontrib-sass` 」とも言えます。

内部実装については、複雑なことをしているわけではなく、次の2工程を行うだけだったりします。

1. 初回起動時にDart Sassの実行環境を丸ごとダウンロードする。 [^8]
2. 設定ファイルからコンパイル対象を検知して、LibSassと同じタイミングでDart Sassにコンパイルさせる。

見かけ上の挙動は `sphinxcontrib-sass` とほとんど同じため、使用感はほとんど変わらずに対応できるでしょう。

[^8]: https://github.com/sass/dart-sass/releases/tag/1.86.3 のように、Dart Sassはリリース時に実行バイナリのセットを提供しています。

:::details 余談：追加の動作について
とはいえ、 `sphinxcontrib-sass` と比較すると、ちょっとした機能追加もしています。

具体的には、次のようなことも出来るようになっています。

* `get_revealjs_path() / "css" / "theme"` で取得していたテーマ用のリソースファイルは最初から参照可能にしている。
* `revealjs_sass_auto_targets = True` にすることで、`revealjs_sass_src_dir`配下の全Sass/SCSSを自動でコンパイル対象にする。

どちらも `conf.py` の記述負荷を減らす、ちょっとしたひと手間です。
:::

## これは「破壊的変更」ではないのか

最後に、この修正を v3.2.0 にしたときの経緯を書いて終わりにします。

<!-- textlint-disable -->

ここまでの説明で書いた通り、sphinx-revealjs + sphinxcontrib-sass の組み合わせで使っている人にとって、今回の変更は `conf.py` や依存ライブラリに影響を与える変更となっています。

<!-- textlint-enable -->

この際の整理として下記のような理由付けを行い、「この変更は【破壊的変更】ではない」と判定しています。

* 機能としてのコアである `revealjs` / `dirrevealjs` のビルダーそのものには何も変更が掛かっていない。
  * これは、sphinxcontrib-sass側でCSSのコンパイルに失敗をするものの、最終生成物としてのHTML自体には変化が起きないことを意味している。
* 併せて、sphinx-revealjsにとって【パブリックなI/O】はどこになるか？を考えるときに、次の2点と考えられる。そして、これらは今回の修正には無関係。
  * `conf.py`に記述する「sphinx-revealjs専用」の設定項目
  * 前述した、ビルダーとしての出力

