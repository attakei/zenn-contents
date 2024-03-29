---
title: "Sphinxのプロセス中にドキュメントの構造を弄る（+それをSphinx拡張として公開する）"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - Sphinx
published: true
---

# 前書き

Sphinxでドキュメントをビルドする流れは、大きく分けると次のような工程となっています。

1. ビルダー等の初期化・拡張のロード
1. ソースの読み取り
1. ドキュメント間のリレーション解決など
1. ソースを元にした出力

**1.** でロードした処理などは、後続プロセスにおいてSphinxのイベント呼び出しによって実行されます。
Sphinxイベントのタイミングは様々ですが、**「読み取ったソースから生成したオブジェクトを更に加工する」**ということも可能となっています。

本記事では、その一例を紹介します。

## 記事内で使う素材

後述の本文では、下記のようなreStructuredTextソースを用います。

```rest:index.rst
脚注を利用するサンプル
======================

reStructuredTextでは、 ``[#{name}]_`` と ``.. [#{name}]`` の構文を組み合わせることで、
脚注とその参照元を表現することができます。 [#f1]_

.. [#f1] この脚注は「reStructuredTextでは～」の文章の末尾に連動しています。

特に同じ脚注を参照させる必要がない場合は、 ``[#]_`` というように name部分を省略することもできます。 [#]_ [#]_

.. [#] この脚注は、「特に同じ脚注を～」の末尾に自動で連動しています。
.. [#] https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html#footnotes
```

# 通常のパースの挙動を知っておく。

`docutils` にはreSTソースを変換するコマンドがいくつか存在します。
まずは、HTMLに変換する`rst2xml.py`を使って、どのように解釈されるかを確認してみましょう。 [^1]

