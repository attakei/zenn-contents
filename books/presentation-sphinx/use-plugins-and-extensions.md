---
title: "Reveal.jsプラグインやSphinx拡張を活用して、質の向上を目指す"
---

ここまでは、`Sphinx`と`sphinx-revealjs`のみを用いて、プレゼンテーションを作成してきました。

もちろんこれでも、プレゼンテーションとして十分成立します。
ただ、せっかくなのでReveal.jsのプラグインやSphinx拡張を用いて、プレゼンテーションの内容を充実させてみましょう。

# Reveal.jsプラグインを使う

## コードに対してシンタックスハイライトを追加する

reStructuredTextには`code-block`というディレクティブが存在しており、これを利用することで「この中のコンテンツはコード」であることを明示できます。

```rest
.. code-block:: python

    extensions = [
        'sphinx_revealjs',
    ]
```

`sphinx-revealjs`では、`code-block`ディレクティブに対してReveal.jsの流儀に合わせたHTMLを出力するように調整しています。
そのため、ドキュメントHTML向けのビルドと違ってシンタックスハイライトが効きません。

シンタックスハイライトを機能させるために、`source/confp.py`上にプラグインの設定を記載する必要があります。

```python:source/conf.py
revealjs_script_plugins = [
    # Reveal.js組み込みのシンタックスハイライトプラグインを使う
    {
        "name": "RevealHighlight",
        "src": "revealjs/plugin/highlight/highlight.js",
    },
]
revealjs_css_files = [
    # プラグインとセットで対応するCSSが同梱されているので、これを追加で使用
    "revealjs/plugin/highlight/zenburn.css",
]
```

![highlight.png](https://storage.googleapis.com/zenn-user-upload/01va7yh8wtmy82cq7l1sp5pzajf6)

## スピーカーノート機能を有効にする

プレゼンテーション系ソフトウェアのファイルには、実際に聴講者が見るプレゼンテーション本体とは別に、発表者だけが普段見る「スピーカーノート」という機能があります。

`sphinx-revealjs`ではスピーカーノート用のディレクティブとして`revaljs-notes`が提供されています。
このディレクティブ内に記述された内容は、ビルド時にスピーカーノート用の領域に出力され、スピーカーノートビューの中でのみ確認することができます。

```rest:source/index.rst
======================================
Sphinxでのプレゼンテーションを体験する
======================================

.. revealjs-notes::
   
   ここのコメント行は、スピーカーノートして扱われる
```

実際にノートを表示できるようにするには、Reveal.jsの組み込みプラグインである`RevealNotes`を使用します。

```python:source/conf.py
revealjs_script_plugins = [
    {
        "name": "RevealNotes",
        "src": "revealjs/plugin/notes/notes.js",
    },
]
```

ビルドしたHTMLを表示して`S`キーを押すと、別ウィンドウでスピーカーノートが表示されます。
次のセクションや経過時間が表示されるので、重宝します。

![notes.png](https://storage.googleapis.com/zenn-user-upload/kncuz9xdak6190eeqnr92hzcarh6)
※上が、スライド本体。下がノートです。

# Sphinx拡張を使う

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
    'sphinx_revealjs',
    # 追加: sphinxemojiは2個書くことに注意
    'sphinxemoji.sphinxemoji',
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
実現可能なSphinx拡張はいくつかありますが、ここでは自作の`oEmbedPy`を用います。

```rest:source/index.rst
動画を埋め込もう
----------------

.. oembed:: https://youtube.com/watch?v=Ps9JiaYqAFg
```

```python:source/conf.py
extensions = [
    'oembed.ext.sphinx',
    'sphinx_revealjs',
    'sphinxemoji.sphinxemoji',
]
```

![youtube.png](https://storage.googleapis.com/zenn-user-upload/rwqo6tvwo5tjacejg6tnpyg8xmc2)