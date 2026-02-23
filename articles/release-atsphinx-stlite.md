---
title: "atsphinx-stliteを使い、ドキュメントを「さらに」インタラクティブにする"
emoji: "📊"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx", "Streamlit", "Stlite"]
published: false
---

:::message
初稿はここで公開しますが、今後書き直したりしたものを別の場所に公開する可能性があります。
:::

この記事は、最近公開したSphinx拡張に関して、日本語で書いた簡易的なリリースノートです。

## 前提知識

記事化を優先するため、以下の技術スタックがどんなものかについては深く触れません。
文の構成から性質等に触れるケースなどはありますが、基本的には「概要レベルでは知っている」想定での内容になります。

* Sphinx
* Streamlit
* Stlite

## 何を作ったか

[atsphinx-stlite](https://pypi.org/project/atsphinx-stlite/)というSphinx拡張です。
大雑把に書くと、ディレクティブを通してStreamlitのアプリケーションをドキュメントへ埋め込めるようにします。

Sphinxはドキュメントビルダーであるため、基本的にビルド時に生成されるものは静的サイトになります。
そのため、インタラクティブな内容を提供するのに工夫が必要だったり、条件によってはほぼ不可能だったりします。

しかし、Stliteの出現によって、いわゆる「フロントエンド環境」上にSteamlitの振る舞いを載せることが容易になりました。
今回のSphinx拡張は、この構造をdocutilsの動作に落とし込むことで、「構造的な文書」と「その事例の紹介」を1つのドキュメントに収めることが可能になっています。

## 使い方の簡易解説

### セットアップは「いつも通り」

インストールとドキュメント上での有効化は、Sphinxを使っている人には「いつも通り」の方法で行えます。
PyPI上では `atsphinx-stlite` というプロジェクト名で登録されており、利用時のパッケージ名は `atsphinx.stlite` となっています。

```console
pip install atsphinx-stlite
```

```python:conf.py
extensions = [
    "atsphinx.stlite",
]
```

今のところ、最初の段階から調整が必要な設定は存在しないため、`conf.py`はこの設定だけで問題なく動作します。

### Streamlitのアプリを埋め込んでみる

拡張を有効化したことで、`stlite` というディレクティブが使用可能になります。
基本的にはディレクティブのコンテンツ部分にStliteなどで普段書いているコードをそのまま書くだけで平気です。

```rst
.. stlite::

   import streamlit as st
   import pandas as pd

   df = pd.DataFrame({
       'first column': [1, 2, 3, 4],
       'second column': [10, 20, 30, 40]
   })

   st.write(df)
```

見ての通り、ごくごく普通のコードです。
この記述がある状態でSphinxドキュメントをビルドすれば、記述した箇所でそのままStliteのアプリケーションが動作するようになります。

また、引数としてソースのパスを指定することで、ドキュメント上へ記述せずにPythonのコードとしても管理できます。

```rst
このドキュメントソースと同じパスに ``example.py`` というStreamlitアプリのソースを置けば、
ビルド時に自動でインクルードします。

.. stlite:: ./example.py
```

### オプションを組み合わせる

場合によっては動作時に追加で依存ライブラリを指定する必要があります。
これは`requirements`属性に追加することで、アプリ動作時に自動でインストールしてくれます。

```rst
このコードは、 https://stlite.net/browser/#installing-packages の例をそのまま使用しています。

.. stlite::
   :requirements: faker
   
   import streamlit as st
   from faker import Faker
   
   # Set seed for deterministic output (useful for testing)
   Faker.seed(12345)
   fake = Faker()
   
   st.title("Requirements Demo")
   st.write("This demo shows how to install Python packages.")
   
   st.subheader("Faker Examples")
   
   st.write("Name: " + fake.name())
   st.write("Email: " + fake.email())
   st.write("Address: " + fake.address().replace("\\n", ", "))
   st.write("Company: " + fake.company())
```

## 利点を考える

実際のところ「何で作ったんですか？」と聞かれたら「埋め込めるのなら面白そうだったから」という非常に雑な理由だったりします。
ただ、実際にこれ自体のドキュメントを書いてみた感じでは、次のようなことが可能そうです。

### ドキュメントの解説をすぐ近くに置ける

シンプルな利点として、ドキュメント上に「サンプルコード」と「コードが動作する様子」をそのまま掲載できるようになります。
「使い方の簡易解説」でも書いた通りソースコードを引数指定できるため、次のようなアプローチでコード管理が楽になります。

* `literalinclude` ディレクティブを用いて、ソース自体の紹介をする。
* `stlite` ディレクティブを用いて、実際の挙動を見せる。

これは、手元に環境を用意してもらうよりも遥かに簡単な方法になるでしょう。

### 「プレゼンテーション」と「デモ」の組み合わせ

ドキュメンテーションで利便性があるということは、プレゼンテーションでも利便性があります。

自分が作っている sphinx-revealjsはSphinx拡張として動いているため、当然ながらatsphinx-stliteをそのまま使うことができます。
つまり、理論上は「インタラクティブなプレゼンテーション」を生み出す一要素として機能します。

もし、興味があったらこの組み合わせで発表してみてください。共有してもらうと喜びます。

## 内部実装の一部紹介

ここから先は、atsphinx-stliteを実装していたときに改めて気づいたことをメモしてみます。

### ディレクティブのオプションに改行を含められる

ディレクティブのオプションを記述する箇所なのですが、どうやら Field listの挙動と同じっぽいです。
そのため、今まで意識したことがなかったのですが、改行を含めたテキストを普通に受け入れるし、インデントは適度に考慮してくれます。

```rst
.. stlite::
   :requirements:
     faker
     docutils
```

上のような記述をした場合、`requirements`の値は`faker\ndocutils`と扱われるようです。
そのため、利用者側は比較的自由度の高い記述が可能でした。

### iframeのsrcdoc属性が便利

実は「Sphinx上にStliteを埋め込む」という実装自体は、1年以上前にatsphinx-toybox内で試していました。

当時はディレクティブを記述した箇所に対して、「StliteのHTML要素をそのまま埋め込む」という実装をしていした。
しかし、Streamlitの挙動に「`<title>`要素を問答無用で書き換える」という物があり、これが気に食わずしばらく放置してました。

この挙動を回避するために、今回の再実装では`<iframe>`要素を使ったのですが、普段見ることが多いだろう`src`属性を使わずに`srcdoc`属性を使うことにしました。

https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Elements/iframe#srcdoc

```html
<!-- よく見るパターンでの実装例（不採用） -->
<div class="stlite-wrapper">
  <iframe class="stlite-frame" src="{Stliteを使ったHTMLファイルのURL}"></iframe>
</div>
<!-- 今回の実装例（採用） -->
<div class="stlite-wrapper">
  <iframe class="stlite-frame" srcdoc="{Stliteを使ったHTMLテキスト全部}"></iframe>
</div>
```

上記の例のように、指定したURLにリクエストを行い埋め込む`src`属性とは違い、`srcdoc`属性は埋め込みたいHTMLを丸ごと記述することでフレーム内にコンテンツを表示する挙動をします。
この仕組みのお陰で、ビルド時に余計なファイル出力をする必要がなくなり、URLをどう指定すべきかを一切考慮しなくて済むようになったので、大変助かりました。
