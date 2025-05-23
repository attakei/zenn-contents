---
title: "Read the Docs上でバージョニングされたプレゼンテーション展開をしよう"
emoji: "📖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - "Sphinx"
  - "ReadTheDocs"
  - "revealjs"
published: true
published_at: "2024-10-19 11:00"
---

# 要約

- Read the DocsはSphinx,MkDocs以外でもビルド+ビルドが出来る。
- Read the DocsにデプロイしたHTMLには基本的にバージョン切り替えウィジェットが付く。
- Read the DocsにHTMLプレゼンテーションをデプロイすることで、リビジョン比較できる「LTSな公開」が出来る。

# 2024年における、Read the Docsへのデプロイフロー

Read the Docs（以降で略称としてRTDを用いることがあります）は、2010年から運用されているドキュメント公開用のサイトプラットフォームです。
基盤レベルでi18nサポートやリビジョン単位でのサイト管理が出来るため、表明されている通りドキュメントの公開に特化したものとなっています。

なお、その成り立ちからPython + Sphinx製のドキュメントの公開によく使われています。 [^1]

[^1]: とはいえ、最近はMkDocs + 他の静的サイトプラットフォームを使うシーンも多いですが。

さて、2024年においてRTDにGitHubで管理しているドキュメントをデプロイするためには、リポジトリのルートに `.readthedocs.yml` を置く必要があります。
このファイル内にビルドに関する設定を記述しておくと、GitHubへのpush時に連動する形で設定に従ったビルドを行い、生成物をサイトとして反映してくれます。

## スタンダードな`.readthedocs.yml`シンタックス

