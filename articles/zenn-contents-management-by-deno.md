---
title: "Denoで完結させるZennの記事管理"
emoji: "📑"
type: "tech"
topics: ["Zenn", "Deno"]
published: true
published_at: "2023-11-01 10:00"
---

:::message
リポジトリの動作検証を兼ねて、第2リポジトリ（Private）側でデプロイしています。
適当なタイミングでPublic側に移植します。
:::

Zennへ連携可能なGitHubリポジトリが実は2個まで設定可能ということをつい最近知ったので、
検証を兼ねてタイトル通りDenoを中心に編集環境を準備します。

## 環境

* Linux系 [^1]
* Denoランタイムインストール済み [^2]

[^1]: 多分macOSの環境でも動きます。
[^2]: インストールしていないなら、[公式サイト](https://deno.com)の案内に従ってインストールしてください。

## Zenn-CLI

Denoはnpmパッケージの直接利用がサポートされているので、
`deno run npm:XXX`コマンドを実行すると、`XXX`というNPMパッケージを確保して実行してくれます。

```Shell:bin/zenn-cli
#!/bin/sh

exec deno run \
  --allow-env \
  --allow-net \
  --allow-read \
  --allow-sys \
  --allow-write \
  npm:zenn-cli $@
```

`--allow-XXX`系オプションは、最初はプロンプトに従いつつ、よしなに付与していきます。

## Textlint

Zenn-CLIのときと同様に、Denoのソース内にもNPMパッケージを指定可能です。
そのため、telixtint本体と使用プラグインをすべてインポートして実行するスクリプトを用意することで、
Denoランタイムでtextlintを実行することが出来ます。 [^3] [^4]

[^3]: オリジナルは、 https://github.com/kn1cht/run-textlint-on-deno
[^4]: 設定は、Node.jsでの利用時と同様に `.textlintrc`などを用意すれば、問題なく読み込みます。

```Typescript:bin/textlint
#!/usr/bin/env -S deno run --allow-read --allow-env
/**
 * textlint by Deno
 *
 * Original source from https://github.com/kn1cht/run-textlint-on-deno/
 */

// Textlint本体から、エンジンだけ利用
import { TextLintEngine } from "npm:textlint";
// プラグインのロード（ダウンロードさせるのが主目的なので、importのみで良い）
import "npm:textlint-rule-preset-ja-technical-writing";
import "npm:textlint-filter-rule-comments";

// ここから実行本体。
const engine = new TextLintEngine();
const results = await engine.executeOnFiles(Deno.args);

if (engine.isErrorResults(results)) {
  console.error(engine.formatResults(results));
  Deno.exit(1);
}
```

意識的に設定しているのはshebangの構成でしょうか。
`#/usr/bin/env deno`でも動きますが、これだと`--allow-XXX`を設定できません。
そこで`env`のオプションである`-S`を利用して、サブコマンドやオプションをまるごと指定しています。

```json:.textlintrc
{
  "rules": {
    "preset-ja-technical-writing": true,
    "ja-technical-writing/no-exclamation-question-mark": false,
    "ja-technical-writing/ja-no-mixed-period": {
      "allowPeriodMarks": [
        ":::"
      ],
    }
  },
  "filters": {
    "comments": true
  }
}
```

textlintの設定自体は、Node.jsで実行するときのものと変わりません。

構成上の理由から`package.json`が存在しないため、下記の点に注意する必要があります。

* 使用するプラグインは、`bin/textlint`内で直接宣言する。
* ルールファイルはpackage.jsonに書けない。

## (Optional) pre-commitでtextlint

Node.jsプロジェクトでpre-commitタイミングに何かをしたいときは、[husky](https://typicode.github.io/husky/)を使うことがあります。

しかし、このプロジェクトは「Denoランタイムを利用するから`package.json`がない」「特定プログラムではなくあくまで記事管理」という点から、[pre-commit](https://pre-commit.com/)を採用しています。

```yaml:.pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: textlint
        name: Lint writing-texts
        language: script
        files: '.+\.md'
        entry: ./bin/textlint
```

一般的なpre-commitの利用法では、`repo`にリポジトリURLを指定して設定のみを記述します。
今回はローカルのtextlintを実行したいので、上記コードで次のように設定しています。

* `repo: local`でこのリポジトリ自体をpre-commitのフック置き場と判定させる。
* `entry: ./bin/textlint`でtextlintを実行させる。

## GitHub Actions

この記事の編集時点ではPrivateリポジトリで管理+pre-commitを導入しているため、GitHub Actionsは基本的に不要です。

とはいえ、「別端末でpre-commitのセットアップを忘れた」「Publicリポジトリ化してからPRもらったときに検査したい」というシーンを考えると、用意したほうが無難でしょう。
幸い、Denoはdenoland側でSetupアクションを公開しているので、非常に少ない作業で「push時に全ファイルのtextlintチェック」を導入できます。

```yaml:.github/workflows/textlint.yml
name: Run textlint for all contents

on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: denoland/setup-deno@v1
    - name: Run textlint
      run: bin/textlint articles books
```

## おわり

これで、記事執筆の基本的な環境整備が完了です。

好みの差はありますが、Denoランタイムによる「個別ワークスペースごとにモジュール管理しなくて良い」というポイントはリポジトリの見た目がスッキリして嬉しいです。
