---
title: "asciinemaを知り、Sphinxとの組み合わせまで試す"
emoji: "⌨"
type: "tech"
topics: ["Sphinx", "gfm", "qiitaadventcalende", "adventcalendar2024"]
published: true
published_at: "2024-12-14 06:00"
---

:::message
この記事は、Qiita上の[NIJIBOX Advent Calendar 2024](https://qiita.com/advent-calendar/2024/nijibox)の14日目を担当している記事です。
:::

最近になって「とあるきっかけ（後述）」から、asciinemaを使っている事例を初めて目にしました。その事例と同じ目的で採用してみたくなったので、ちょっと追いかけてみました。

当然のようにタイトルに"Sphinx"が含まれていますが、後半に登場します。

## asciinema とは

https://asciinema.org/

asciinemaは、ターミナルの動作に関する記録、再生、共有などを行うためのツールです。

上記のサイトではプレイヤーによる再生だけでなく、自サイトに埋め込むためのフォーマットも用意されています。
また、プレイヤーは標準的な動画プレイヤーと同様にタイムライン操作ができますし、どのタイミングからでもからでもターミナルの状況をクリップボードにコピーできます。

総じて、ドキュメントや技術記事における「操作と結果の例示」に使うことができます。
操作の様子を分かりやすく表現できる分、「コードブロックによる入力例の再現」と比べて再現性に優れていそうです。

下記のような内容をアニメとして再現できると考えると、「便利そう」という感覚は伝わるでしょう。

![](/images/asciinema-with-sphinx/intro.gif)

:::message
上記は、 https://asciinema.org/a/5E5V7BWvQ34LqjqIhF9JIQI8a のアニメをガイドに従って、GIFにしたもの。
:::

## 標準的（？）な使い方

:::message
~~残念ですがZennではGIFとしてしか再生できないため、~~ コードブロックで説明します。
:::

### インストール

https://docs.asciinema.org/manual/cli/installation/

多くのパッケージレジストリに登録されているため、基本的にはOS標準の方法でインストールできます。

なお、現状ではPython製のため [^1] 、PyPI経由でもインストールできます。
今なら、pipxやuvの`uvx`コマンドを使うことで実行環境ごと用意できるので、Pythonistaな人はこちらを使うとよいでしょう。

[^1]: Stableはv2.4.0なのですが、RC段階のv3.0.0ではRustに書き換えられてます。

```console:uvユーザー向けの例
$ uvx asciinema --version
asciinema 2.4.0
```

## ターミナル状況をキャプチャする

asciinemaにはいくつかのサブコマンドが存在するのですが、`rec`サブコマンドを使うことでキャプチャを開始できます。

```console:録画開始
$ asciinema rec play.cast
asciinema: recording asciicast to play.cast
asciinema: press <ctrl-d> or type "exit" when you're done
attakei/age-cli ‹main* ?›
```

コマンドを実行すると、本当にしれっとキャプチャを開始します。
キャプチャ対象となるセッションを新規で作成するため、メッセージ通り `Ctrl + D`ショートカットや`exit`コマンドがセッションを閉じるまでをキャプチャします。

キャプチャが終了した時点で引数として渡した、`play.cast`に保存されます。

:::details 中身をちょっとだけ見る。

`less`などで`play.cast`の中身を覗いてみましょう。

```cast:play.castの序盤
{"version": 2, "width": 120, "height": 30, "timestamp": 1733422049, "env": {"SHELL": "/bin/zsh", "TERM": "xterm-kitty"}}
[0.104941, "o", "\u001b[1m\u001b[7m%\u001b[27m\u001b[1m\u001b[0m                                                                                                                       \r \r"]
[0.158189, "o", "\r\u001b[0m\u001b[27m\u001b[24m\u001b[J\u001b[1m\u001b[35mattakei/age-cli\u001b[39m \u001b[22;33m‹main\u001b[22;33m›\u001b[00m \r\n\u001b[1m»\u001b[0m \u001b[K\u001b[?2004h"]
[1.903236, "o", "g"]
[2.004819, "o", "\b\u001b[1m\u001b[31mg\u001b[1m\u001b[31mi\u001b[0m\u001b[39m"]
[2.183193, "o", "\b\b\u001b[0m\u001b[32mg\u001b[0m\u001b[32mi\u001b[32mt\u001b[39m"]
[2.424503, "o", " "]
[2.614566, "o", "s"]
[2.862868, "o", "t"]
[2.964868, "o", "a"]
[3.192671, "o", "t"]
[3.293023, "o", "u"]
```

パッと見た感じでは、最初の1行目にターミナルのサイズや前提条件の情報が書かれています。
そこから先は`[{}タイムライン}, {動き}, {内容}]`と思わしき行がひたすら続いています。

おそらくは、これが動画のスクリプトして機能してプレイヤー上で再生させているのでしょう。
:::

### サイトにアップロードする

ユーザーを作成しておくと、出力された`.cast`をアップロードして動画形式で公開できます。
一応、認証していなくてもアップロードや公開自体は可能ですが、下記の通り7日しか閲覧できません。

```console
$ asciinema upload play.cast
View the recording at:

    https://asciinema.org/a/{ランダム生成された動画ID}

This asciinema CLI hasn't been linked to any asciinema.org account.

Recordings uploaded from unrecognized systems, such as this one, are automatically
deleted 7 days after upload.

If you want to preserve all recordings uploaded from this machine,
authenticate this CLI with your asciinema.org account by opening the following link:

    https://asciinema.org/connect/{連携のUUID}
```

ちなみに、ブラウザでログイン後に下記のコマンドを実行して、連携用のURLをリクエストするとそのまま維持可能になります。

```console
$ asciinema auth               
Open the following URL in a web browser to link your install ID with your asciinema.org user account:

https://asciinema.org/connect/19fb0cb4-cf96-4727-993b-96391f8ea6af

This will associate all recordings uploaded from this machine (past and future ones) to your account, and allow you to manage them (change title/theme, delete) at asciinema.org.
```

![](/images/asciinema-with-sphinx/age-cli-demo.gif)

:::message
上記は、 https://asciinema.org/a/693544 のアニメをガイドに従って、GIFにしたもの。
:::

### ローカルで使う

<!-- textlint-disable -->

生成された`.cast`ファイル自体はローカルやホスティングされたHTML上での再生も可能です。
フロントエンド力があればおそらく問題ないと思うのですが、今回はスルーします。

<!-- textlint-enable -->

## Sphinx上で使う

自身のメインドキュメントビルダーであるところのSphinxですが、asciinema向けの拡張が存在します。

https://pypi.org/project/sphinxcontrib.asciinema/

HTMLを含めたSphinx製のドキュメントにasciinemaのプレイヤーを埋め込むという優れモノで、非常にシンプルな記述で書くことができます。

```rest:index.rst
.. asciinema.org 上で公開されている動画を埋め込む場合

.. asciinema:: 693544

.. asciinema.org 上で公開されている動画を埋め込む場合

.. asciinema:: ./demo.cast

.. 更に埋め込み時のサイズを調整したい場合

.. asciinema:: ./demo.cast
   :rows: 20
   :cols: 60
```

上記の`asciinema`ディレクティブはSphinx拡張おなじみの「PyPIからインストール」→「`conf.py`の`extensions`に登録」の組み合わせだけが必要なので非常に簡単です。

### 実際に埋め込んでみた。

以前に[Zenn記事](https://zenn.dev/attakei/articles/age-cli-beta)としても紹介した、自作のバージョニングツール age には簡易的なWebサイトが存在します。 [^2]

[^2]: このサイトはSphinx製です。

https://age.attakei.dev/

今回は、このトップページにコマンド実行のデモをasciinemaを使って埋め込んでみました。
実際にサイトにアクセスすると、埋め込まれたデモから「このツールがどのような動きをするか」が簡単にでも分かるようになっています。

実際のソースはGitHub上で公開されています。

https://github.com/attakei/age-cli

`doc`配下がそうなのですが、「この記事を作成する際に作った`.cast`ファイルを配置して`index.rst`から参照させる」だけであるのが分かるでしょう。

古くからあるツールであるため十分枯れてると言っても良さそうです。
いくつかのドキュメントなどに利用可能かを深く検証してみようと思っています。

## 「とあるきっかけ」について

https://nekmo.github.io/python313-presentacion/

これは2024年11月にスペインのPythonイベントで発表されていたもので、Python 3.13の新機能を紹介しています。
途中にある[このスライド](https://nekmo.github.io/python313-presentacion/#/colores)を見てもらうと分かるのですが、「インタプリタの動作時に出力が複数色になった」ことをasciinemaを用いて説明しています。

実は、これは私が開発している [sphinx-revealjs](https://pypi.org/project/sphinx-revealjs)で作られたHTMLプレゼンテーションです。
実際に[ソースもGitHub上で公開されている](https://github.com/nekmo/python313-presentacion/)ので、私が前章でやっていることと同じであることも確認できます。

ライブラリのエゴサーチをしてた時に偶然見つけたのですが、初めて見たときは「Sphinxの機能をフル活用してプレゼンテーションを書ける」という仕組みを既存のSphinxをうまく使っていると感心しました。
いまでは、ソースを読みつつ「こんな拡張もあるのか」「こうCSSをかけばアニメーションも実現できるのか」と勉強させてもらっています。