ここで、私が開発しているOSSである[sphinx-revealjsの`.readthedocs.yml`](https://github.com/attakei/sphinx-revealjs/blob/master/.readthedocs.yml)を見てみましょう。

<!-- textlint-disable -->

:::details 全体を見たい人向け
```yaml:.readthedocs.yml
version: 2

build:
  os: 'ubuntu-22.04'
  tools:
    python: '3.11'

# Build documentation in the doc/ directory with Sphinx
sphinx:
  configuration: doc/conf.py
  builder: dirhtml

# Optionally build your docs in additional formats such as PDF and ePub
formats: all

# Optionally set the version of Python and requirements required to build your docs
python:
  install:
    - method: pip
      path: .
      extra_requirements:
        - doc
```
:::

<!-- textlint-enable -->

もともとの出自が出自だけに、SphinxやMkDocsを使う環境の場合は`sphinx`(`mkdocs`)要素に適切な記述を軽くするだけです。
これだけで適宜「`sphinx-build`によってドキュメントを生成すれば良い」判断するようになっています。
ビルドにライブラリが必要な場合も、`python`要素でrequirements.txtなどの場所を指定するだけで事前にインストールしてくれます。

## デプロイにおけるRTD内でのパス概念

スタンダードな使い方をしている場合では、次のようなルールでサイトのデプロイが行われます。

- デフォルトブランチへのpushに対しては`/latest/`というパスへのデプロイ。
- タグ管理の設定をしておけば、tag pushごとに`/v1.2.4/`というタグのパスへのデプロイ。
- tag pushに連動する形で、「最新安定版のタグ」に合わせる形で`/stable/`というパスでもデプロイ。

# 本当はより自由度の高いビルドプロセス

## アドバンスド（？）`.readthedocs.yml`

<!-- textlint-disable -->
さて、前章だけを読むと「やっぱりSphinxとMkDocsにしか使えないのでは？」と思うのではないでしょうか。
もちろん実際にそんなことはありません。何だったら大半のドキュメントツールを扱えます。
<!-- textlint-enable -->

それを知るために、Read the Docsのドキュメントを見に行きましょう。
具体的には、`.readthedocs.yaml`である下記のURLです。

https://docs.readthedocs.io/en/stable/config-file/v2.html

sphinx-revealjsのファイルにもあるのですが、`build`要素というものが存在します。
ここは、ビルド環境に関する「OS」「使用する言語」などを宣言する場所なのですが、
中に`build.jobs`や`build.commands`という要素も存在することが分かります。

実は、`build.jobs`はRTDが標準対応しているドキュメントツールでのビルド前後に追加で行う処理を宣言出来ます。

<!-- textlint-disable -->
`build.commands`にいたっては、ドキュメントツールの代わりに自分でビルドコマンドを全部記述することが出来ます。
[ドキュメントの説明](https://docs.readthedocs.io/en/stable/config-file/v2.html#build-commands)にも書かれているのですが、
`build.commands`内で定義された処理群によって最終的に`$READTHEDOCS_OUTPUT/html`に出力されているものがあれば、
このフォルダを丸ごとデプロイしてくれるようになっています。便利ですね。
<!-- textlint-enable -->

## 実際に`build.commands`で構成されたプロセスを見る

先ほどと同様に、私が開発しているOSSである[oEmbedPyの`.readthedocs.yaml`](https://github.com/attakei/oEmbedPy/blob/main/.readthedocs.yaml)を見てみましょう。

<!-- textlint-disable -->
:::details 全体を見たい人向け
```yaml:.readthedocs.yml
version: 2

build:
  os: 'ubuntu-22.04'
  tools:
    python: '3.12'
  commands:
    - pip install uv
    - uv sync --frozen
    - uv run sphinx-apidoc -f -e -T -o=docs/api/ ./oembedpy
    - uv run sphinx-build -b dirhtml docs $READTHEDOCS_OUTPUT/html

# Optionally build your docs in additional formats such as PDF and ePub
formats: []
```
:::
<!-- textlint-enable -->

`python`,`sphinx`という要素が無くなっている代わりに、`build.commands`に大きく記述がされています。
このリポジトリではパッケージ管理にuvを採用のもあり、次のようなプロセスでドキュメントのビルドを行っています。

1. uvのインストール。
2. `uv.lock`内で管理している依存ライブラリをインストール。
3. APIリファレンスもソースコードから欲しいので、`sphinx-apidoc`で生成。
4. `sphinx-build`でドキュメントの生成。

通常Sphinxのビルドをコマンドラインで行おうとすると、`make dirhtml`などを用います。
Makefile利用時はビルダーの名前と出力先は同じになってしまいます。

`build.commands`上では、ビルダーを`dirhtml`にはしているものの、出力先を`$READTHEDOCS_OUTPUT/html`としています。
結果として、RTDが要求するパスに`dirhtml`ビルダーで生成したドキュメントが出力されるため、
適切なデプロイが行われるようになっています。

# Read the DocsにデプロイされたHTMLの扱い

## デプロイ時に追加されるものたち

RTDにドキュメントをデプロイすると、ホスティングされるサイトにはいくつかのコンテンツ差し込みが発生します。

* バージョン/言語切り替え用ウィジェット
* 推奨バージョンの推奨ダイアログ
* 広告（無料版のみ）

## 広告（無料版のみ）

無料ホスティングされるサービスである以上（？）、コンテンツ内に広告が差し込まれるようになっています。
RTDが提供している`sphinx-rtd-theme`を使っている場合は、左メニューの下に表示されます。

表示可能領域が見当たらない場合もダイアログに近い形式で出力されますが、ちゃんと消去も出来るので安心ですね。

なお、実際に見ていくと分かりますが、穏当な広告しか目にしないです。
このあたりについては、[このページ](https://docs.readthedocs.io/en/stable/advertising/index.html)にも記載されています。

> Many advertising models involve tracking users around the internet, selling their data, and privacy intrusion in general. Instead of doing that, we built an Ethical Advertising model that respects user privacy.

## リビジョン/言語切り替え用ウィジェット

「RTDを使う最大のメリット」と言っても過言ではない機能です。
2024年現在だと、ブラウザの右下にフロート形式で小さなウィジェットが表示されます。

![ウィジェットの表示例](/images/anything-on-readthedocs/rtd-versioning-widget.png)

クリックすると、これまでにデプロイしたバージョンや、翻訳時における多言語版へのリンクを表示します。

![ウィジェットの展開例](/images/anything-on-readthedocs/rtd-versioning-widget-open.png)

この仕組みのおかげで「どうしても過去のバージョンが必要」な場合にも安心してドキュメントを参照できます。

## 古いバージョンを参照時の警告ダイアログ

前述の切り替え機能などを用いて、古めのバージョンのページを参照していると、
「これは古いドキュメントですよ」と警告ダイアログを出してくれるようになっています。

![アラートの表示例](/images/anything-on-readthedocs/rtd-versioning-alert.png)

もちろん意図して参照している際には邪魔ですが、ある程度の時間経過によって自動で非表示になるのでそこまでうるさくありません。

## サイトの構成次第で柔軟に動く差し込み

それぞれの説明でも触れていますが、これらのウィジェットはJavaScriptの処理によって適切な振る舞いをしてくれます。

広告もいい感じの挿入場所があればそこに差し込みますが、なければフロート形式での差し込みを行います。
ウィジェットやダイアログもフロート形式でいい感じの位置に差し込んでくれます。

# ここまでの知見を応用する

さて、ここまでのセクションでRTDが次のことを提供してくれることが分かっています。

- HTMLを生成するものなら何でもビルドできる。
- デプロイされたサイトはタグに応じたバージョン管理をしてくれる。
- どんなケースでもウィジェット類を差し込んでくれる。

<!-- textlint-disable -->

この知見を組み合わせると、

**「sphinx-revealjsでビルドしたHTMLプレゼンテーションをRead The Docs上にデプロイしてバージョン切り替えをする」**

ということが実現できます。

<!-- textlint-enable -->

## Reveal.jsプレゼンテーションをRead The Docs上にデプロイする

まずは、`.readthedocs.yml`を見てみましょう。

```yaml:.readthedocs.yml
# 必要な箇所だけ抜粋

build:
  os: 'ubuntu-22.04'
  tools:
    python: '3.11'
  commands:
    - pip install -r requirements.txt
    - sphinx-build -b revealjs source $READTHEDOCS_OUTPUT/html
```

プレーンなSphinxプロジェクトではあるものの、`sphinx`要素は使わずに`build.commands`を使っています。
これは、`sphinx`要素内で使用できるビルダーが `html`,`dirhtml`,`singlehtml`とHTML系列の組み込みビルダーだけだからです。
それ以外のビルダーを使う場合は、`build.commands`経由とする必要があります。

この状態で`git push`を進めていけば、`latest`バージョンでReveal.jsプレゼンテーションが表示されるようになります。
もちろん、tag-pushを行うことでそのタグを使ったバージョンもデプロイされていきます。

## リビジョンによって切り替わることを確認する

というわけで、実際にデプロイされているものを見てみましょう。

https://sphinx-rtd-revealjs.readthedocs.io/stable/

ソースとなる[Gitリポジトリはこちら](https://github.com/attakei-sandbox/sphinx-rtd-revealjs/)です。

Reveal.js形式のプレゼンテーションが表示されつつも、Read the Docsの広告やバージョン切り替え用ウィジェットなどが目に入ります。
実際にウィジェットを展開してバージョンを切り替えると、バージョンによる挙動の差異が分かるでしょう。

* v2024.10.13はウィジェットを消せないが、v2024.10.18以降では`D`キーを押すと非表示に出来る。
  * これは、自作のReveal.jsプラグインを採用したバージョンがここからであるため。
  * 作ったものは、[こちら](https://pypi.org/project/atsphinx-revealjs-rtd/)。興味があればどうぞ。
* v2024.10.19以降は`Based version`の記載が変わっている。

## 何が嬉しいか/どのようなユースケースがあるか

ところで、これはどのような利点があるでしょうか？

実際にこの挙動を検証したときに想像できた利点は「同一FQDN内にプレゼンテーションの改訂版を出せる」ことでしょうか。

<!-- textlint-disable -->
発表を前提としたプレゼンテーションを制作しても、ちょっとしたtypoは避けることが出来ません。
また、発表後に受けた質問の内容がきっかけで、ちょっとした修正点があるかもしれません。

今回の仕組みを利用することで、「あくまで発表時はv1.0.0」だけど「フィードバックを受けてv1.0.3に改訂している」という表現をすることが可能になります。
また、「〇〇について 2024年版」といったような形式の発表を時系列で重ねていったり、「△△講座 2024年度」のように講義用プレゼンテーションの管理も出来そうです。

そう考えると、使う人が使えば面白いことが出来るかもしれませんね。
<!-- textlint-enable -->

# まとめ

次の2点を紹介しました。

* 通常のドキュメント以外のHTMLをRead the Docsにデプロイしてバージョン切り替えをする方法
* 発表バージョン切り替えが出来るsphinx-revealjs製プレゼンテーションの紹介

「プラットフォームの仕組みとしてバージョン切り替えが容易」という点は、Read the Docsの中でも便利な機能であるのは間違いなさそうです。
面白い使い方が出来るといいですね。

