---
title: "GitHub Pagesで公開する"
---

ここまでのプレゼンテーション作成を済ませれば、ローカルのブラウザ経由で発表などが出来るようになりました。
せっかくなので、ソースをGitHubで管理しながら、GitHub Pages上にビルドしたHTMLを公開してみましょう。

# GitHub Pages

## 簡単な説明

GitHub PagesはGitHubが内包する機能の一つです。
GitHubリポジトリの特定のブランチを、そのまま`USERNAME.github.io`のドメイン配下で公開できるようになります。[^#]

[^#]: `https://github.com/USERNAME/REPOSITORY`に対して、`https://USERNAME.github.io/REPOSITORY`というサイトになります

簡単なデモやドキュメンテーションだけでなく、ブログなどの公開を行っている人もいます。
`sphinx-revealjs`では本体リポジトリのPagesでデモを公開しています。
[こちらで公開している](https://attakei.github.io/sphinx-revealjs/)ので、その他の機能に興味があるなら是非見に来てください。

## Pages用のブランチにHTMLをコミットする

前述の通り、Pagesのためブランチを指定した上でコミットとプッシュをすることでPagesの公開・更新が可能となります。
まずは、その手法を考えてみましょう。

一番シンプルな考え方となる方法は、「手元でHTMLをビルドしてまるごとコミットする」となります。
しかし、Pages用ブランチはコンテンツがリポジトリのトップに来ねばならず、ワークスペースとして使いつつ同時にコンテンツをコミットしていくのはそれなりに大変です。

そこで、今回はGitHub Actionsを用いて、このあたりの作業を自動化していきましょう。

# GitHub Actions

## 簡単な説明

GitHub ActionsはGitHubが内包する機能の一つです。
「定型的な作業=何をやるか」と「作業の実行トリガー=いつやるか」をワークフローとして管理して、作業の自動化を実現することが可能になります。

## 実際にどこを「自動化するか」

もとのソースを管理しつつ、GitHub PagesにビルドしたHTMLを公開するには、以下の工程が必要です。

1. 必要なソースを一通りコミットする
1. ソースからHTMLをビルドする
1. ビルドしたHTMLを特定ブランチにコミットする
1. 上記のコミットをGitHubにプッシュする

このうち、2-4の工程をGitHub Actionsで自動化していきます。
（なお、1番めのコミットをGitHubにプッシュした時をトリガーとします）

# 事前準備をする

今回紹介するワークフローを使うようにするために、次の作業をあらかじめ実施してください。

## requirements.txtに依存ライブラリを記載する

実際にワークフロー上で動作する環境は、これまでローカルでビルドしたSphinx用の環境と揃っていることが望ましいです。
そのため、事前にビルドに必要となる依存ライブラリの取りまとめを行い、これをGitで管理しましょう。

```shell-session
pip freeze > requirements.txt
```

この作業はSphinx拡張を増やすたびに必要になります。忘れないように気をつけましょう。

## GitHubのパーソナルトークンを生成する

今回のワークフローでは、ワークフロー内の処理としてGitHubにプッシュする行為が含まれています。
GitHubへのプッシュには認証が必要になりますが、リポジトリのプッシュ権を持つことが必須となります。

今回は、自身のGitHubアカウントのパーソナルアクセストークンを権限指定で作成して、ワークフロー内の認証に使います。

1. [GitHubのPersonal access tokensページ](https://github.com/settings/tokens)にアクセスする
1. `Generate new token`のボタンをクリックして、トークンの新規作成を進める
1. 必要な設定を行いトークンを作成する
    1. `Note`には適当な名称でよい
    1. `Select scopes`は、少なくとも`repo`にチェックを入れれば大丈夫
    1. ページ最下層の`Generate token`でトークンを生成する
1. 生成されたトークンはメモっておく

## リポジトリの設定にトークンを保存する

ワークフローでトークンを使うためには、リポジトリ設定にトークンを保存する必要があります。

1. リポジトリのトップから`Settings`タブ経由で設定画面にアクセスする
1. 左メニューにある`Secret`でGitHub Actions用の変数管理画面にアクセスする
1. `New repository secret`ボタンで変数を登録する
    - `Name`には、`GH_PAT`を入力
    - `Value`には、先程生成したトークンを入力
1. `Add secret`で保存

# ワークフローを登録する

ここまで実施したら、ワークフローファイルをコミット・プッシュをするだけです。

GitHub Actionsで使うワークフローの定義は、`.github/workflows`配下にYAMLファイルで作成する必要があります。
作成されたファイルがコミットされ、GitHubにプッシュしたタイミングで、GitHubがActionsのプロセスが動きます。

## ワークフロー全文

```yaml:.github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: actions/setup-python@v1
        with:
          python-version: 3.9
      - name: Build pages
        run: |
          pip install -r requirements.txt
          make revealjs
          touch build/revealjs/.nojekyll
      - name: Deploy to GitHub Pages
        uses: maxheld83/ghpages@v0.2.1
        env:
          BUILD_DIR: build/revealjs
          GH_PAT: ${{ secrets.GH_PAT }}
```

## ワークフローの解説

ここからはワークフローファイルの各セクションの解説をしていきます。

なお、`name`はGitHub ActionsのWeb画面上で使われるだけなので、解説は省略します。

### on

Actionsのトリガーとなるイベントを定義します。

いくつかの種類があるのですが、今回使っているのは`push`,`workflow_dispatch`の2種類です。

`push`はGitHubへプッシュが行われたときにワークフローを実行することを意味します。
更に小要素で「特定へのプッシュのみに限定」などが出来ますが、今回は`push:`とだけ定義して「全ブランチへのプッシュ」と簡素な定義としています。

もう一つの`workflow_dispatch`はGitHubリポジトリなどでのイベントではなくGitHub Actions上で手動実行できるようにするための定義です。
こちらも更に小要素に定義を書くことで、実行時のオプションなどを用意することが出来ます。

### jobs

Actionsのトリガーに応じて実際に実行するタスク処理を定義します。

`build.runs-on`でワークフローの実行環境を呼び出した後に、`steps`で定義されたタスクを順に実行する形式になっています。

今回は次のようなステップでテスクが定義されています。

1. Gitリポジトリのチェックアウトを行い、ソースを取ってくる
1. Python実行環境をセットアップする
1. 実際に書いたコマンドを順に実行して、HTMLビルドを行う
1. GitHub Pages用ブランチにコンテンツをまるごとコミット・プッシュする

### jobs:ビルド処理をちょっと細かく

`name: Build pages`とあるステップの中身を見てみましょう。

```bash
pip install -r requirements.txt
make revealjs
touch build/revealjs/.nojekyll
```

最初の2コマンドはビルドのためのものですが、最後に見慣れないコマンドがあります。
これは、GitHub PagesとSphinxの仕様によって必要となるファイルを生成しています。

Sphinxの標準構成では、静的ファイルはまとめて`/_static`というパスにコピーします。
一方でGitHub PagesはJekyllというソフトで動作しているのですが、Jekyllのデフォルト動作として「アンダースコアで始まるパスは参照できない」という挙動となっています。
そのため、この問題を回避するために`.nojekyll`というファイルを用意することで、`/_static`配下のファイルもリクエスト可能にする必要があります。


# ワークフローを観察する

これで、プッシュするたびに自動でGitHub Pagesが更新されるようになりました。

ソースのテキストなどを変更して、様子を見てみましょう。
