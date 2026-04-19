---
title: "Sphinxの日本語検索性能をLinderaで(また)向上させる"
emoji: "🔍"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx", "python", "形態素解析", "lindera"]
published: false
---

以前にこんな記事を書いて公開しました。

https://zenn.dev/attakei/articles/tokenize-japanese-on-sphinx

この過程で、`atsphinx.toybox.lindera_search`というモジュールを作っていたのですが、
いろいろな事情を経て `atspninx-lindera` という単体パッケージとして公開し直すことにしました。 [^1]

[^1]: 事情の例: 放置していたら、当時の依存ライブラリであった`lindera-py`が名称変更で消滅した。

https://pypi.org/project/atsphinx-lindera

この記事では「基本機能」「以前との違い」「未来への妄想」「余談」の4構成でお送りします。

## そもそも何をするものか

atsphinx-lindera は、大雑把に伝えると「SphinxでLinderaを使った【何か】をする」ためのライブラリです。
一応は【何か】として複数の機能を想定していますが、現時点では前述の経緯を持つ「Sphinxの日本語をトークナイズする」機能のみを持っています。

### Linderaの超簡単な紹介

LinderaはRust製の形態素解析ライブラリです。
日本語用の形態素解析ライブラリはMeCabなどがありますが、「動作が高速」かつ「OSを選ばない」というあたりが助かるポイントだったりします。

https://lindera.github.io/lindera/ja/

### 使い方

導入は非常にシンプルで、Sphinxドキュメントがあるなら「ライブラリをインストールする」「`conf.py`を編集する」という2手順で済みます。

```console:pipでのインストール例
pip install atsphinx-lindera
```

```python:conf.py
html_search_options = {
    "type": "atsphinx.lindera.splitter.LinderaSplitter",
}
```

この状態で`sphinx-build`を実行すると、自動で辞書ファイルのダウンロードして、ドキュメント検索用のファイル生成時にLinderaを使ったトークナイズをします。

## toybox版との違い

ここまでは、toybox版で使えた機能と全く同じで、検索用のトークナイズを実行するための "Splitter" を提供しているだけです。
ここからは追加で出来るようになった、「辞書ファイルの入れ替え」を紹介します。

atsphinx-linderaは、PythonでLinderaを使うための lindera-python が依存ライブラリとなっています。
先程「自動で辞書ファイルのダウンロードをして」と書いたのですが、lindera-pythonはインストール時点では辞書ファイルを同梱していません。
そのため、ライブラリを使用する側で辞書を用意する必要があります。

atsphinx-linderaのSplitterクラスからは、オプションで辞書ファイルの指定が可能になっています。
デフォルトではIPADICをダウンロードしますが、LinderaのGitHub Releases上にある別の辞書を指定できます。

```python:IPADIC NEologdを使うケース
html_search_options = {
    "type": "atsphinx.lindera.splitter.LinderaSplitter",
    "dict_type": "ipadic-neologd",
}
```

例えば、IPADIC NEologdを使うことで、処理コストと引き換えに検索精度のさらなる向上を計れます。

また、韓国語や中国語の辞書ファイルも提供されているため、これらの言語の検索性能も向上する可能性があります。 [^2]

[^2]: 今のところは全く試してもいません。そもそも、`language=ko`でビルドした時にちゃんと反応するのかも見ていません。