[^1]: 構造確認が目的なら、他にも `rst2psueudoxml.py` といったコマンドもあります。

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE document PUBLIC "+//IDN docutils.sourceforge.net//DTD Docutils Generic//EN//XML" "http://docutils.sourceforge.net/docs/ref/docutils.dtd">
<!-- Generated by Docutils 0.19 -->
<document ids="section-1" names="脚注を利用するサンプル" source="index.rst" title="脚注を利用するサンプル">
  <title>脚注を利 用するサンプル</title>
  <paragraph>
    reStructuredTextでは、 <literal>[#{name}]_</literal> と <literal>.. [#{name}]</literal> の構文を組み合わせることで、
    脚注とその参照元を表現することができます。 
    <footnote_reference auto="1" ids="footnote-reference-1" refid="f1">1</footnote_reference>
  </paragraph>
  <footnote auto="1" backrefs="footnote-reference-1" ids="f1" names="f1">
    <label>1</label>
    <paragraph>この脚注は「reStructuredTextでは～」の文章の末尾に連動しています。</paragraph>
  </footnote>
  <paragraph>
    特に同じ脚注を参照させる必要がない場合は、 <literal>[#]_</literal> というように name部分を省略することもできます。
    <footnote_reference auto="1" ids="footnote-reference-2" refid="footnote-1">2</footnote_reference>
    <footnote_reference auto="1" ids="footnote-reference-3" refid="footnote-2">3</footnote_reference>
  </paragraph>
  <footnote auto="1" backrefs="footnote-reference-2" ids="footnote-1" names="2">
    <label>2</label>
    <paragraph>この脚注は、「特に同じ脚注を～」の末尾に自動で連動しています。</paragraph>
  </footnote>
  <footnote auto="1" backrefs="footnote-reference-3" ids="footnote-2" names="3">
    <label>3</label>
    <paragraph>
      <reference refuri="https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html#footnotes">
        https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html#footnotes
      </reference>
    </paragraph>
  </footnote>
</document>
```

出力結果を読んでいくと、まずは次のようなことが分かります。

1. 脚注の参照元を記述した箇所に `<footnote_reference>` 要素が作成されている。
1. 脚注本文の記述箇所には、`<footnote>`要素が作成されている。
1. `<footnote_reference>`の`refid`と、`<footnote>`の`backrefs`が連動している。

いずれもドキュメント内の相互参照をするためには重要な要素です。
本記事で注目したいのは`2.`の **「`<footnote>`要素が脚注を記述した箇所に作成される」** という点です。

Sphinxはdocutilsを基盤にしており、HTMLの生成もこの点に大きな影響を受けています。
つまり、reSTの構造通りにHTMLを生成することになります。

具体的には、このようになります。

![](/images/sphinx-extension-footnotes/build-simple.png)

脚注本文が記述されたままの位置に出力されています。
挙動としては正しいですが、ちょっと変ですね。

## 標準的な対応方法

これだと困るので何かしらの対処が必要となります。正攻法だと、「脚注は脚注としてまとめておく」という手法となるでしょう。
具体的には、下記のように書き換えることで問題なくなります。 [^2]

[^2]: もちろんSphinx上でも、脚注がすべて文末に表示されます。

```rst:index.rst
脚注を利用するサンプル
======================

reStructuredTextでは、 ``[#{name}]_`` と ``.. [#{name}]`` の構文を組み合わせることで、
脚注とその参照元を表現することができます。 [#f1]_

特に同じ脚注を参照させる必要がない場合は、 ``[#]_`` というように name部分を省略することもできます。 [#]_ [#]_

.. [#f1] この脚注は「reStructuredTextでは～」の文章の末尾に連動しています。
.. [#] この脚注は、「特に同じ脚注を～」の末尾に自動で連動しています。
.. [#] https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html#footnotes
```

当然ですが、この形式で問題ない以上はこの書き方が真っ当な方法と考えてよいです。

しかし、この形式には「この脚注がどこを参照しているかが分かりづらい」という課題も抱えています。
文書が長いほど影響が大きくなるでしょう。

この構造に対して、例えばZennのMarkdown処理では、脚注記法である `[^X]` + `[^X]:` の組み合わせは
「どこに書かれていても脚注本文は文末に表示される」ように実装されています。 [^3]

reStructuredTextには脚注記法に `[#]_` という自動採番タイプのものがあるため、
上記のような「脚注を自動で文末に持ってくる」ことが出来ないのは少々もったいないと言えるでしょう。

そこで、次のセクションで、この点を解消する手法を紹介します。

[^3]: この記事でも、脚注はセクション末尾へ書くようにしています。

# ビルド時にドキュメント構造を書き換える

:::message
この手法は、Sphinxを前提としています
:::

## はじめの一歩、の手前

Sphinxで使用する`conf.py`は、設定項目だけではなく、関数などを定義して追加の処理をさせることも可能です。
例えば、下記のコードではビルド時に`Hello world.`と出力するようになります。

```python:conf.py
def setup(app):
    print("Hello world.")
```

この`conf.py`にて、前書きにあるようなSphinxイベントに対する割り込みを定義することで、
「ソースから変換後のドキュメント構造」を自分の手で弄ることが出来るようになります。

## まずは最小限のコードを実装して動作確認してみる

`conf.py`に下記のようなコードを書いて、ビルドしてみて下さい。 [^4]

```python:conf.py
def collect_footnotes(app, doctree):
    print(doctree.attributes["source"])


def setup(app):
    app.connect("doctree-read", collect_footnotes)
```

ビルドの途中でビルド対象となるreSTファイルのフルパスが羅列されるでしょう。[^5]
これは、上記のコードが働いた結果として、次のことがビルド時に発生しているためです。

1. `conf.py`に`setup()`があるので、ビルド初期に実行。
1. `setup()`内にコアイベント時の処理を登録する`app.connect()`が記述されており、`doctree-read`=ソースを読み込んでオブジェクトへ変換した後に追加処理する関数を指定。
1. イベントに指定された`collect_footnotes()`がソース読み込み直後にファイル単位で実行され、`print()`処理している。

つまり、この記述によって「Sphinx本体が各ソースの読み込んでオブジェクトへ変換した後に追加でなにかする」土台が出来たことになります。

[^4]: `make clean html` のように、`clean`を挟んでビルド後の環境を空にすることを推奨します。[^5]
[^5]: Sphinxはビルド中に実行したソースの変換結果をキャッシュするため、`make html`だと2回目で何も表示されないことがあります。

## 実際に処理を書いてみる

ここから、実際に脚注を表す箇所を文末へ集約させるコードを書いてみます。

```python:conf.py
def collect_footnotes(app, doctree):
    from docutils import nodes

    # 脚注本文をまとめるだけのセクションを用意する
    footnotes = nodes.section()
    # ドキュメント内にある全ての脚注本文を探索して、上記のセクションに移動させる
    for footnote in doctree.traverse(nodes.footnote):
        footnote.parent.remove(footnote)
        footnotes.append(footnote)
    # 上記のセクションをドキュメントの末尾に差し込む
    if len(footnotes.children):
        footnotes.insert(0, nodes.rubric(text="Footnotes"))
        doctree.append(footnotes)
```

**doctree** = reSTを変換したオブジェクトはノードという要素を用いた木構造になっています。（先程`rst2xml.py`の例を出した通りです）
この構造はDOMとかなり似ており、`docutils`自体もノード生成・操作のためのAPIが提供されています。
これらの処理を組み合わせることで、慣れれば比較的簡単にdoctreeの内容を編集することが出来ます。

コード内コメントを補足する形で説明をすると、上記のコードは各ソース読み込み時に追加で下記のことを実行しています。

1. まず、脚注本文の`footnote`要素を集約させるための、空のセクションを用意する。
1. `doctree.traverse()` という、「配下にある特定タイプのノードを全探索する」メソッドを利用して、全`footnote`を探す。
1. 見つかった要素は、元の親要素への参照を除外した後に空セクションの子要素に追加させて、場所移動させる。
1. 最後に空だった「全`footnote`が集まったセクション」を`doctreeeの子要素最後尾へ挿入して、文末で出力されるようにする。

この処理を通すことで、Sphinxでのビルド結果が下記のようになります。

![](/images/sphinx-extension-footnotes/build-with-hook.png)

「脚注本文 = 本文への補足事項」と解釈した上で、参照情報を近くに記述したままで脚注として集約することが可能になりました。

# Sphinx拡張版の紹介

とはいえ、Sphinxドキュメントを書くたびに毎回`conf.py`へこの記述を書くのも少々煩雑です。[^6]

そこで最後に、主に自分用としてPyPIへ登録した [`atsphinx-footnotes`](https://pypi.org/project/atsphinx-footnotes/)を紹介します。

これは前述の処理を単純にSphinx拡張の形式に置き換えただけの簡単なライブラリとなっています。
[GitHubリポジトリ](https://github.com/atsphinx/footnotes/)で実際の実装内容を見ることが可能ですが、
「本記事のソースをほぼそのまま使ってSphinx拡張の体裁を整えた」といっても差し支えない内容となっています。

使い方は非常に簡単で、`pip install atsphinx-footnotes`でインストールをしてから、`conf.py`に下記のような編集を加えるだけです。

```python:conf.py
extensions = [
    # 他のSphinx拡張の前後どこにでも
    "atsphinx.footnotes",
]
```

これだけで、今回のテーマである「脚注を参照元の近くに書いた上で、ビルド時に文末へ寄せる」ことが実現できます。
使い道がありそうと思ったら、是非試してみてください。

[^6]: 実際に自分も複数ケースで発生したのもあって、拡張としての作成まで手を進めています。
[^7]: GitHub上では https://github.com/atsphinx/footnotes/ にて公開しています。
