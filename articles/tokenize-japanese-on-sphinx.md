---
title: "Sphinxの検索用トークナイズあれこれ"
emoji: "🔍"
type: "tech"
topics: ["qiitaadventcalende", "adventcalendar2024", "sphinx", "lindera", "形態素解析"]
published: true
published_at: "2024-12-15 06:00"
---

:::message
この記事は、Qiita上の[NIJIBOX Advent Calendar 2024](https://qiita.com/advent-calendar/2024/nijibox)の15日目を担当している記事です。
:::

SphinxのHTMLビルダーによってで生成されたHTMLには、管理しているドキュメントに対する全文検索機能が備わっています。

この記事では、`conf.py`に記述できる設定項目のうち、標準で用意されている「検索」にまつわる部分をゆるく追いかけます。
なお、最終的にメインとなるのはタイトルにも絡む「日本語ドキュメントの検索におけるトークナイズ」になります。

## 前置き：大雑把に説明するSphinx製HTMLにおけるドキュメント内検索

Sphinxは静的サイトジェネレーターの性質を持つため、CMSなどにあるようなバックエンド側での検索機能を基本的に所持していません。
そのため、以下のようなプロセスを用いて、サイト内検索を自前で実現しています。

:::message
かなり大雑把です
:::

* ビルド時
  1. ドキュメントのリード時に、ビルド対象の文をトークンに分割する。
  1. ドキュメントの出力時に、手元にある分割済みトークンなどを使って `searchindex.js`という検索用データを生成する。
* 閲覧時
  1. 検索用のボックスや検索ページのフォームで検索リクエストを行う。
  1. 検索ページに`q=検索文字`というクエリパラメーター付きでアクセスする。
  1. 検索ページ上で動作するJavaScriptが、作成している`searchindex.js`などにアクセスしてクエリに該当するドキュメントを探す。
  1. 検索結果をスコアリングしつつ「タイトル」「序文」のセットを候補の数だけHTMLに出力する。

すぐには出てきませんが、少し先でこのプロセスを元に話を進めていきます。

## 「検索」に関わる設定項目

まずは、[Sphinxのサイトにある設定ページ](https://www.sphinx-doc.org/en/master/usage/configuration.html)を見てみましょう。
Sphinx自体のドキュメントでは、画面の左ペインに設定項目が一式表示され、項目へジャンプできるようになっています。

ブラウザで **"search"** と検索すると、全部で4個の項目がヒットします。

![](/images/tokenize-japanese-on-sphinx/search-conf.png)

まずは、これらの項目が何を担当するかを見てみましょう。
ちなみにですが、いずれも `html_` で始まるため、HTMLビルドに関するものだけであることが分かります。


### `html_use_opensearch`

OpenSearchプロトコルのタグ出力に関わる設定です。
今回は無関係なので、これ以上の説明は行いません。

### `html_search_language`

Sphinxドキュメント内を検索する際の言語を指定するための項目です。
特に指定をする必要もなく、通常であれば同じ`conf.py`で指定している`language`の値を参照します。

おそらく、検索だけ言語を変えたい時向けなのでしょうか。

### `html_search_options`

ビルド時の検索用データ関連処理に関するオプション設定を行える項目です。
とはいえ、`html_search_language`に設定できる項目と比べると、日本語と中国語にしか対応してません。

今回は、日本語のドキュメントに関わる話であるため、後ほど少し深掘りします。

### `html_search_scorer`

前述した検索プロセスにおいて、検索結果のスコアを算出するためのアルゴリズムをJavaScriptで記述する項目です。
頑張るならばサイトの傾向などに合わせたりしつつ微調整するとよいのでしょうが、話が複雑になりがちなのでこのままでも良いでしょう。

## `html_search_options`を使いこなす

この設定は、`dict[str, str]`の形式を取ります。
より具体的には、`type`には文を分割するためのクラス（Splitterクラス）を指定したうえで、`type`の内容に応じて追加で設定可能項目が増える形式です。

下記の例はドキュメントにあるものをベースにしています。

```python
html_search_options = {
    "type": "sphinx.search.ja.MecabSplitter",
    "dic_enc": "utf-8",
    "dict": "/path/to/mecab .dic",
    "lib": "/path/to/libmecab.so",
}
```

`type`に指定可能なSplitterクラスはSphinxが何種類か同梱されています。

### DefaultSplitter

`html_search_options`に何も指定しなければ、これが選ばれます。
デフォルトだけあって、意識するポイントが全く無いことはメリットと言えるでしょう。

<!-- textlint-disable -->

このSplitterクラスはJavaScript製の分かち書きライブラリである[TinySegmenter](http://www.chasen.org/~taku/software/TinySegmenter/)をPythonで実装するというパワープレイをしており、
GitHub上のコードでも[400行近くの構成になっています](https://github.com/sphinx-doc/sphinx/blob/v8.1.3/sphinx/search/ja.py#L143)。

<!-- textlint-enable -->

### MecabSplitter

有名な形態素解析エンジンであるMeCabを用いたSplitterクラスです。
Mecab自体が広く使われている分、他の開発で形態素解析を扱っている人にとっては自然な分割になるでしょう。

オプションとしては、【採用する辞書データ】【ライブラリ本体のパス】を指定できます。
【採用する辞書データ】の方は、解析の際に参照するデータを追加するために使うのですが、面白いのが【ライブラリ本体のパス】です。

<!-- textlint-disable -->

Pythonの環境としてSphinxのビルドを行う場合、[mecab-python3](https://pypi.org/project/mecab-python3/)をインストールすることがほとんどです。
しかし、不思議なことにMecabSplitterは、mecab-python3をインストールしなくてもMeCabのライブラリ（`.so`,`.dll`ファイル）さえ指定すれば、
ライブラリを直接使った分割を実行できます。

<!-- textlint-enable -->

### JanomeSplitter

Pure Pythonな形態素解析エンジンであるJanomeを用いたSplitterクラスです。
Pythonで形態素解析を試している人は知っている人もいるのではないでしょうか。

オプションとして指定できるのは、【採用する辞書データ】のみです。
このあたりはPure Pythonであるがゆえと考えると面白いところです。

「速度が犠牲になるがインストールしやすくなる」と考えると、適宜使い分けることはできそうです。
もし、普段のドキュメント作成時にsphinx-autobuildを使って頻繁にビルド後の確認をしたい場合、このあたりが足を引っ張ることを考慮すると良いでしょう。

## Splitterクラスを自作してみる

さて、ここまではSphinx内で最初から提供されているSplitterクラスを紹介しました。
しかし実は、`html_search_options`の`type`はSplitterクラスとして必要なメソッドを揃えたクラスであれば、自作したものを指定できます。

ここからは、未登場の形態素解析エンジンを用いてSplitterクラスを自作してみましょう。

### Lindera

LinderaはRust製の形態素解析エンジンです。同じRust製の全文検索エンジンであるMeilisearchの日本語担当としても知られています。
Zenn内だと、Sphinx + Meilisearchの組み合わせを紹介している下記のスクラップが有名でしょうか。

https://zenn.dev/voluntas/scraps/77ae77d06deadc

### LinderaをPythonで使うには

Lindera自体はRust製ですが、様々な環境で使えるようなライブラリ化が進められています。 [^1]
Python向けには[lindera-py](https://pypi.org/project/lindera-py/)が公開されており、現在はPyPIから標準的な方法で自環境にインストールできます。

[^1]: その中には、SQLiteのFTSトークナイザーとして使う拡張も存在します。

使い方も非常に簡単ですね。

```python:example.py
""" https://pypi.org/project/lindera-py/ にあるサンプルを、より単純化しただけ。"""
from lindera_py import Segmenter, Tokenizer, load_dictionary

# 辞書データのロード
dictionary = load_dictionary("ipadic")
# 分割処理をするSegmenterの作成
segmenter = Segmenter("normal", dictionary)
# Segmenterからトークナイザーを用意
tokenizer = Tokenizer(segmenter)

# ここから分割処理
text = "東京国際空港限定トートバッグを京都スカイツリーの最寄り駅であるきょうとスカイツリー駅で買う"
print(f"text: {text}\n")
# tokenize the text
tokens = tokenizer.tokenize(text)
for token in tokens:
    print(token.text)
```

```text:実行結果
text: 東京国際空港限定トートバッグを京都スカイツリーの最寄り駅であるきょうとスカイツリー駅で買う

東京
国際
空港
限定
トートバッグ
を
京都
スカイ
ツリー
の
最寄り駅
で
ある
きょう
と
スカイツリー
駅
で
買う
```

### LinderSplitterを定義する。

Splitterクラスに必要な要件はそんなに多くありません。基本的に下記のことだけができれば問題ありません。

- `dict`を受け取る`__init__()`メソッド
- `str`を受け取り`list[str]`を返す`split()`メソッド

今回はシンプルに次のような実装をしてみましょう。

```python:lindera_search.py
from lindera_py import Segmenter, Tokenizer, load_dictionary
from sphinx.search.ja import BaseSplitter


class LinderaSplitter(BaseSplitter):
    """Simple splitter class using Lindera as tokeniser."""

    def __init__(self, options: dict[str, str]) -> None:  # noqa: D107
        self.dictionary = load_dictionary("ipadic")
        self.segmenter = Segmenter("normal", self.dictionary)
        self.tokenizer = Tokenizer(self.segmenter)

    def split(self, input: str) -> list[str]:  # noqa: D102
        return [token.text for token in self.tokenizer.tokenize(input)]
```

- `__init__()`ではトークナイザーの生成をするだけ。
- `split()`ではトークナイザーを使って分割したトークンからテキストを抽出するだけ。

サンプルコードをそのままSplitterクラスにしたかのような実装ですが、きちんと動作します。

```python:conf.py
html_search_options = {
    # 自作して試したい場合は、conf.pyがインポートできる場所にlindera_search.pyを置いて記述
    "type": "lidera_search.LinderaSplitter",
}
```

:::details 手っ取り早く試したい場合について。

この実装自体は、すでに[atsphinx-toybox](https://pypi.org/project/atsphinx-toybox/)というパッケージから使えるようになっています。

```console
pip install 'atsphinx-toybox[lindera-search]'
```

```python:conf.py
html_search_options = {
    "type": "atsphinx.toybox.lindera_search.LinderaSplitter",
}
```
:::

### 使用感など

lindera-pyはバイナリや辞書データを含むため、Wheel形式では40MBとかなりの重量級です。
その代わりダウンロードさえ済めば基本的にRustサイドのビルドが発生しないため、実は案外インストール自体は楽だったりします。

Splitterクラスとしての動作も軽量なので、ビルドが遅くなると言った心配はなさそうです。

<!-- textlint-disable -->

一方で、トークン分割はどう違ってくるでしょうか？
Linderaのサンプルテキストを少しいじって、「東京国際空港限定トートバッグを京都スカイツリーの最寄り駅であるきょうとスカイツリー駅で買う」をそれぞれのSplitterクラスで分割してみましょう。

<!-- textlint-enable -->

| DefaultSplitter | JanomeSplitter | LinderaSplitter |
| :-------------- | :------------- | :-------------- |
| 東京国際空      | 東京           | 東京            |
| 港限            | 国際           | 国際            |
| 定              | 空港           | 空港            |
| トートバッグ    | 限定           | 限定            |
| を              | トートバッグ   | トートバッグ    |
| 京都            | を             | を              |
| スカイツリー    | 京都           | 京都            |
| の              | スカイ         | スカイ          |
| 最寄り          | ツリー         | ツリー          |
| 駅              | の             | の              |
| で              | 最寄り駅       | 最寄り駅        |
| ある            | で             | で              |
| きょ            | ある           | ある            |
| う              | きょう         | きょう          |
| と              | と             | と              |
| スカイツリー    | スカイツリー   | スカイツリー    |
| 駅              | 駅             | 駅              |
| で              | で             | で              |
| 買う            | 買う           | 買う            |

Janome/Linderaのほうが適切に分割できている印象を受けます。

## おわりに

おそらくですが、この感じの導入だけでも、Sphinxドキュメントの検索精度の向上を狙えるように感じます。
ただ、「検索精度」の定量的に捉える手法を知っているわけではないので、このあたりが自分にとっての今後の課題となりそうです。
