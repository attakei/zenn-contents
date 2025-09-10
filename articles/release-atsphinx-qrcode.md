---
title: "SphinxドキュメントにQRコードを埋め込みたくなったので、拡張を作った"
emoji: "📖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx", "python", "zennfes2025free"]
published: true
published_at: '2025-09-10 18:00'
---

皆さんは「発表駆動開発」してますか？

自分はプロポーザルに密結合するテーマが未完成なのはいただけないと考える派閥です。
ただし、派生物だったりエンハンスの類だったりは積極的にやっていきたいところですね。

というわけで、少し前に軽く作ってみたSphinx拡張の紹介です。（またです）
この記事は、日本語で書いた初回リリースノートという扱いとなります。

## 何を作ったか

https://pypi.org/project/atsphinx-qrcode/

[atsphinx-qrcode](https://pypi.org/project/atsphinx-qrcode/)というSphinx拡張です。
ドキュメント内で管理している文字コンテンツを、ビルド時にQRコードへ変換して出力するものです。

## 使い方

位置づけ的には画像に関するディレクティブが1個増えたようなものと捉えるとよいでしょう。

### インストール

PyPI上にアップロードされているので、普通の手法でインストールできます。

```console
pip install atsphinx-qrcode
```

### 有効化

Sphinxドキュメント上での有効化も、ごくごく標準的な方法で可能です。

```python:conf.py
extensions = [
    ...,  # 他のSphinx拡張
    "atsphinx.qrcode",
]
```

動作の性質上、`conf.py`上での追加設定は必要ありません。

## 動作について

拡張を登録すると、`qrcode`というディレクティブが使用可能になります。

```rest:source.rst
.. qrcode::

    https://example.com
```

上記の記述をビルドすると、次のようなQRコードが生成されます。

カメラ等でスキャンすると `https://example.com` という文字列が読み取れます。
ブラウザ等のリーダーであればそのままアクセスも可能です。

![](/images/release-atsphinx-qrcode/example.com.png)

もちろんMyST-Parserを使ったMarkdownでも問題なく動作するはず。

````md:source.md
```{qrcode}
https://example.com
```
````

### オプション

画像を出力させるためのディレクティブなので、`image`で有効なオプションがそのまま使えます。

例えば、下記のような`:align:`オプションを使うことで出力位置の調整ができます。

```
.. qrcode::
    :align: center

    https://example.com
```

また、コードのサイズを規定するバージョン情報や、誤り訂正のための処理レベルもある程度調整が効くようになっています。
このあたりは、[ドキュメント](https://atsphinx.github.io/qrcode/ja/guide/#examples)を参照してください。

## ユースケース

機能としては「テキストを管理しつつビルド時にQRコード画像を出力する」以上のことはしていません。

ここでは、この機能がSphinxとしてどの場面で役に立つかを考えていきます。

### プレゼンテーションのURL共有用

技術イベントなどで登壇をするときに、手元でも見られるように「あらかじめ公開しておきURLをシェアする」ということはよく行われます。
手法としては「SNSで共有する」というのがメジャーですが、それとは別に見かける方法として「プレゼンテーション自体にQRコードを掲載する」という手法があります。

さて、Sphinxには[sphinx-revealjs](https://pypi.org/project/sphinx-revealjs/)という「SphinxドキュメントからHTMLプレゼンテーションを生成する」という拡張が存在します。

この2つの機能を組み合わせることで、「Sphinxドキュメントからプレゼンテーションを生成して、公開予定のURLにアクセスできるQRコードを掲載する」ことが可能になります。

<!-- textlint-disable -->

サンプルとして作った例：

https://x.com/attakei/status/1965043891285172358

<!-- textlint-enable -->

### Sphinx製ポスターからのWebサイトリンク

<!-- textlint-disable -->

現代のポスターでは「Webサイトの案内としてURLとQRコードを掲載する」シーンはよく目にします。
SphinxではPDFのビルドも出来るため、うまくいけばPDF内にQRコードを掲載するにあたりこの拡張が役立つかもしれません。

<!-- textlint-enable -->

### Webサイト上への特殊なQRコード掲載

<!-- textlint-disable -->

Webブラウジングを単純にするだけではあまり需要はないですが、モバイル端末に処理を任せたほうが良いシーンが出てくるかもしれません。
妄想で言えば、「投げ銭用にPayPayのURLを掲載する」などが考えられます。

<!-- textlint-enable -->

QRコードを掲載することを考えると、画像ファイルを直接管理するほうがまず楽でしょう。
一方でQRコードの元となるテキストを管理したほうがGitとしての管理コストが低くなります。

こういった要素でも使われると面白いですね。
