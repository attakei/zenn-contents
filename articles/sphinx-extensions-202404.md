---
title: "最近作ったりしていたSphinx拡張+αの簡単な紹介をする(2024年04月編)"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - Sphinx
  - htmx
published: true
---

以前にこんな記事を書いていました。

https://zenn.dev/attakei/articles/sphinx-extensions-202204

ごくごく直近でアクティブだった訳ではないのですが、ちょっとした棚卸しを兼ねて「こんなSphinx拡張作ってみてた」という紹介をします。

## まえがき

<!-- textlint-disable ja-technical-writing/no-mix-dearu-desumasu -->
- 前回同様に「導入すると何が出来るか」を主眼に紹介します。
- ライブラリ紹介時に記載するURLへ遷移するとREADMEを参照できるので、インストール方法などは個別に見てください。
<!-- textlint-enable ja-technical-writing/no-mix-dearu-desumasu -->

## 紹介本編

### atpshinx-color-text

https://github.com/atsphinx/color-text

Sphinxに色指定を可能にするロールを付与する拡張です。
やってることは、「`:color:色指定:`」を付与した箇所に、CSSのインラインスタイルで`color`を付与するだけです。

```rest:example.rst
.. 「な」だけ赤くなります

ひぐらしの :color:red:`な` く頃に
```

### atsphinx-mini18n

以前も作った [`sphinx-contrib-mixed-builder`](./sphinx-extensions-202204#sphinxcontrib-mixed-builder)の亜種です。
sphinx-intl等で準備したi18n用の設定を利用して、単一ビルドで複数言語のドキュメントをまとめて生成します。

```py:conf.py
extensions = [
    "atsphinx.mini18n",
]

mini18n_default_language = "en"
mini18n_support_languages = ["en", "ja"]
```

例えば、デフォルトの言語設定が`en`で、sphinx-intlなどで`ja`向けのpoファイルを用意していると、
`make mini18n-html`を実行するだけで次のアセットを生成できます。

- `/en`で始まる英語ドキュメント
- `/ja`で始まる日本語ドキュメント
- 適宜リダイレクトする`/index.html`

Read the Docsには複数のドキュメントプロジェクトを束ねてi18n化の対応が可能です。
一方でこの拡張を使うと、GitHub Pagesのような単体アセットしかデプロイ出来ない環境上でもi18nサイトを手軽に展開できます。 [^1]

[^1]: ただし、バージョニングのようなことは出来ません。そういう要件がある場合はRead the Docsなどの利用を推奨します。

## atsphinx-htmx-boost

https://github.com/atsphinx/htmx-boost

htmxの[`hx-boost`](https://htmx.org/attributes/hx-boost/)機能を利用して、お手軽にSphinxドキュメントの体感速度を向上させる拡張です。

（大雑把に書くと）`hx-boost`属性が付与されたサイト内リンクは、クリック時に画面遷移ではなく`body`内の入れ替えを行います。
ドキュメント内部のリンクにこの属性を付与することで、ドキュメントを読む際に発生する待ち時間の軽減を計ることができます。

なお、通常はクリック時に通信が発生するのですが、`htmx_boost_preload`を有効にするとpreload拡張もロードしてマウスオーバー時に通信させることも出来ます。
こうすると、クリックしたときにはすでに通知が終わっており、あっという間に画面が変わります。

## 番外編

### atsphinx-helper

https://github.com/atsphinx/helper

Sphinx拡張ではなく、個人的に作った「Sphinx拡張の実装を補助するライブラリ」です。

「このビルダー（この出力をするビルダー）でしか動作させたくない」といったときに、ガードをするデコレーターを定義しています。

```extension.py
from atsphinx.helper.decorators import emit_only

@emit_only(formats=["html"])
def setup_custom_loader(app: Sphinx):
    ...

def setup(app: Sphinx):
    """Load as Sphinx-extension."""
    app.connect("builder-inited", setup_custom_loader)
    ...
```

上記の実装をした拡張を`conf.py`で有効にしていていると、
仮に`make latexpdf`のようなビルダーを実行すると`setup_custom_loader`が実行されなくなります。 [^2]

[^2]: html系のビルダーでは適切に動作します。