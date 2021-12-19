---
title: "まずはシンプルなプレゼンテーションを作成する"
---

まずは、`Sphinx`と`sphinx-revealjs`を使って、シンプルなプレゼンテーションの作成をしてみましょう。

# 仮想環境の準備をする

このガイドブック向けにしか使わないライブラリもあるだろうため、まずはPythonの仮想環境を`venv`を使って作成しましょう。

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
$ pip install "Sphinx==3.4.3" "sphinx-revealjs==1.0.1"
(中略)
Successfully installed Jinja2-2.11.3 MarkupSafe-1.1.1 Pygments-2.7.4 Sphinx-3.4.3 alabaster-0.7.12 babel-2.9.0 certifi-2020.12.5 chardet-4.0.0 docutils-0.16 idna-2.10 imagesize-1.2.0 packaging-20.9 pyparsing-2.4.7 pytz-2021.1 requests-2.25.1 snowballstemmer-2.1.0 sphinx-revealjs-1.0.1 sphinxcontrib-applehelp-1.0.2 sphinxcontrib-devhelp-1.0.2 sphinxcontrib-htmlhelp-1.0.3 sphinxcontrib-jsmath-1.0.1 sphinxcontrib-qthelp-1.0.3 sphinxcontrib-serializinghtml-1.1.4 urllib3-1.26.3
```

Sphinxには、ドキュメントとして必要な各種ファイルを新規作成してくれる`sphinx-quickstart`が用意されています。
これを使って、ドキュメンテーションとして最低限の設定を用意してもらいましょう。

基本的には `>` で始まる行でだけ入力を求められるので、必要に応じて自分用の値を入力していってください。

```shell-session:必要な箇所だけ抜粋
$ sphinx-quickstart
> Separate source and build directories (y/n) [n]:
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

`sphinx-quickstart`で生成された直後は、当然ながら他の拡張を認識していない状態です。
そのため、先程書いたソースをドキュメントHTMLとして出力可能ですが、プレゼンテーションには出来ません。
ここからは、このドキュメントで`sphinx-revealjs`を使うための設定をしていきます。

## 設定をする

編集する対象となるのは、`source/conf.py`です。

```python:source/conf.py
# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
   # 使用する拡張としてsphinx-revealjsを新規追加
   'sphinx_revealjs',
]
```

最低限ではここを編集するだけで、プレゼンテーション用のビルドが実施できるようになります。

## ビルドをする

実際にビルドを行ってみて、生成物の確認をしてみましょう。

```shell-session
$ make revealjs
Running Sphinx v3.4.3
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

`sphinx-revaljs`では何も設定がない場合は、`black`が採用される動作になっています。
これは、設定を追記すればテーマが変わるようになっています。

## Reveal.jsの組み込みテーマ一覧

`beige` / `black` / `blood` / `league` / `moon` / `night` / `serif` / `simple` / `sky` / `solarized` / `white`

## 実際に設定してみる

「黒系じゃなくて明るめの背景にしてみようか？」ということで、`sky`にしてみましょう。
`revealjs_style_theme`という設定を編集することで、指定できます。

```python:source/conf.py
revealjs_style_theme = 'sky'
```

即時で反映されないので、設定変更を行ったら`make revealjs`で再生成しましょう。

![presentation-top-2.png](https://storage.googleapis.com/zenn-user-upload/btsjeqmzeqlxaf6uaf96p3mozlia)

# 工夫2: CSSで見た目を個別に変える

`Reveal.js`のよくあるテーマでは、各セクションのヘッダー文の英字テキストが全て大文字になります。
今回は、このタイミングでちょっとひと工夫して、この設定を解除しましょう。

## CSSファイルを用意

まずは、テキストの大文字・小文字を変換する設定を無効化するスタイルを用意して、CSSファイルにしましょう。
Sphinxでドキュメントをまたいで使う静的ファイルは`_static`フォルダで管理することが多いです。

```css:source/_static/slides.css
.reveal h1, .reveal h2, .reveal h3, .reveal h4, .reveal h5 {
  text-transform: none;
}
```

参照元: https://github.com/hakimel/reveal.js/issues/2226

Reveal.jsの組み込みテーマの多くでは、`text-transform: uppercase;`が標準で指定されています。
そのため、それらのテーマで打ち消すためには上記のように`text-transform: none;`でもとに戻す必要があります。


## ビルド時に組み込むようにする

単純にファイルを用意しても取り込んでくれないので、再び`source/conf.py`を編集して「プレゼンテーションHTML生成時にCSSを使用する」設定を加えましょう。

```python:source/conf.py
revealjs_style_theme = 'sky'
# 普通のHTMLと同じものを使えるので、簡単な設定として指定
revealjs_static_path = html_static_path
# Reveal.jsプレゼンテーションで使うCSSファイルを指定
# revealjs_static_pathで指定したフォルダからのパス
revealjs_css_files = [
    "slides.css",
]
```

変更したら`make revealjs`を忘れずに。

![presentation-top-3.png](https://storage.googleapis.com/zenn-user-upload/aw0aevedlbrl9pvbgjfx7v0iibxy)
