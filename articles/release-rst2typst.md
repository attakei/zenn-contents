---
title: "reStructuredTextからTypst経由でPDFを出力したい（のでライブラリを作った）"
emoji: "📝"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["restructuredtext", "typst", "sphinx"]
published: true
published_at: 2026-03-01 09:00
---

## 技術同人誌を書く環境あれこれ

技術同人誌を書くアプローチは、様々な手法があります。

シンプルな手法だとMicrosoft Wordを初めとしたワープロソフト、真逆のデザイン志向に全振りするとAdobe InDesignなどがあります。 [^1]
技術書典などで見かけるものとしては、プレーンテキストをベースに執筆を進める[Re:VIEW](https://reviewml.org/ja/)などもあります。

[^1]: https://youtu.be/MmP5zbMjvNI?list=PLKtI82pFM8xAs2jfT0UqxJhXFsS33n6xM&t=2320

さて、自分は技術書典向けに出してみた同人誌が1冊+αあります。 [^2]
これらは、Sphinxの`latexpdf`ビルダーを用いたもので、「reStructuredText（以下"reST"と省略）で原稿を書きつつGitHub Actions上でPDFを生成する」というRe:VIEWに近いアプローチを取っています。

[^2]: 通常の頒布本を1冊と、企画倒れにならないように出したサンプル版が1冊。

この手法は普段ドキュメントHTMLのために使っていた文法やライブラリをそのまま電子書籍へ転用できます。
そのため「ドキュメントをSphinxを使って書く」という人にとっては、有力な選択肢の1つとなります。

一方で`latexpdf`ビルダーを使っていると、ちょっとした不満点があります。
このビルダーは名前の通り「一度LaTeXフォーマットへ出力した後にLaTeXコードからPDFを生成する」という動作をします。
そのため、次のような（自分にとっての）難点を抱えています。

<!-- textlint-disable -->

* LaTeX環境のセットアップコストがそれなりに高い。（時間的にも容量的にも）  
* そもそもTeXフォーマットへの習熟がある程度必要となる。
* レイアウト周りなどの調整時に、Sphinxに同梱されているテンプレートの構造を追う必要がある。

<!-- textlint-enable -->

## LaTeXの代替手段を探す

そんなわけでLaTeXに代わる組版を探していたのですが、目をつけたのがTypstです。

https://typst.app

[日本語化されたドキュメント](https://typst-jp.github.io/docs/)があるので細かくはこちらを見てもらうとして、大まかには次のような特徴を持っていると考えてもらえばよいです。

* 簡素（よく言えばシンプル）なマークアップ言語を提供。
* サイズ等が軽量で比較的高速に動作するコンパイラー。
* 比較的わかりやすく導入可能なライブラリ群。

LaTeXの置き換えを目標にしており、文法を抑えておけばこれだけで技術同人誌を書くのは困りません。
主要なIDEには執筆をサポートする拡張が存在するため、気になる人は試してみるとよいでしょう。

## それでもSphinxで執筆したい

とはいえ、個人的にはあくまでSphinx（reST）で執筆をしたいと思っています。
現時点で取り上げられる理由としては、次のような部分がそうです。

* リフロー版として、同じソースからPDFとEPUBを同時に生成したい。
* あくまで「組版のための命令」であるTypst言語に対して、reSTは文書の構造化へのウェイトが大きく文書の執筆向き。
* docutils/Sphinxのディレクティブを使ってソースを書きたい。

しかし、Sphinx本体にもSphinxの主要な拡張にも「Typstを使ってPDFを生成する」機能は存在しません。

### OSSの文化「ないなら…」

というわけで、「validなTypstコードを出力しつつPDFを出力する」機能を持つSphinx拡張を作ることにしました。

これ自体は2025年の夏頃に[atsphinx-typst](https://pypi.org/project/atsphinx-typst/)という名前でPyPI上にアップロードしています。
しかし、しばらく間があったのと、別件で作っていたライブラリの思想に寄せるアプローチを取り、**「docutilsの拡張機能としてreSTからTypstコードを出力する」**部分に特化したライブラリを別途作ることにしました。 [^3]

[^3]: これは、docutilsとSphinxの担当領域を踏まえて、「Typstへの変換」「関連リソースの調停」という枠組みに拡張側を分割することにしたためです。

## rst2typstの紹介

ここからが本題となるライブラリの紹介です。名前は**rst2typst**となります。
これはdocutils同梱のCLIコマンドの名称に揃えた形式となっています。

https://pypi.org/project/rst2typst/

基本的な役割は前章で書いた通り「reST（をパースして出来たDocTree）からTypstコードを生成する」ことに特化しています。
優先順位を「自分が技術書を執筆するときに必要な文法」に注力して、現時点でも単体のreSTから電子書籍っぽいPDFを生成するところまでは動作します。

## rst2typstの使い方

### インストール

PyPIにはアップロード済みのため、pipなどでインストールができます。

```console:インストール例
pip install rst2typst
```

PyPIにはTypstのPythonバインディングも存在するので、下記のように`pdf`付きでインストールすればPDF生成まで一括で行えます。

```console:インストール例（PDFビルドもする時）
pip install 'rst2typst[pdf]'
```

### ドキュメントを書く

普通にreSTでドキュメントを書いてみてください。
自分が普段遣いしている文法向けの動作は実装したので、基本的には「よくあるreST」を書いている文には問題ないでしょう。

注意点として「docutils本体で実装されているもの」のみを対象にしているため、**Sphinx固有のディレクティブは非対応**ということには気をつける必要があります。
具体的には`toctree`あたりのディレクティブでしょうか。

また、Sphinxはビルドの過程でdocutilsが中間生成したDocTreeを更に加工したうえで最終出力をします。
そのため、ドキュメントの構成自体がSphinxの出力するものと若干違ってきます。

### 2パターンのビルド

先程書いたreSTドキュメントをビルドしていきます。ライブラリは2個のCLIコマンドを提供しています。

* `rst2typst` : docutilsを用いてTypstのソースコードを生成する。
* `rst2typstpdf` : Typstのソースコードを中継してPDFを出力する。要`typst`オプション付きインストール。

どちらも引数にドキュメントのファイルパスを指定することでビルド処理を実行します。
また、通常では標準出力にビルド結果を出力しますが、引数に別のファイルパスを指定することでファイルとして保存できます。
特に`rst2typstpdf`は出力内容がPDFバイナリーなので、ファイル保存する方が良いでしょう。

```console:コマンド実行例
$ rst2typst document.rst
(Typstコードが出力される)

$ rst2typstpdf document.rst document.pdf
(document.prf に保存される)
```

## 未完成でもなんとかするためのワイルドカードたち

この記事を書いた時点でのバージョンはv0.1.0なのですが、強い意思を持って「v0.1.0の時点で実装する」と決めた機能が2つあります。
それが、ここのタイトルでもある「`raw`ディレクティブ」と「CLIの`--template`オプション」です。

### `raw`ディレクティブ

Sphinxでの `raw` のよくある使い方として「SNSの共有用HTMLを直接埋め込む」というものがあります。
YouTubeに動画を埋め込む場合、このようなreSTコードを書いたりします。 [^5]

[^5]: このケースだと、[oEmbedPy](https://pypi.org/project/oEmbedPy)を使うほうが楽ですが。

```rst:HTMLビルド用にiframeを埋め込む記述

.. raw:: html

   <iframe
       width="560"
       height="315"
       src="https://www.youtube.com/embed/SL59wvsyz3A?si=iP5Er3W55VukNywr"
       title="YouTube video player"
       frameborder="0"
       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
       referrerpolicy="strict-origin-when-cross-origin"
       allowfullscreen
   >
   </iframe>
```

上記の例では`raw`の引数に`html`と指定することでHTMLを必要とするときだけ中身をそのまま使うようになっています。
同様に、`typst`という引数を指定しいた場合はそのままTypstのコードとして埋め込む処理をします。

```rst:明示的に改ページをするときに記述
ここの文で改ページが発生して、

.. raw:: typst

   #pagebreak()

ここは次のページになる。
```

これを使うことで、「rst2typstとして未実装な文法を代替する」「そもそもdocutils非対応の表現をする」ことを可能にします。

### `--template`オプション

HTML+CSSのように、Typstでも「定義やカスタマイズの宣言」と「コンテンツ」を切り離すような書き方が可能です。
しかし、rst2typstの構造上の理由で、出力するTypstコードの最序盤に限っては`raw`ディレクティブを差し込むことが出来ません。 [^6]

[^6]: 単純なreSTに対応した出力をしているわけではなく、モジュールのインポートなどを先頭に出力する処理となっているため。

この要件への対応等を目的として、`--template`オプションを使用することが出来ます。
未指定の場合は、下記のようなファイルを使用します。（いずれもrst2typstの内部で生成している項目）

```txt:teamplate.txt
{imports}
{includes}
{body}
```

<!-- textlint-disable -->

例えば下記のような感じにすると、

<!-- textlint-enable -->

```txt:teamplate.txt
# include
{imports}
{includes}
{body}
```

```console:--templateオプションを使うコマンド実行例
$ rst2typst --template=template.txt document.rst
```

このファイルを指定することで、カスタムテンプレートを使用することが出来ます。
これ単体ではそこまで効果的ではないのですが、`raw`ディレクティブに関数やモデルを指定しつつその定義をコンテンツ外に置くことで、コードの可読性が上がります。

## おわりに

というわけで、rst2typstの紹介をしてみました。
冒頭にちょっと触れた技術書典で頒布する予定のものがあり、今回はこのrst2typstかatsphinx-typstで作業をする予定でいます。
無事に1冊書けそうだったら、その顛末をまた技術同人誌にしてみようと考えています。
