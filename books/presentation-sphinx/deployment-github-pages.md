---
title: "GitHub Actionsを使いGitHub Pagesで公開する"
---

ここまでのプレゼンテーション作成を済ませれば、ローカルのブラウザ経由で発表などが出来るようになりました。
せっかくなので、ソースをGitHubで管理しながら、GitHub Pages上にビルドしたHTMLを公開してみましょう。

# GitHub Pages

## 簡単な説明

GitHub PagesはGitHubが内包する機能の1つです。
GitHubリポジトリの特定のブランチのファイルや、GitHub Actions経由でビルドしたコンテンツを、`USERNAME.github.io`のドメイン配下で公開できるようになります。[^#]

[^#]: `https://github.com/USERNAME/REPOSITORY`であれば、`https://USERNAME.github.io/REPOSITORY`というサイトになります。

簡単なデモやドキュメンテーションだけでなく、ブログなどを公開している人もいます。
`sphinx-revealjs`では本体リポジトリのPagesでデモを公開しています。
[こちらで公開している](https://attakei.github.io/sphinx-revealjs/)ので、その他の機能に興味があるなら是非見に来てください。

## GitHub Pagesへ公開するアプローチ

GitHub Pages上にサイトを公開する方法は大雑把に2種類あります。

* 「公開対象のブランチ」を設定して、ブランチにビルド後のコンテンツをコミット+プッシュする。
* GitHub Actions上でワークフローを実行して、その過程でビルドされたコンテンツをデプロイする。

現状ではGitHub Actionsが「当たり前」と考えても支障はないと考えています。 [^#]
そのため、ここから先では後者の「GitHub Actions上でワークフローを実行する」手法の説明をしていきます。

[^#]: 実際の話として、「公開対象のブランチ」にプッシュするための処理もGitHub Actions上で実施可能です。こうなってくると、リポジトリの変な肥大化を気にするぐらいなら、最初から直接デプロイするほうが楽と言えます。

# GitHub Actions

## 簡単な説明

GitHub ActionsはGitHubが内包する機能の1つです。
「定型的な作業=何をやるか」と「作業の実行トリガー=いつやるか」をワークフローとして管理して、作業の自動化を実現することが可能になります。

## 実際にどこを「自動化するか」

もとのソースを管理しつつ、GitHub PagesにビルドしたHTMLを公開するには、以下の工程が必要です。

1. 必要なソースを一通りチェックアウトする
2. ソースからHTMLをビルドする
3. ビルドしたコンテンツをデプロイする

この全工程をGitHub Actionsで自動化していきます。
（なお、1番めの「コミットをGitHubにプッシュした時」をトリガーとします）

# GitHub Actionsを経由してサイトをデプロイする

## 事前準備をする

今回紹介するワークフローを使うために、次の作業をあらかじめ実施してください。

### requirements.txtに依存ライブラリを記載する

実際にワークフロー上で動作する環境は、これまでローカルでビルドしたSphinx用の環境と揃っていることが望ましいです。
そのため、あらかじめビルドに必要となる依存ライブラリの取りまとめを行い、これをGitで管理しましょう。

```shell-session
pip freeze > requirements.txt
```

この作業はSphinx拡張を増やすたびに必要です。忘れないように気をつけましょう。

### `sphinx.ext.githubpages`を有効にする

標準設定のSphinxは、ビルド時にHTML以外の静的ファイルを`_static`フォルダに配置します。
しかし、GitHub Pagesの標準動作では、`_static`フォルダへのアクセスを許可していません。

この挙動の対策として、Sphinxの標準添付されている拡張である`sphinx.ext.githubpages`を利用することで、
`_static`フォルダへのアクセスを可能にします。

```python:source/conf.py
extensions = [
    'oembed.ext.sphinx',
    'sphinx.ext.githubpages,  # 追加！
    'sphinx_revealjs',
    'sphinxemoji.sphinxemoji',
]
```

## GitHub Actionsの設定をする

事前準備を実施したら、ワークフローファイルをコミット+プッシュをするだけです。
ここからは、サンプルとなるファイルを提示しつつ、内容について簡単に解説していきます。

GitHub Actionsで使うワークフローの定義は、`.github/workflows`配下にYAMLファイルで作成する必要があります。
作成されたファイルがコミットされ、GitHubにプッシュしたタイミングで、GitHub Actionsのプロセスが動きます。

## ワークフロー全文

```yaml:.github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
  workflow_dispatch:

permissions:
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
     - uses: actions/checkout@v4
     - uses: actions/setup-python@v5
     - name: Build
       run: |
         pip install -r requirements.txt
         make revealjs
     - name: Upload artifact
       uses: actions/upload-pages-artifact@v3
       with:
         path: source/build/revealjs
     - name: Deploy to GitHub Pages
       id: deployment
       uses: actions/deploy-pages@v4
```

### `on`要素

Actionsのトリガーとなるイベントを定義します。

いくつかの種類があるのですが、今回使っているのは`push`,`workflow_dispatch`の2種類です。

`push`はGitHubへプッシュが行われたときにワークフローを実行することを意味します。
更に子要素で「特定ブランチやタグへのプッシュのみに限定」などが出来ますが、今回は`push:`とだけ定義して「全ブランチへのプッシュ」と簡素な定義としています。

もう1つの`workflow_dispatch`はGitHubリポジトリなどでのイベントではなくGitHub Actions上で手動実行できるようにするための定義です。
こちらも更に子要素に定義を書くことで、実行時のオプションなどを用意することが出来ます。

### `permissions`要素

GitHub Actionsの各動作は、実際のGitHubアカウントではなく「Actions用のユーザー」とでも呼ぶべき権限にて実行しています。
これはアカウントと違いリポジトリに関する権限が制限されています。

`permissions`を宣言することで、ワークフローの動作に必要な権限を付与していきます。

### `jobs`要素

Actionsのトリガーに応じて実際に実行するタスク処理を定義します。

`build.runs-on`で定義したワークフローの実行環境を呼び出した後に、`steps`で定義されたタスクを順に実行する形式になっています。

今回は次のようなステップでテスクが定義されています。

1. Gitリポジトリのチェックアウトを行い、ソースを取ってくる
2. Python実行環境をセットアップして、プレゼンテーション用のビルドを行う
3. GitHub Pagesへのデプロイ対象のパッケージングをする
4. 3でパッケージしたファイルを用いて、GitHub Pages上にコンテンツをデプロイする

# ワークフローを観察する

これで、プッシュするたびに自動でGitHub Pagesが更新されるようになりました。

何度かソースの更新、コミット、プッシュを実行してみて、ワークフローの様子を確認してみましょう。
