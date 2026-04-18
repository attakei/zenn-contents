---
title: "Sphinxの日本語検索性能をLinderaで(また)向上させる"
emoji: "🔍"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx", "python", "形態素解析", "lindera"]
published: false
---

以前にこんな記事を書いて公開しました。

https://zenn.dev/attakei/articles/tokenize-japanese-on-sphinx

この過程で、`atsphinx.toybox.lindera_search`というモジュールを作っていたのですが、
いろいろな事情を経て `atspninx-lindera` という単体パッケージとして公開し直すことにしました。

https://pypi.org/project/atsphinx-lindera

この記事では「」「」「」「」をお送りします。

## そもそも何をするものか

atsphinx-lindera は、大雑把に伝えると「SphinxでLinderaを使った【何か】をする」ためのライブラリです。
一応は【何か】として複数の機能を想定していますが、現時点では前述の経緯を持つ「Sphinxの日本語をトークナイズする」機能のみを持っています。

### Linderaの超簡単な紹介

LinderaはRust製の形態素解析ライブラリです。
日本語用の形態素解析ライブラリはMeCabなどがありますが、「動作が高速」かつ「OSを選ばない」というあたりが助かるポイントだったりします。

https://lindera.github.io/lindera/ja/

### 使い方

導入は非常にシンプルで、Sphinxドキュメントがあるなら「ライブラリをインストールする」「`conf.py`を編集する」という2手順で済みます。

```console:pipでのインストール例
pip install atsphinx-lindera
```

```python:conf.py
html_search_options = {
    "type": "atsphinx.lindera.splitter.LinderaSplitter",
}
```

この状態で`sphinx-build`を実行すると、自動で辞書ファイルのダウンロードして、ドキュメント検索用のファイル生成時にLinderaを使ったトークナイズをします。

## toybox版との違い

ここまでは、toybox版で使えた機能と全く同じで、検索用のトークナイズを実行するための "Splitter" を提供しているだけです。
ここからは追加で出来るようになった、「辞書ファイルの入れ替え」を紹介します。

atsphinx-linderaは、PythonでLinderaを使うための lindera-python が依存ライブラリとなっています。
先程「自動で辞書ファイルのダウンロードをして」と書いたのですが、lindera-pythonはインストール時点では辞書ファイルを同梱していません。
そのため、ライブラリを使用する側で辞書を用意する必要があります。

atsphinx-linderaのSplitterクラスからは、オプションで辞書ファイルの指定が可能になっています。
デフォルトではIPADICをダウンロードしますが、LinderaのGitHub Releases上にある別の辞書を指定できます。

```python:IPADIC NEologdを使うケース
html_search_options = {
    "type": "atsphinx.lindera.splitter.LinderaSplitter",
    "dict_type": "ipadic-neologd",
}
```

IPADIC NEologdを使うことで、処理コストと引き換えに検索精度のさらなる向上を計れます。

また、韓国語や中国語の辞書ファイルも提供されているため、これらの言語の検索性能も向上する可能性があります。

使用可能な辞書は、[atsphinx-lindera](https://atsphinx.github.io/lindera/ja/usage/splitter/)か[Lindera](https://lindera.github.io/lindera/ja/concepts/dictionaries.html)の対象ドキュメントを参照して下さい。

## 未来への妄想

## 余談: この機会に取り組んでみたこと
