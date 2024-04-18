---
title: "sphinx-revealjs v3.0 リリースノート"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx"]
published: true
published_at: '2024-03-03 19:00'
---

:::message
初稿はここで公開しますが、今後書き直したりしたものを別の場所に公開する可能性があります。
:::

2024-02-27にsphinx-revealjsのv3.0.0をリリースしました。

https://twitter.com/attakei/status/1762162292672893390

https://pypi.org/project/sphinx-revealjs/

なんでこんな記事を書いているかというと、本体でドキュメント周りのi18n化が一切進んでいないので、せめて日本語でも「何が出来るようになったか」を書き残したくなったためです。

## 機能追加周り

### セクション系のディレクティブがあらゆる`data-`オプションを受付可能に

セクションのデザイン調整に関わるディレクティブとして `revealjs-section` と `revealjs-break` がありました。
もともとこのディレクティブのオプションとして受け入れ可能な項目は、Reveal.jsのドキュメントを参照しつつちまちまと定義していました。

そんな中でIssueではなく直接メールを貰ったのですが、文面曰く「プラグイン用の属性を付けられない！」とのこと。
「確かに」と納得したので、今回のタイミングでディレクティブの`option_spec`をちょっといじって、`data-`で始まる属性は全て受付可能にしています。

通常、ディレクティブのオプション定義は、下記のように記述します。

```python
class SomeDirective(Directive):
    # どのようなオプションを受け付けて、設定された場合にどのような前処理をするか
    option_spec = {
        "value1": directives.unchanged,
        "value2": directives.unchanged,
    }
```

<!-- textlint-disable ja-technical-writing/sentence-length,ja-technical-writing/ja-no-redundant-expression -->
今回は、下記のような実装を行い、`dict`ではなく継承した`RevealjsSectionAttributes`を設定することで、「あらゆる`options["data-****"]`を受け付ける」挙動を実現しています。
<!-- textlint-enable ja-technical-writing/sentence-length,ja-technical-writing/ja-no-redundant-expression -->

```python
class RevealjsSectionAttributes(dict):
    def __getitem__(self, key):
        """Extend dict for custom plugins of revealjs.

        Many plugins may refer ``data-`` attributes
        of ``section`` elements as optional behaviors.
        """
        if key in self:
            return super().__getitem__(key)
        if key.startswith("data-"):
            return directives.unchanged
        return None

class SomeDirective(Directive):
    option_spec = RevealjsSectionAttributes()
```

これで、`data-` 属性によるセクション単位で挙動の調整が可能なプラグインは軒並み使用可能になるでしょう。
（そうじゃない属性まではすぐに面倒見きれない）

### スライドの縦遷移のデザイン等をまるごと指定できるように

`revealjs-vertical`というディレクティブが増えました。
使えるオプションは`revealjs-section`や`revealjs-break`と全く同じですが、これらと違って「スライドの縦一列全てに作用する」という特性があります。

元々Reveal.js自体は一列のスライド進行ではなく、大セクション単位では横に遷移しつつ各スライドは下に配置する構成を取っています。
`revealjs-section`や`revealjs-break`はどちらもスライド1枚に対して属性を付与することが目的でしたが、これしか無いv2.x系では2個の問題を抱えていました。

* 例えば`data-background-color`による背景色の変更をスライド単位で行う必要がある。
* そもそも、大セクションの最初のスライドに限って属性の付与ができない。

<!-- textlint-disable ja-technical-writing/ja-no-successive-word -->
これらの挙動をまとめて解決するために、縦に並んだ分の`<section>`に属性を付与するための専用ディレクティブとして`revealjs-vertical`を用意しました。
これを利用することで、例えば「最初のスライドグループは〇〇がテーマだからこの背景色」「次はすこしズレたテーマになるから別の背景色」といったことが設定しやすくなるでしょう。
<!-- textlint-enable ja-technical-writing/ja-no-successive-word -->

<!-- textlint-disable ja-technical-writing/sentence-length -->
細かく動作を見てはいませんが、基本的に`revealjs-vertical`の設定は`revealjs-section`,`revealjs-break`より優先順位が低いはずなので、更にスポットでデザインを変えること自体も可能です。
<!-- textlint-enable ja-technical-writing/sentence-length -->

