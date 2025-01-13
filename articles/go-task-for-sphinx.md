---
title: "go-taskを使ったSphinxドキュメント運用"
emoji: "📖"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Sphinx", "gotask", "taskfile", "qiitaadventcalende", "adventcalendar2024"]
published: true
published_at: "2024-12-01 06:00"
---

:::message
この記事は、Qiita上の[NIJIBOX Advent Calendar 2024](https://qiita.com/advent-calendar/2024/nijibox)の1日目を担当している記事です。
:::

今年参画していた案件で見て以降、go-taskを使うモチベーションが上がってきています。
「モチベーションがあるうちに」ということで、最近ではライブラリのドキュメント（Sphinx製）のタスクランナーをmakeからgo-taskに置き換える試みをしてみました。

この記事では、go-taskを使ったMakefileからTaskfileへの置き換えを紹介します。
なお、置き換え時には次の点について配慮していました。

* もともとできたことが全部できる。（自分が扱う範囲で）
* go-taskの文法を使い、簡易に書けるところは簡易に書く。

## 「〇〇ってそもそも何？」な人向け

* go-task
  * [Webサイト](https://taskfile.dev/)
  * [日本での解説記事例](https://dev.classmethod.jp/articles/go-task-github-actions-integration/)
* Sphinx
  * [Webサイト](https://www.sphinx-doc.org/ja/master/)
  * [日本のユーザー会](https://sphinx-users.jp/)
  * [Makefileの例(Sphinx本体のドキュメント)](https://github.com/sphinx-doc/sphinx/blob/master/doc/Makefile)

## 実物と使用法

go-taskのタスク定義として使うTaskfile.yamlはこんな感じになっています。

```yaml:Taskfile.yaml
version: '3'

vars:
  # If you run bare environment or activated venv, set '' (blank string)
  # RUN_PYTHON: ''
  SPHINX_DEFAULT_BUILD: 'mini18n-dirhtml'
  SPHINX_OPTIONS: ''
  SPHINX_LANGUAGES:
    - 'ja'

env:
  SPHINXINTL_TRANSLATOR: "Kazuya Takei <myself@attakei.net>"

tasks:
  intl:
    desc: 'Sync i18n environment'
    dir: '{{.TASKFILE_DIR}}'
    cmds:
      - '{{.RUN_PYTHON}} sphinx-build -M gettext . _build {{.SPHINX_OPTIONS}}'
      - '{{.RUN_PYTHON}} sphinx-intl update --language={{.SPHINX_LANGUAGES | join ","}}'
  dev:
    desc: 'Run docs server'
    dir: '{{.TASKFILE_DIR}}'
    cmds:
      - '{{.RUN_PYTHON}} sphinx-autobuild -b dirhtml . _build/dirhtml'
  build-*:
    desc: 'Make docs'
    dir: '{{.TASKFILE_DIR}}'
    vars:
      TARGET: '{{index .MATCH 0}}'
    cmds:
      - '{{.RUN_PYTHON}} sphinx-build -M {{.TARGET}} . _build'
  build:
    desc: 'Make docs (default target)'
    deps:
      - 'build-{{.SPHINX_DEFAULT_BUILD}}'
  help:
    desc: 'Display help of docs'
    deps:
      - 'build-help'
  clean:
    desc: 'Clean build files of docs'
    deps:
      - 'build-clean'
```

* `task build-BUILDER`で`make BUILDER`と同じ。
* `task clean`は`make clean`と同じ。
* `task help`は`make help`と同じ。
* `task build`は`SPHINX_DEFAULT_BUILD`で指定したビルダーを実行するショートカット。
* `task intl`は`SPHINX_LANGUAGES`で指定したi18nリソースを生成or更新(sphinx-intlインストール時)
* `task dev` (sphinx-autobuildインストール時)

## Makefileが最初からあるのにgo-taskに置き換えた理由

Sphinxドキュメントの運用時において「Makefileから置き換えるメリット」は、総合的に見るとそこまで大きくありません。
というわけで、個人的な嗜好が強いのですが、go-taskを使っている理由を軽く説明してみます。

## ファイルが減る

`sphinx-quickstart`で生成されるファイルは、Makefileの他にmake.batがあります。
後者のファイルは名前の通りWindows用なのですが、正直なところ自分の環境下で使うことがほぼありません。

とはいえ、パブリックなプロジェクトでは「Linux/macOSの`make`で使えるなら`make.bat`でも使えるべき」となるでしょう。
つまり、「使う機会が少ないのに編集はしたほうが良い」という状況になります。
そこで、いっそのことタスクランナーを完全に統一することでファイルの削減をする方針を取りました。 [^1]

[^1]: 当然ながらこの方法だとgo-taskのインストールが必要になりますが、嫌な場合はコマンドラインで頑張ってもらう形になります。

## インデント形式を統一できる

自分が普段扱っているコードは基本的にスペースでインデントをしています。
一方で、Makefileはタブインデントなファイルフォーマットとなっています。

エディターやIDEでなんとかなる話ではあるのですが、ターミナル等からコピペする時に事故ることがあります。 [^2]
最終的に「コンテキストスイッチを減らす」目的とセットで、スペースインデントで書けるYAMLを使うことにしました。

[^2]: 「タブ記号をコピーできない」という事象が起きがち。

## 複雑なことがしやすい

例えば、go-taskの文法では `desc` という要素を定義することで、 `task -l` でタスクの一覧を分かりやすくできます。
更に、`vars`での変数定義周りの書式などを含めて、「ちょっと複雑なこと」をしやすくなっています。

## やってること

今回使い始めたTaskfile.yamlを組み立てるにあたって、試したりした工夫点をまとめます。

## 実行環境の変数化

`vars`要素内に、Taskfile内で使用可能な変数として`RUN_PYTHON`を定義しています。
（ただし、テンプレート内の初期構造では、コメントアウトしています）

```yaml:Taskfile.yaml(抜粋)
vars:
  # If you run bare environment or activated venv, set '' (blank string)
  # RUN_PYTHON: ''

tasks:
  intl:
    desc: 'Sync i18n environment'
    dir: '{{.TASKFILE_DIR}}'
    cmds:
      - '{{.RUN_PYTHON}} sphinx-build -M gettext . _build {{.SPHINX_OPTIONS}}'
```

Taskfile内では、定義の各所にて`{{.<変数名>}}`を記述しておくと、あらかじめ`vars`内で宣言した変数を埋め込むことができます。
上記の例ではコメントアウトしていますが、`RUN_PYTHON: 'uv run`としておくと、uvを使用している環境下であることを前手にできます。

コメントアウトして変数自体の定義がない場合は、ただの空文字列として扱われます。
上記の例ではuv等を経由せず`sphinx-build`を実行しようとすることになり、「venv環境下」や「Sphinxをグローバル環境下にインストールしている」ことを前提にできます。

## タスクのワイルドカード化

下記の抜粋箇所では、タスク定義に`*`が使われています。
これはよくあるワイルドカードの記述として機能しており、`build-`から始まる全ての文字をタスクとして捕捉します。

```yaml:Taskfile.yaml(抜粋)
tasks:
  build-*:
    desc: 'Make docs'
    dir: '{{.TASKFILE_DIR}}'
    vars:
      TARGET: '{{index .MATCH 0}}'
    cmds:
      - '{{.RUN_PYTHON}} sphinx-build -M {{.TARGET}} . _build'
```

このタスク自体は`sphinx-build`コマンドで「何かしらのビルダーを指定してビルドを実行する」ことを目的としています。
`cmds`内の記述にもあるように、`-M`というビルダー指定のオプションとして`{{.TARGET}}`を指定しています。
この`TARGET`はタスクをスコープとした`vars`内で定義されており、`{{index .MATCH 0}}`を指定しています。

<!-- textlint-disable -->

タスク定義時にワイルドカードを使用すると、`MATCH`という変数に文字列のリストが設定されます。 [^3] [^4]
さらに、リスト型の変数に対して指定したインデックスの箇所を指定する`{{index}}`を使用することで、
`{{index .MATCH 0}}`は「最初に指定したワイルドカードの箇所」をそのまま文字列として使用できます。

<!-- textlint-enable -->

最終的にこの記述をすることによって、`make XXX`というビルダーを指定するmake処理を`task builder-XXX`という形式に置換しています。

[^3]: https://taskfile.dev/usage/#wildcard-arguments
[^4]: `build-*-*` のように複数個のワイルドカードも使えるため、`build-a-b`と指定したら`a`,`b`のリストとなります。

## depsを使ったショートカット

Taskfileの最後にこのようなタスクを定義しています。

```yaml:Taskfile.yaml(抜粋)
tasks:
  help:
    desc: 'Display help of docs'
    deps:
      - 'build-help'
  clean:
    desc: 'Clean build files of docs'
    deps:
      - 'build-clean'
```

`deps`はタスクの前提条件として、`cmds`の実行前に他のタスクを実行したい時に記述します。

`sphinx-build`で呼べるビルダーは通常のビルダーの他にも特殊な用途を持つものが存在します。

* `help`ビルダー: 使用可能なビルダーの一覧を出力する。
* `clean`ビルダー: 出力先となるフォルダを削除してクリーンアップする。

今回のTaskfileを定義するにあたって、これらの特殊用途のものに対しては「何をしたいか」を分かりやすくするべきでしょう。
よって、`task help`,`task clean`という形式で実行できる方が望ましいものとなります。

実は、タスク自体は`cmds`を宣言する必要はありません。
`deps`に`build-help`,`build-clean`だけを宣言しておくことで、実質的に`task help`は`task builder-help`のエイリアスとして機能するようになります。 [^5]

ちなみに`build`も同様となっていて、`SPHINX_DEFAULT_BUILD`変数で指定したビルダーを使うショートカットになっています。

[^5]: 見ての通り、`build-help`は普通にワイルドカード通りに処理されていきます。

## 留意事項的なこと

個人利用がメインのライブラリに関しては、ドキュメント用のタスクはTaskfileへの置き換えが進んでいます。
少なくとも開発に使っている端末にはgo-taskがインストールされているため、困るシーンはありません。

とはいえ、OSS上でこのアプローチを採用するということは、コントリビューターにもgo-taskの使用を少なからず強制することになります。
README上で明記したり、そもそもgo-taskが無くても平気は範囲での使用に留めるなど、気をつけていくほうが良いでしょう。
