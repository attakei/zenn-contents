---
title: "最近作ったりしたSphinx拡張の簡単な紹介をする(2022年04月編)"
emoji: "🖨"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - Sphinx
published: true
---

普段からSphinx用に拡張ライブラリをちょくちょく作っているのですが、今月ちょっとしたモチベーションブーストが発生したために、普段より多く作ってました。
ちょっとした宣伝を兼ねて、何が出来るかを軽く紹介します。

## まえがき

「導入すると何が出来るか」を主眼に紹介します。
ライブラリ紹介時に記載するURLへ遷移するとREADMEを参照できるので、インストール方法などは個別に見てください。

## 紹介本編

### sphinxcontrib-budoux

https://github.com/attakei-lab/sphinxcontrib-budoux

Googleが公開している[BudouX](https://github.com/google/budoux)を利用して、Sphinxドキュメントの日本語文を適切な位置に改行を差し込むようにする拡張です。

こういったreStructuredTextのドキュメントを例にします。

```rest:index.rst
あなたに寄り添う最先端のテクノロジー
====================================
```

通常の出力では以下のようなHTMLを出力します。

```html:before.html
<h1>あなたに寄り添う最先端のテクノロジー</h1>
```

`sphinxcontrib-budoux`を有効にすると、このような出力になります。

```html:after.html
<h1 style="word-break: keep-all; overflow-wrap: break-word;">あなたに<wbr/>寄り添う<wbr/>最先端の<wbr/>テクノロジー</h1>
```

BudouXが文節として判断した箇所に対して `<wbr>` タグを挿入し、更に`style`属性を付与することによって、ブラウザが必要なタイミングで改行して表示してくれるようになります。

### sphinxcontrib-external-link

https://github.com/attakei-lab/sphinxcontrib-external-link

外部リンクと判定した参照要素に対して、`target="_blank"`と`rel="noreferrer"`を付与するように処理に割り込む拡張です。

通常のSphinxドキュメントは、全リンクに対して同一ウィンドウ/タブで画面遷移します。
この拡張を利用した場合は、フルのURLで指定したものは全て別ウィンドウ/タブで開くようになります。

※なんの条件付けもなく属性を付与するため、一長一短ではあります。

### sphinxcontrib-oembed

https://github.com/attakei-lab/sphinxcontrib-oembed

`.. oembed:: URL`の形式を埋め込むだけで、HTML生成時にoEmbed API経由で取得したiframeを埋め込めるようになります。

```rest
.. oembed:: https://twitter.com/attakei/status/1517152841550376961
```

上記のようなreSTソースから↓の埋め込みをシンプルに実現できます。

https://twitter.com/attakei/status/1517152841550376961

なお、[oEmbedのサイト](https://oembed.com/)に掲載されている[プロバイダー一覧JSON](https://oembed.com/providers.json)を利用しているため、結構な種類のURLが標準対応出来ています。

### sphinxcontrib-mixed-builder

https://github.com/attakei-lab/sphinxcontrib-mixed-builder

HTML出力時に複数のビルダーを混在させることが出来るようにする拡張です。

```python:conf.py
mixed_builders = ["html", "revealjs"]
mixed_rules = [
    {
        "equal": "index",
        "builder": "html",
    },
    {
        "start": "slides/",
        "builder": "revaljs"
    },
]
```

例えば、上記のような設定を用いて`make mixed`を実行すると、次のようなルールでファイルを生成するようになります。

1. `index` のドキュメントは、 `html` ビルダーで普通のHTMLを生成
1. `slides/` で始まるドキュメントは、 `revealjs` ビルダーでReveal.js形式のHTMLを生成
1. いずれにも該当しないドキュメントは、`html` ビルダーで普通のHTMLを生成

「ここだけスライドにしたい」と言った、ちょっとしたHTMLの混在には便利です。

## 番外編

### googlefonts-markup

https://github.com/attakei-lab/googlefonts-markup

PythonでGoogle FontsのURLをちょっとだけ扱いやすくするライブラリです。

```python
>>> from googlefonts_markup import Font
>>> noto_sans_jp = Font(family_name="Noto Sans JP")
>>> noto_sans_jp.css_url()
'https://fonts.googleapis.com/css2?family=Noto+Sans+JP'
>>> noto_sans_jp.css_tag()
'<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP" rel="stylesheet">'
```

`Font`クラスを提供しているので、これを利用してGoogle FontsのCSSを管理するときに、ちょっとだけ可読性の向上が期待できます。

```python:conf.py
# Sphinxでの利用例
from googlefonts_markup import Font

html_css_files = [
    Font(family_name="Noto Sans JP").css_url(),
]
```

### cookiecutter-sphinxcontrib

https://github.com/attakei-lab/cookiecutter-sphinxcontrib

上記のSphinx拡張を作っている過程で整理した、自分用のcookiecutterテンプレートです。
次のようなものが同梱されています。

- Poetry
- Pytest
- Black
- GitHub Actions
