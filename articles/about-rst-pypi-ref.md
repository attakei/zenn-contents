---
title: "rst-pypi-refで、ドキュメンテーション時のPyPIリンクを楽にする"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - reStructuredText
  - PyPI
  - Sphinx
published: true
---

去年のPyCon JP 2022のスライド作成中に発生した脳内需要をライブラリ化していたものの、PyPI登録をするだけして特段アナウンスをしていませんでした。
ちょっとしたアウトプット作業リハビリを兼ねて、紹介文を書きます。

## 何を作ったんですか？

[`rst-pypi-ref`](https://pypi.org/project/rst-pypi-ref) というPythonライブラリです。
ソースは[GitHub上](https://github.com/attakei-lab/rst-pypi-ref)に公開されています。

`docutils`の機能拡張が目的で、簡単な書式でPyPIに登録しているライブラリへのリンクを付与するためのロールを使えるようにしています。

Before:

```rest
`rst-pypi-ref <https://pypi.org/project/rst-pypi-ref>`_
```

After:

```rest
:pypi:`rst-pypi-ref`
```

標準的な書き方ではURLとテキストの構造を `:pypi:` というロールで省略記法として書くことが可能になります。

## ロールって何ですか？

reStructuredTextにおけるロールは、インラインでのマークアップをするための書式です。
ブロック単位でのマークアップであるディレクティブとは対の関係になっています。

```rest
:pep-reference:`8`

.. -> PEP への参照を差し込む

:strong:`text`

.. -> 強い強調表示をする（ **text** と同じ）

:math:`A_\text{c} = (\pi/4) d^2`

.. -> LaTeX文法の数式として扱う
```

`docutils` では、ディレクティブと同様にロールも自作することが出来ます。

## 使い方の例

素の `docutils` も組み込めますが、わかりやすいのが「Sphinxドキュメンテーション内で利用する」手法でしょう。

一応、シンプルな実装をしたSphinx拡張を同梱しているため、Sphinxベースのドキュメントであれば、簡単に利用することが出来ます。

```python:conf.py
extensions = [
    # 他のSphinx拡張と一緒に設定
    "rst_pypi_ref.sphinx",
]
```

```rest:index.rst
この機能を使うには、 :pypi:`oEmbedPy` をインストールする必要があります。
```

この書式を使うことで、ドキュメンテーションの際にPyPI上のパッケージに対する参照挿入が容易になります。

実際の利用シーンは、PyCon JP 2022 で私が発表したスライドのソースを見てもらうほうが良いでしょう。

* [`conf.py` にSphinx拡張として追加する](https://github.com/attakei/slides/blob/main/source/conf.py)
* [スライドのソースに `:pypi:`ロールを記述する](https://github.com/attakei/slides/blob/main/source/pyconjp-2022/3_about-extension.rst)

## 物足りない点

この時点で粗方実装が終わってしまっているのですが、いくつか出来ると良さそうな点として、下記のような機能が有るといいかな？とは思っています。

* バージョン指定
  * 可能なら `>=1.0.0,<2.0.0` のような形式に対して「2.0未満の最新」といった解決が出来ると良い
* プライベートPyPIへの対応

## 応用編

「GitHub行ってソース見てどうぞ」で済ませてしまっていますが、実装方法はかなりシンプルです。
よって、ちょっと修正するだけで `npm` だったり `packagist` のような類似ロールを作ることが出来ます。

もし、他言語のライブラリでSphinxでのドキュメンテーションを行っている方は、ぜひ試してみて下さい。
