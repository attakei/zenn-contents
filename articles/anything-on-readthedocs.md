---
title: "Read the Docs上でLTSなプレゼンテーション展開をしよう"
emoji: "📖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - "Sphinx"
  - "ReadTheDocs"
  - "revealjs"
published: false
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

## 広告領域

## リビジョン/言語切り替え用ウィジェット

## 古いバージョンを参照時の警告ダイアログ

# ここまでの知見を応用する

## Reveal.jsプレゼンテーションをRead The Docs上にデプロイする

## リビジョンによって切り替わることを確認する

## 何が嬉しいか/どのようなユースケースがあるか

# まとめ
