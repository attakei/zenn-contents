---
title: "sphinx-revealjsにおいて、脚注をいい感じにスタイルする"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - Sphinx
published: true
---

## restructuredtextの「脚注」記法

reStructuredTextには、記法の1つとして「脚注」があります。

```rst
Lorem ipsum [#f1]_ dolor sit amet ... [#f2]_

.. rubric:: Footnotes

.. [#f1] Text of the first footnote.
.. [#f2] Text of the second footnote.
```

上記のようなソース [^1] からSphinxなどでHTMLをビルドすると、次のように扱われます。

* `.. [#f1]`, `.. [#f2]` で始まる行は脚注となる箇所はグループとして `dl` 要素とする。
* 各項目には `footnote` クラス等が付与される。

[^1]: https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html#footnotes より引用

## sphinx-revealjsで脚注記法はどのように扱われるのか

ここからが本題となるのですが、特にこれといった調整をしないまま脚注記法を含むreStructuredTextソースからReveal.jsプレゼンテーションをビルドするとどうなるでしょうか？

```rst
Footnotes
---------

You can set footntes. footnotes are rendered on tail of slide. [#]

.. [#] This is footnote.
```

上記のソースをビルドすると、下画像のような表現になります。

![](/images/sphinx-revealjs-footnotes/default-style.png)

画像のとおり、本文のほぼ直後に脚注文が掲載されています。
これ自体はSphinxのHTMLビルドの挙動としてはそのままで、
ソースの記述どおりにHTML化されるためです。 [^2]

[^2]: この挙動への対処として取り組んでたのが [`atsphinx-footnotes`](https://pypi.org/project/atsphinx-footnotes/) です。 [^3]
[^3]: Zennの記事は [こっち](https://zenn.dev/attakei/articles/sphinx-extension-footnotes)。

sphinx-revealjsはHTMLビルダーの拡張として動作しており、
Reveal.jsの表現として機能するための出力変更をしている以外はHTMLビルダーのままとなっています。
結果として、特に適用するべきスタイルがないまま画像のような表現になってしまっています。

## 「脚注」を「脚注」らしくしてみる

sphinx-revealjsの基本的な考え方は「reStructuredTextの特性を最大限に活かしてReveal.jsプレゼンテーションを生成する」です。
そのため、脚注記法で記述したテキストも脚注らしい表現で出力できるのが望ましいです。

出力の案は大きく分けて「各スライドの最下部に寄せる」「引用元扱いしてプレゼンテーションの最終スライドに寄せる」の2種類考えました。
最終的に、本記事+当面の実装ケースとしては前者を採用しています。

とはいえ、やることはそんなに多くありません。
Reveal.jsの表現に収まる範囲でCSSを使って脚注文を調整するだけです。

```css:_static/footnotes.css
a.footnote-reference {
  font-size: 70%;
  vertical-align: top;
}

aside.footnote-list {
  position: fixed;
  bottom: 0;
  font-size: 50%;
  width: 100%;
}

aside.footnote > span {
  float: left;
}
aside.footnote p {
  text-align: left;
  padding-left: 2rem;
}
```

```python:conf.py
revealjs_css_files = [
    # 既存のCSS
    "footnotes.css",
]
```

上記を加えて再びビルドすると、下画像のようになります。

![](/images/sphinx-revealjs-footnotes/custom-style.png)

簡単に説明すると、脚注のグループがまるごと `<aside class="footnote-list ~" >` として扱われるため、
`position`を利用して強制的に真下に引き下ろしています。
なお、スタイルを適宜調整することで、例えば右寄せなども可能でしょう。

## 余談

Q: この時点でsphinx-revealjsに含めてないんですか？

A: CSS1ファイルでできる対応であるのと、この表現を求めない人がいたときのconfig名を考えるのが面倒で、この時点では別枠にしています。
