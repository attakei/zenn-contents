---
title: "まずはシンプルなプレゼンテーションを作成する"
---

まずは、`Sphinx`と`sphinx-revealjs`を使って、シンプルなプレゼンテーションの作成をしてみましょう。

# 仮想環境の準備をする

このガイドブック向けにしか使わないライブラリもあるので、まずはPythonの仮想環境を`venv`を使って作成していきます。

```shell-session
$ cd /path/to/workspace
$ python -m venv .venv
$ source .venv/bin/activate
(.venv) $
```

以降、ローカルマシンでの作業はこの仮想環境下であることを前提とします。

# Sphinxドキュメンテーションの新規作成をする

今回は登場人物を減らすためにも、Sphinxが用意しているコマンドでドキュメントを新規作成します。

```shell-session
$ pip install "Sphinx==8.0.2" "sphinx-revealjs=3.0.3"
(中略)
Successfully installed Jinja2-3.1.4 MarkupSafe-2.1.5 Pygments-2.18.0 Sphinx-8.0.2 alabaster-1.0.0 babel-2.16.0 certifi-2024.8.30 charset-normalizer-3.3.2 docutils-0.21.2 idna-3.8 imagesize-1.4.1 packaging-24.1 requests-2.32.3 snowballstemmer-2.2.0 sphinx-revealjs-3.0.3 sphinxcontrib-applehelp-2.0.0 sphinxcontrib-devhelp-2.0.0 sphinxcontrib-htmlhelp-2.1.0 sphinxcontrib-jsmath-1.0.1 sphinxcontrib-qthelp-2.0.0 sphinxcontrib-serializinghtml-2.0.0 urllib3-2.2.2
```

Sphinxには、ドキュメントとして必要な各種ファイルを新規作成してくれるコマンドとして`sphinx-quickstart`が用意されています。
これを使って、ドキュメンテーションとして最低限の設定を用意してもらいましょう。

基本的には `>` で始まる行でだけ入力を求められるので、必要に応じて自分用の値を入力していってください。

```shell-session:必要な箇所だけ抜粋
$ sphinx-quickstart
> Separate source and build directories (y/n) [n]: y
... ソースファイルと生成場所をフォルダレベルで分割するか。今回は [y]を選択

The project name will occur in several places in the built documentation.
> Project name: My presentation
--- プロジェクト名（必須）
> Author name(s): Kazuya Takei
... 筆者名（必須）
> Project release []:
... ドキュメントとしてのリリースバージョン。あまり気にしないのであれば何もせずにEnter

> Project language [en]: ja
... ドキュメントとしての言語。一応 [ja]日本語にしておきましょう

Finished: An initial directory structure has been created.

$ ls -R
.:
build  make.bat  Makefile  source

./build:

./source:
conf.py  index.rst  _static  _templates

./source/_static:

./source/_templates:
```

フォルダ含めて必要なファイルが用意されました。

# プレゼンテーションの中身を書いていく

生成されたファイルの中に`source/index.rst`というものがあります。
このファイルがドキュメントして扱うソースとなります。

今回は体験用に次のような内容にしてみましょう。

```rest:source/index.rst
======================================
Sphinxでのプレゼンテーションを体験する
======================================

準備
====

Python仮想環境を用意する
------------------------

ローカル共通環境に不必要なライブラリをインストールしないために、
``venv`` を使って仮想環境を用意します。

ドキュメントを新規作成する
--------------------------

``sphinx-quickstart`` を使って、ドキュメントに必要なファイル一式を用意します。

執筆
====

(TBD)
```

# sphinx-revealjsを組み込み、ビルドする

`sphinx-quickstart`で生成された直後の環境は、当然ながら他の拡張を認識していない状態です。
そのため、先程書いたソースをドキュメントHTMLとしての出力が可能ですが、プレゼンテーションとして出力することは出来ません。
ここからは、このドキュメントで`sphinx-revealjs`を使うための設定をしていきます。

## 設定をする

編集する対象となるのは、`source/conf.py`です。