### プレゼンテーションのDOM構造の変更

上記の`revealjs-vertical`の実装などと合わせて、出力するHTMLの構成をちょっと見直しました。
概要的な説明をすると「全てのセクション構造を2階層式に統一」しています。

:::details コードと簡易出力で説明
このようなreStructuredTextがあったとします。

```rst
=====
Title
=====

Sub title 1
===========

Section 1-1
-----------

Section 1-2
-----------
```

v2系ではビルドするとこのような出力になります。

```html
<div>
  <section>
    <h1>Title</h1>
  </section>
  <section>
    <section>
      <h2>Sub title 1</h2>
    </section>
    <section>
      <h3>Section 1-1</h3>
    </section>
    <section>
      <h3>Section 1-2</h3>
    </section>
  </section>
</div>
```

v3系以降は下記のように出力されます。

```html
<div>
  <section>
    <section>
      <h1>Title</h1>
    </section>
  </section>
  <section>
    <section>
      <h2>Sub title 1</h2>
    </section>
    <section>
      <h3>Section 1-1</h3>
    </section>
    <section>
      <h3>Section 1-2</h3>
    </section>
  </section>
</div>
```

比較すると最初のスライドは`section`1階層だったのが`section > section`の2階層になり、全てのコンテンツが`section > section`内での記述に変わっています。

:::

結果としてCSSの記述が若干楽になるのではないでしょうか。

### よりシンプルなHTML出力テーマの提供

sphinx-revealjsはReveal.jsを用いたプレゼンテーションを生成するビルダーを提供していますが、このビルダーはHTML出力ビルダーを継承して作成しています。
そのため、内部構造的にはプレゼンテーション専用のHTMLテーマを用意して、このテーマに基づいてファイルを生成しています。

このHTMLテーマは、初期のリリース当初からSphinxにバンドルされたテーマを継承する形で実装していたのですが、プレゼンテーションとしては不要なコードが含まれています。
今回のリリースでは、新しくテーマを作って https://revealjs.com のサンプルにあるようなプレゼンテーションとして必要な分のHTMLだけを生成するようにしています。

<!-- textlint-disable ja-technical-writing/sentence-length -->
このテーマは`revealjs_html_theme`という新規追加したオプションで切り替えられるようになります。
現状では未設定の場合は以前のものを使用するようになっています。
もし新しいテーマを試したい場合は`conf.py`内に`revealjs_html_theme = "revealjs-simple"`と記述してみてください。
<!-- textlint-enable ja-technical-writing/sentence-length -->

## 互換性を失う変更

### 古めのPythonとSphinxをサポート対象から除去

Python 3.7系未満とSphinx 4.x系以下は動作保証から外しています。より正確には下記のように記述しています。

* `requires-python` の値を`>= 3.7`に設定し、通常の`pip install`時にエラーとなるように。
* `install_requires` 相当の値に `sphinx>=4.0`を設定し、通常の`pip install`時にSphinxを4.0以上で強制するように。

まぁPython 3.7系ですらEOLですし、現時点でプレゼンテーション用にsphinx-revealjsを採用しようとする人がPython 3.6系を使うことはまず無いものと考えて良いでしょう。
Sphinx本体も直近でバージョン進行が激しくなってきており、Python側のサポート状況を加味した結果としてとりあえず古めのものを徐々に対象外にしていくことにしています。

### プレゼンテーションのDOM構造の変更

「機能追加周り」でも同じタイトルがありましたが、DOM構造が変わったためCSSを使って各種調整していた人にとっては再度調整が必要になります。

### Reveal.jsの静的ファイルのパスを変更

sphinx-revealjsは、Reveal.jsのファイル一式を同梱して配布しています。
その際にファイルパスはバージョン名を添える形式としていたのですが、それをバッサリやめました。

具体的には`reveajs4`を`revealjs`に差し替えています。

理由の1つは「近いタイミングでReaveal.jsのv5がリリースされた」というものですが、今後にv6が出た時にわざわざファイルパスを変えるのも面倒そうだからです。

結果としてですが、万が一`conf.py`などで同梱しているReveal.jsのファイルをstatic-copy以外の用途で利用している場合は、調整が必要になります。