使用可能な辞書は、[atsphinx-lindera](https://atsphinx.github.io/lindera/ja/usage/splitter/)か[Lindera](https://lindera.github.io/lindera/ja/concepts/dictionaries.html)の対象ドキュメントを参照して下さい。

## 未来への妄想

今回`atsphinx-lindera`という名称で公開することにしています。
これはlindera-pythonの構成を考えると、別のライブラリにすると辞書を個別管理になってしまいそうなのと、
他の使い道もありそうなのでは？と考えたためです。 [^3]

[^3]: この時点の実装では、辞書のダウンロード先はユーザー領域に作った"atsphinx-lindera"というフォルダのため、いざとなったら使い回しができます。

というわけで、ここでは「こんなこと出来るんじゃない？」というものをメモ書きしてみます。

### 語句ベースの所要時間

よくブログなどにある「読むのにかかる時間: N分」というやつです。

トークナイズをすると、分割したトークンごとに読み方などを受け取ることができます。
これを利用して読み方ベースの字数計算をすることで、ちょっと精緻な時間算出が可能になりそうです。

https://lindera.github.io/lindera/ja/lindera-python/tokenizer_api.html#token

### タグやタグクラウド的なものをテキストから生成する

Sphinxにはブログ機能のための拡張である[ablog](https://ablog.readthedocs.io/en/stable/)というものがあります。
ブログ機能のひとつに「タグ」がありますが、例えばトークナイズ結果のうち「固有名詞をタグとみなす」というアプローチが面白いかもしれません。

また、これをドキュメント全体に適用して「タグクラウド」を作ってみると文書系ドキュメントの傾向が分かるかもしれません。

### 横断検索用のDBを生成する

ちょうど1年ほど前に、このような記事が公開されていました。

https://voluntas.ghost.io/offline-japanese-full-text-search-in-browser/

この記事は「オフラインでも使える全文検索」をDuckDB+FTS拡張とLinderaの組み合わせをWasm上で実現しています。
記事で使っているリポジトリではデモであるためソース内でDB作成をしていますが、Sphinxのビルド時にローカルでDB構築が出来そうです。

これにDuckDBの `ATTACH` 文を使って「sphinx-build時にビルドしたDuckDB用DBファイル」をまとめて検索するサイトを用意できるかもしれません。
いわゆる「atsphinx系拡張の横断検索」といったものですね。 [^4]

[^4]: こんな感じ？
     
      ```sql
      ATTACH 'https://atsphinx.github.io/lindera/ja/_images/search.duckdb' AS lindera;
      ATTACH 'https://atsphinx.github.io/bulma/ja/_images/search.duckdb' AS bulma;

      SELECT * FROM lindera.document
      UNION ALL
      SELECT * FROM bulma.document;

      ```

## 余談: この機会に取り組んでみたこと

今までと違って、OSS開発にあたり生成AI(関連ツール含む)を使用する領域を少し増やしています。
使いはじめたもの(こと)と所感をちょっとメモしてみます。

### CodeRabbit

最初の実装まわりをちゃんとブランチを切ったうえで、プルリクエストを作成するようにしました。
そのうえで、AIレビューツールのCodeRabbitを通すようにしました。

コードだけでなくドキュメントの書きっぷりについてまで正論フィードバックを刺してくるので、
ダメージを負いつつ対応したり後回しにしていきました。
普段あまり意識しないケースについても言及してくれるので、ありがたいですね。

### ベンチマーク側の実装

辞書の選択を可能とする前に「辞書の選択やSplitterごとの性能差」みたいなものを知りたくなったので、
ドキュメントとは別に簡易的なベンチマークを取ってみました。
個人的にはあまり本質的ではない領域という認識でいるため、ここに限っては生成AIに丸投げしました。

楽ではあるものの、やっぱり「どういう意図で実装しているか」が残りづらいですね。

### ドキュメントの和訳

atsphinx系のライブラリは共通の構造として、sphinx-intlを使ったi18n対応が標準採用されています。
ローカルでは1コマンドでpoファイルの更新が可能なのですが、このpoファイル群の翻訳テキストの初稿生成をClaudeに丸投げしています。

今のところは違和感の強い翻訳が出て来ていないので、もうしばらく試していきたいですね。

### Takumi Guard(準備中)

PyPI に対するサプライチェーン攻撃に向けた対策として、GMO Flatt Securityが提供しているTakumi Guardを導入しようとしています。
ただ、GitHub Actions向けに提供されている setup-takumi-gurard-pypiがuvに未対応なため、対応後の本格導入となります。 [^5]

別リポジトリで簡単に試してみた限りでは、速度影響もないため「とりあえず導入する」でも問題なさそうです。

[^5]: [Issueを出しており](https://github.com/flatt-security/setup-takumi-guard-pypi/issues/1)、[PR自体もすでにある](https://github.com/flatt-security/setup-takumi-guard-pypi/pull/2)みたいです。