```python:source/conf.py
# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
   # 使用する拡張としてsphinx-revealjsを新規追加
   'sphinx_revealjs',
]
```

ここを編集するだけで、プレゼンテーション用のビルドが実施できるようになります。

## ビルドをする

実際にビルドを行ってみて、生成物の確認をしてみましょう。

```shell-session
$ make revealjs
Running Sphinx v8.0.2
loading translations [ja]... done
making output directory... done
building [mo]: targets for 0 po files that are out of date
building [revealjs]: targets for 1 source files that are out of date
updating environment: [new config] 1 added, 0 changed, 0 removed
reading sources... [100%] index
looking for now-outdated files... none found
pickling environment... done
checking consistency... done
preparing documents... done
writing output... [100%] index
generating indices... genindex done
writing additional pages... search done
copying static files... done
copying extra files... done
dumping search index in Japanese (code: ja)... done
dumping object inventory... done
build succeeded.

The HTML pages are in build/revealjs.
```

静的なHTMLが生成されるので、ブラウザで直接表示して確認することが出来ます。

![presentation-top-1.png](https://storage.googleapis.com/zenn-user-upload/yts2auwnd2llrxji07ap6a1heovx)

# 工夫1: 違うテーマを使ってみる

`Reveal.js`では組み込みでのカラーテーマがいくつか提供されています。

`sphinx-revealjs`では何も設定がない場合は、`black`を使用する動作になっています。
これは、設定を追記すればテーマが変わるようになっています。

## Reveal.jsの組み込みテーマ一覧

`beige` / `black` / `blood` / `league` / `moon` / `night` / `serif` / `simple` / `sky` / `solarized` / `white`

## 実際に設定してみる

「黒系じゃなくて明るめの背景にしてみようか？」ということで、`sky`にしてみましょう。
`revealjs_style_theme`という設定を編集することで、指定できます。

```python:source/conf.py
revealjs_style_theme = 'sky'
```

この設定をしても生成済みにプレゼンテーションには反映されません。 そのため、設定変更を行ったら`make revealjs`で再生成しましょう。

![presentation-top-2.png](https://storage.googleapis.com/zenn-user-upload/btsjeqmzeqlxaf6uaf96p3mozlia)

# 工夫2: CSSで見た目を個別に変える

`Reveal.js`のよくあるテーマでは、各セクションのヘッダー文の英字テキストが全て大文字になります。
今回は、このタイミングでちょっとひと工夫して、この設定を解除しましょう。

## CSSファイルを用意する

まずは、テキストの大文字・小文字を変換する設定を無効化するスタイルを用意して、CSSファイルにしましょう。
Sphinxでドキュメントをまたいで使う静的ファイルは`_static`フォルダで管理することが多いです。

```css:source/_static/slides.css
.reveal h1, .reveal h2, .reveal h3, .reveal h4, .reveal h5 {
  text-transform: none;
}
```

参照元: https://github.com/hakimel/reveal.js/issues/2226

Reveal.jsの組み込みテーマの多くでは、`text-transform: uppercase;`が標準で指定されています。
そのため、指定を解除したい場合は上記のように`text-transform: none;`でもとに戻す必要があります。

## ビルド時に組み込むようにする

単純にファイルを用意しても取り込んでくれないので、再び`source/conf.py`を編集して「プレゼンテーションHTML生成時にCSSを使用する」設定を加えましょう。

```python:source/conf.py
revealjs_style_theme = 'sky'
# Reveal.jsプレゼンテーションで使う静的ファイルを管理しているフォルダを指定
revealjs_static_path = ['_static']
# Reveal.jsプレゼンテーションで使うCSSファイルを指定
# revealjs_static_pathで指定したフォルダからのパス
revealjs_css_files = [
    'slides.css',
]
```

変更したら`make revealjs`を忘れずに。

![presentation-top-3.png](https://storage.googleapis.com/zenn-user-upload/aw0aevedlbrl9pvbgjfx7v0iibxy)
