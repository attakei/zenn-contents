---
title: "Reveal.jsプラグインやSphinx拡張を活用して、質の向上を目指す"
---

ここまでは、`Sphinx`とその組み込み拡張を用いて、プレゼンテーションを作成してきました。

もちろんこれでも、プレゼンテーションとして十分成立するのですが、せっかくなのでReveal.jsのプラグインやSphinx拡張を用いてプレゼンテーションの内容を濃くしてみましょう。

# Reveal.jsプラグイン編

## コードに対してシンタックスハイライトを追加する

reStructuredTextには`code-block`というディレクティブが存在しており、これを利用することで「この中のコンテンツはコード」というのを明示化します。

```rest
.. code-block:: python

    extensions = [
        'sphinx_revealjs',
    ]
```

`sphinx-revealjs`では、このブロックはReveal.jsの流儀に合わせたHTMLを出力するように調整していますが、これだけでは文法によるハイライトが効きません。

そのため、`source/confp.py`でプラグインの設定を記載して、Reveal.js組み込みのシンタックスハイライトを有効にする必要があります。

```python:source/conf.py
revealjs_script_plugins = [
    # Reveal.js組み込みのシンタックスハイライトプラグインを使う
    {
        "name": "RevealHighlight",
        "src": "revealjs4/plugin/highlight/highlight.js",
    },
]
revealjs_css_files = [
    # プラグインとセットで対応するCSSが同梱されているので、これを追加で使用
    "revealjs4/plugin/highlight/zenburn.css",
]
```

![highlight.png](https://storage.googleapis.com/zenn-user-upload/01va7yh8wtmy82cq7l1sp5pzajf6)

## スピーカーノート機能を有効にする

プレゼンテーション系ソフトウェアのファイルには、実際に聴講者が見るプレゼンテーション本体とは別に、発表者だけが普段見る「スピーカーノート」という機能があります。

reStructuredTextには`.. `で始まりディレクティブではないブロックをコメントとして扱う仕様があります。
`sphinx-revealjs`では、このコメントを`<aside>`内に出力して、Reveal.jsのスピーカーノートとして扱えるようになっています。

```rest:source/index.rst
======================================
Sphinxでのプレゼンテーションを体験する
======================================

.. ここのコメント行は、スピーカーノートして扱われる
```

実際にノートを表示できるようにするには、Reveal.jsの組み込みプラグインである`RevaelNotes`を使用します。

```python:source/conf.py
revealjs_script_plugins = [
    {
        "name": "RevealNotes",
        "src": "revealjs4/plugin/notes/notes.js",
    },
]
```

ビルドしたHTMLを表示して`S`キーを押すと、別ウィンドウでスピーカーノートが表示されます。
次のセクションや経過時間が表示されるので、重宝します。

![notes.png](https://storage.googleapis.com/zenn-user-upload/kncuz9xdak6190eeqnr92hzcarh6)
※上が、スライド本体。下がノートです。

# Sphinx拡張編

ここからは、Sphinx側の拡張による質の向上を扱います。
今回のようなプレゼンテーションだけでなく、普段のドキュメンテーションでも活用できます。

(あくまで一例となります)

## emojiで表現の質を上げる

セクションの中に文字だけでは味気ないと思ったときに思いつくのは絵文字です。
Sphinxには絵文字を比較的簡単に扱える拡張が存在するので、これを使って絵文字を追加してみます。

```shell-session
$ pip install sphinxemoji
```

```python:source/conf.py
extensions = [
    # 追加: sphinxemojiは2個書くことに注意
    'sphinxemoji.sphinxemoji',
    'sphinx_revealjs',
]
```

reStructuredTextのインラインマークアップを用いて、Slackっぽいスタイルで絵文字を指定して表示させることが出来ます。

```rest:source/index.rst
絵文字を使おう
--------------

絵文字芸：スト2

|:flag_jp:| |:arrow_right:| |:arrow_right:| |:airplane:| |:arrow_right:| |:arrow_right:| |:flag_th:|
```

![sphinxemoji.png](https://storage.googleapis.com/zenn-user-upload/vsz06h9jn6doxhwm9jm0g3k6t6g9)

## YouTubeの動画を差し込む

発表のイントロやデモとして動画（例えばYouTube）を埋め込みたいこともあるでしょう。
`sphinxcontrib.yt` というSphinx拡張を使うことで簡単に埋め込むことができます。

```rest:source/index.rst
動画を埋め込もう
----------------

.. youtube:: Ps9JiaYqAFg
```

ブロック構造を追加する系のプラグインの場合、`sphinx-revealjs`のようなカスタム出力に対応していないことがほとんどです。
こういった場合は、`source/conf.py`内にて`setup`関数を用意して挙動を上書きしてあげる必要があります。

```python:source/conf.py
extensions = [
    'sphinxemoji.sphinxemoji',
    'sphinxcontrib.yt',
    'sphinx_revealjs',
]

def setup(app):
    from sphinxcontrib.yt.youtube import youtube, visit, depart
    app.add_node(youtube, override=True, revealjs=(visit, depart))
```

![youtube.png](https://storage.googleapis.com/zenn-user-upload/rwqo6tvwo5tjacejg6tnpyg8xmc2)

# Sphinx番外編

## rawディレクティブでHTMLをそのまま出力する

Twtterのツイートを始めとして、現在様々なウィジェットが埋め込めます。
Sphinx拡張がすべてのウィジェットごとに作られてれば楽なのですが、残念なことにそうはいきません。

幸い、SphinxにはHTMLなどをそのまま埋め込むための`raw`ディレクティブが存在します。
これを使うことで、HTMLとして表現できる分にはどんなコンテンツも埋め込むことができます。

```rest:source/index.rst
ツイートを埋め込もう
--------------------

.. raw:: html

    <blockquote class="twitter-tweet"><p lang="ja" dir="ltr">マイクを設置した状態でdiscordのGo Liveを試してみてるんだけど、Enterだけ音を拾いがちな傾向があるらしく、なんだかんだで自分も「カタカタカタ..ッッターン！」ってやってるらしい</p>&mdash; kAZUYA tAKEI (@attakei) <a href="https://twitter.com/attakei/status/1358266239131348993?ref_src=twsrc%5Etfw">February 7, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
```

![tweet.png](https://storage.googleapis.com/zenn-user-upload/wcfpu3seg1awejlwn98e3yf76eoy)
