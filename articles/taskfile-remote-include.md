---
title: "リモートインクルード機能を使った、より再利用性の高いTaskfile"
emoji: "🌐"
type: "tech" # tech: 技術記事 / idea: アイデア
topics:
  - Sphinx
  - gotask
  - taskfile
published: true
published_at: "2025-05-09 10:00"
---

タスクランナーにもっぱらTask (以下、go-task) [^1] を使用しています。
以前にもこのような記事を書いていました。

https://zenn.dev/attakei/articles/go-task-for-sphinx

[^1]: GitHubリポジトリの名付け的には "Task" が本来の名前な気がしますが、固有名詞感を出すためにこの表現で通します。

ライブラリを出すたびにSphinxを使ったドキュメントもきちんと用意はするようにしているのですが、毎回Taskfileをコピペするのにもちょっとした不便な点があります。

* あるリポジトリでやっていたことを別のリポジトリでも行いたいときに、コピペし直す必要がある。
* ライブラリの数が多いと、それだけで面倒くさい。

というわけで、あれこれ工夫して「再利用性の高いTaskfile環境」を作ってみました。

## ⚠重要⚠

この記事では、go-taskの実験的な機能を紹介しています。 [^2]
そのため、記事を読んだ時点で「正式採用されて不要になった工程がある」「最終的に頓挫してなかったことになる」という状況になっている可能性があります。

[^2]: 記事公開(2025年5月頃)時点

## go-taskの`include`機能

go-taskには、他のTaskfileをインクルードしてタスクの統合処理が可能です。

```yaml:Taskfile.yaml
include:
  docs:
    taskfile: './Taskfile.docs.yaml'
```

```yaml:Taskfile.docs.yaml
tasks:
  build:
    desc: 'Display help of docs'
    deps:
      - '{{.run_python}} sphinx-build ...'
```

同じフォルダ上に`Taskfile.yaml`と`Taskfile.docs.yaml`があったときに、上記のように`Taskfile.yaml`側で`include`としてインクルードできます。
この場合、`Taskfile.docs.yaml`で定義されていた`build`というタスクは、`docs:build`という形式で呼び出すことが可能になります。

<!-- textlint-disable -->

`tasiflie`の項目はフォルダを指定することも可能で、この場合は`{指定したフォルダ}/Taskfile.ya?ml`を

<!-- textlint-enable -->

インクルードされる方のTaskfileが変数を使用している場合も、`vars`に指定することで問題なく対応可能です。

```yaml:Taskfile.yaml
include:
  docs:
    taskfile: './Taskfile.docs.yaml'
    vars:
      run_python: 'uv run'
```

まず、ローカルの相対パスでのインクルードが標準対応していることを覚えておきましょう。
自分のプロダクトでも、[多くのケースで使用しています](https://github.com/attakei/sphinx-revealjs/blob/master/Taskfile.yaml)。

このインクルード機能ですが、【実験的】ではあるものの実はリモートのファイルもインクルードできます。

## 事前作業: 実験的要素の有効化を行う

この先で【実験的な機能】を使う方法を簡単に解説します。

https://taskfile.dev/experiments/

上記のドキュメントにも書かれていますが、各機能を有効にするためには次のいずれかが必要です。

* `.taskrc.yml` を用意して、`experiments.{機能名}`の値に `1`を設定する。
* あらかじめ環境変数`TASK_X_{機能名}`の値に`1`を設定する。
* `.env`を用意して、`TASK_X_{機能名}=1`を記述しておく。

気をつける必要がある点として、**「`Taskfile.yaml`に`experiments.{機能名}`を設定するのではない」** ということです。
大人しく上記のいずれかを選択しましょう。個人的には`.env`が程よいと思っています。

なお、今回必要な`{機能名}`は`REMOTE_TASKFILES`です。

```env:.env
TASK_X_REMOTE_TASKFILES=1
```

## GitHubのファイルを指定してインクルードを行う

https://taskfile.dev/experiments/remote-taskfiles/

`REMOTE_TASKFILES`を有効にすると、`include`セクションの`taskfile`に次の形式も設定可能になります。

* HTTP/HTTPSでのファイル実体URL
* "Git over HTTP"でのリモートリポジトリ上のファイル指定
* "Git over SSH"でのリモートリポジトリ上のファイル指定

"Git over XXX"形式でもブランチやタグを指定可能です。
GitHubでホスティングしているものを指定する場合、どの形式も利用可能ではあるので、好みで選択してください。

```yaml:Taskfile.yaml
# Git over HTTPを使ってブランチも指定した例
includes:
  docs:
    taskfile: 'https://github.com/attakei/workspace-configs.git//projects/sphinx-doc/Taskfile.yaml?tag=v0.2.0'
```

"Git over XXX"の記述はちょっと慣れが必要ですが、`{GitHubのWeb画面で出るclone用URL}//{ファイルパス}`となっています。
リポジトリURLとファイルパスの間が`//`となっている点がポイントです。

この形式の`include`を使用した状態で`task`コマンドからタスクを実行すると、「リモートファイルをインクルードをする」ための警告が出ます。
プロンプトは`y/N`形式で何も入れずにEnterをすると`No`扱いになります。ちゃんと`y`を入力してからEnterしましょう。

### CI/CD環境下での注意点

前述の通り、リモートファイルをインクルードした状態でタスクを実行しようとするとプロンプトが出てしまします。
これでは、CI/CDワークフロー環境で実行しようとすると動作が途中で止まってしまいます。

この対策として、go-taskにはプロンプトを全部`y`にするための`--yes`引数があります。
GitHub Actionsのワークフロー内でgo-taskを使ったテストなどをしている場合は、忘れずに指定しましょう。

## リポジトリの状況に追従する

この機能を使うことで、別の共通化した設定を管理するリポジトリからTaskfileを参照できました。
では、適切に追従するためにはどうすればよいでしょうか。

<!-- textlint-disable -->

一応、URLでのブランチ指定で`main`のようなデフォルトブランチを設定して、`task --download`のように`--download`オプションを指定することで都度最新ファイルを確認してくれるみたいです。
しかし、これだと変更が無いと分かりきっているのにダウンロードが頻発するため、あまり良くありません。

<!-- textlint-enable -->

現在自分が取っている戦略は「共通化した設定を管理するリポジトリで適宜タグを設定しつつ、Renovateを使って追従する」というものです。
この戦略の地味なメリットとして「Renovateが更新をいい感じに追ってくれるためPRが溢れたりはしない」というポイントがあったりします。
しかし、Renovateが標準提供している項目の中にgo-taskはないため、ちょっとした工夫が必要になります。

<!-- textlint-disable -->

少し長くなるので今回は省略していますが、下記のファイルなどを見るとなんとなく想像できるかもしれません。
（後ほどこれについては別途記事を書く予定です）

<!-- textlint-enable -->

- [参照する側のTaskfile設定](https://github.com/attakei/age/blob/main/Taskfile.yaml)
- [参照先となるlefthook設定](https://github.com/attakei/workspace-configs/blob/v0.2.0/projects/sphinx-doc/Taskfile.yaml)
- [参照する側のRenovate設定](https://github.com/attakei/age/blob/main/renovate.json5)
- [参照する側のRenovate設定の継承元](https://github.com/attakei/workspace-configs/blob/main/renovate/taskfile.json)

ちなみに、この手法自体も再利用可能になるように気をつけて実装したので、興味があって理解できそうなら手を出してみてください。

