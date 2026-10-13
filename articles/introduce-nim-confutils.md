---
title: "Nimの引数パーサーにconfutilsを採用してみた"
emoji: "🔧"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["nim", "cli"]
published: true
published_at: "2026-10-14 09:00"
---

最近になってまたNimでCLIツールの作成をしています。

サブコマンドが必要なケースがほどんどなのもあり、以前は[この記事](https://qiita.com/jiro4989/items/d5476b3dce3c4b3d6523)などを参考にしつつcligenを利用していました。
今回のツールでは「せっかくだし違うものも試してみよう」という発想から、nim-confutilsという別アプローチのライブラリを採用してみています。

割りと肌に合う感じだったので、機能面の整理をしつつ紹介しようと思います。

## confutilsって？

Nimのライブラリで、コマンドライン引数を解析してあらかじめ定義していた型を生成する機能を提供しています。
型定義の際にコマンドライン関連のプラグマを付与することで、実行時に「どのオプションに該当するか」「未指定の場合には何を指定するか」などを設計できます。

PythonからNimに入ってきたエンジニア向けに例えると、このあたりとイメージが近いでしょうか。

- `parse_args(namespace=Class)`まで使って型ヒントをきっちりしたargparse
- pydantic-settingsのCliApp機能

:::details cligenの簡易紹介
こちらもCLI作成でよく紹介されるライブラリです。

こちらは、`dispatch`に定義した関数を通すことで、関数の仮引数の情報をそのままCLIオプションとして使用できます。

あえてPython寄りに例えると、サードーパーティー製のClickあたりと感覚が近いかもしれません。
:::

## 利用準備

ここからは実際に利用方法を紹介していきます。

### 必要な環境など

`confutils.nimble`上では Nim 2.0.16 以上を要件としています。

が、今の段階でわざわざ2.0系を積極採用することもないので、自身の環境は2.2系にしています。
記事を書く素材となるツールの開発環境は、こんな感じです。

| 名前      | バージョン | 
|:----------|:-----------|
| Nim       | 2.2.12     |
| nimble    | 0.24.1     |
| confutils | 0.1.1      |

### インストールなど

`nimble install confutils` でインストールが出来ます。nimble経由で自身のアプリケーションに組込む場合は、下記のように記述しておきましょう。

```nim:project.nimble
requrires "confutils >= 0.1.1"
```

## ファーストステップ

最低限の利用方法を説明していきます。必要なのは3ステップのみです。

1. `import confutils`する。
2. そのCLIを動作する際に設定したい項目をイメージして型定義する。
3. コマンドのエントリーポイントで、`load()`を実行して結果を受け取る。

```nim:cli.nim
import confutils

type
  AppConf = object
    logLevel: string
    ## ログ出力時のレベル
    dest: string
    ## 統合したファイルの出力先
    force: bool
    ## 出力先にファイルが存在しても上書きする
    sources: seq[string]
    ## 統合元の素材ファイル群

when isMainModule:
  let conf = AppConf.load()
  echo conf
```

このまま `nimble run` を実行すると、下記のような出力になります。
「必須のオプションが設定されていない」という内容ですね。

これは`AppConf.load()`の実行時点で必要な引数が不足していたら自動で出力してCLIは終了するようになっています。

```console
> nimble run 
The required option 'logLevel' was not specified
Try cli --help for more information.
```

さて、指示に従って`--help`を付与して実行してみましょう。
先ほど定義した型定義がオプション引数として登録されていることが分かります。

これは`AppConf.load()`の実行時点で`--help`を含んでいたら自動で動作してCLIは終了するようになっています。

```console
> nimble run -- --help
Usage:

cli [OPTIONS]...

The following options are available:

 --help          Show this help message and exit.
 --logLevel
 --dest
 --force
 --sources
```

先程の型定義のうちstringに関してはこのままだと必須になっているので、コマンドラインで実引数を指定して実行しましょう。
今度は`echo conf`に到達して、`conf`の中身のデータを表示するようになりました。
`conf.logLevel`と`conf.dest`にはそれぞれ`--logLevel`と`--dest`の値が設定されていることが確認できます。

```console
> nimble run -- --logLevel=DEBUG --dest=/tmp/output
(logLevel: "DEBUG", dest: "/tmp/output", force: false, sources: @[])
```

最低限の使い方としてはこれだけです。必要に応じてフィールドを付加していけば、自身のCLIに必要な項目をそのまま要求できます。

## 基本的な使い方

先程のように「型定義+`load()`」だけでほぼ機能するものの、これだけだと情報量が少ないし出来ないこともあります。
というわけで、ここからはプラグマを用いた実装を紹介していきます。

このあたりをカバーしておけば、普段使う分には困ることはなさそうです。

### デフォルト値を指定する

そのオプション項目が未指定でも動作したいのであれば、デフォルト値を各項目に持たせるのが良いでしょう。
フィールド定義に`{.defaultValue.}`プラグマを付与することで実現できます。

```nim:cli.nim
type
  AppConf = object
    # 前略
    dest {.
      defaultValue: "/tmp/output"
    .}: string
    # 攻略
```

`--help`では変化がありませんが、`--dest`オプションに何も指定せずとも`echo`まで通るようになります。

当然ですが、`dest`自体の型とは違う値を`defaultValue`に指定するとコンパイルエラーになります。
また、`std/options`による`Option[T]`型はフィールドに使用可能です。この場合は`none(T)`を`defaultValue`に指定してください。

後ほど出てきますが、可能な限り`defaultValue`は明示しておくほうが良いでしょう。

### オプションには別名を使用する

設計方針によるところが大きいですが、引数名にはケバブケースを使うという運用も多いのではないでしょうか。
一方で、Nimではフィールドや変数名にハイフンを使うことは出来ません。

こういった時のために、`{.name.}`プラグマを付与することで「CLIオプションとしての名称」を別に指定することが出来ます。

```nim:cli.nim
type
  AppConf = object
    logLevel {.
      name: "log-level"
    .}: string
    # 後略
```

`--help`を実行すると`--logLevel`の代わりに`--log-level`が表示され、こちらの名前で値の設定が可能になります。(逆に元の名前では設定できなくなります)

### 短縮名を付与する

自動化するなら別ですが、通常のシェル上での作業を考えると「引数は短いほうが良い」ということはそれなりにあります。

こういった時のために、`{.abbr.}`プラグマを付与することで「CLIオプションとしての別名」を追加で指定することが出来ます。

```nim:cli.nim
type
  AppConf = object
    # 前略
    force {.
      abbr: "f"
    .}: bool
    # 後略
```

`--help`を実行すると`--force`の隣に`-f`が表示され、実際に`-f`を指定すると`conf.force`が`true`になることが確認できます。

### 説明を付与する

最初の`AppConf`には各フィールド毎ドキュメンテーションで説明が記載されていました。
しかし、confutilsはこれを参照できないため、このまま`--help`を実行しても「オプション引数の名前」は分かっても「何を指定する必要があるか」を人間が判断できません。

後者の情報を出力するために、`{.desc.}`プラグマを付与することで「引数の説明」を設定することが出来ます。
また、これを設定すると`defaultValue`が指定されていると「未指定なら何を指定するか」も表示するようになります。

```nim:cli.nim
type
  AppConf = object
    logLevel {.
      desc: "ログ出力時のレベル"
    .}: string
    ## ログ出力時のレベル
    dest {.
      desc: "統合したファイルの出力先"
    .}: string
    ## 統合したファイルの出力先
    force {.
      desc: "出力先にファイルが存在しても上書きする"
    .}: bool
    ## 出力先にファイルが存在しても上書きする
    sources {.
      desc: "統合元の素材ファイル群"
    .}: seq[string]
    ## 統合元の素材ファイル群
```

`--help`を実行すると各オプションの右に`desc`へ記述した内容がそのまま出てきます。

### 非オプションの引数を受け付ける

もともとの`sources`フィールドは`seq[string]`のため、`--sources=a --sources=b`という記述で複数回オプション引数として指定する必要があります。

とはいえ、こういった「コンパイル対象」のようなものが複数あるなら最初から`cli a b`のような形式で指定したいですね。
このいわゆる「位置引数」を実現するために、`{.argument.}`を指定することで「このフィールドは位置引数を受け取る」という宣言をすることが出来ます。

```nim:cli.nim
type
  AppConf = object
    # 前略
    sources {.
      argument
    .}: seq[string]
```

この記述をすると次のような挙動になります。

- `--help`を実行すると、`cli [OPTIONS]... <sources>`のように対象フィールドがオプションからUsage本体に移動する。
- `cli a b`のような実行をした際に、`["a", "b"]`が`srouces`に代入される。

余談ですが、`argument`プラグマを指定したフィールドを`string`型として定義すると、ちゃんと位置引数を1個のみ受け付けます。
地味ながら便利な挙動です。

### 小まとめ

ここまでを全て導入すると、このようなコードになります。

```nim:cli.nim
import confutils

type
  AppConf = object
    logLevel {.
      desc: "ログ出力時のレベル"
      name: "log-level"
    .}: string
    dest {.
      defaultValue: "/tmp/output"
      desc: "統合したファイルの出力先"
    .}: string
    force {.
      abbr: "f"
      desc: "出力先にファイルが存在しても上書きする"
    .}: bool
    sources {.
      argument
      desc: "統合元の素材ファイル群"
    .}: seq[string]
```

`--help`を実行するとこのとおり、だいぶCLIの中身が分かりやすくなりました。

```console
> nimble run -- --help
Usage:

cli [OPTIONS]... <sources>

     <sources>        統合元の素材ファイル群.

The following options are available:

     --help           Show this help message and exit.
     --log-level      ログ出力時のレベル.
     --dest           統合したファイルの出力先 [=/tmp/output].
 -f, --force          出力先にファイルが存在しても上書きする.

```

## `load()`の引数を経由して動作を拡充する

引数のパースに使用している`load()`は、紹介している使用例とは違って引数をいくつか受け付けます。
どれも便利ですが、実際に使っているものや使い勝手が良さそうなものを計3個ほど紹介します。

### `cmdLine`

`seq[string]`を受け付ける引数で、普段はCLIの引数をスペースで分割したものを受け取るようになっています。

ユニットテスト時、これを明示的に指定することで「意図通りのパースが出来ているか」の検証をすることが出来そうです。

### `version`

この値を指定すると、CLIのオプション引数に`--version`を追加します。
この引数を設定して実行すると「指定した値(バージョン情報)を表示して終了」するようになります。

この機能が簡単に使用できること自体が便利ですが、本当にバージョン文字列しか出ないので機械処理にも優しい仕上がりとなっています。

### `copyrightBanner`

この値を指定すると、`--help`実行に出力内容の先頭に指定した内容を出力するようになります。

引数名やドキュメントにある通り、著作権に関するテキストを埋め込むのが本来の用途でしょう。
ただし、あくまで文字列ならなんでも受け付ける仕様のため「CLIの概要」などを置くのにも悪くなさそうです。

## 個人的な所感

cligenと比較すると「CLIの引数全体をオブジェクト型として宣言できる」という点が体感として取っ付きやすい印象を持ちました。

まだ積極活用していませんが、`load()`の`cmdLine`の存在のおかげでCLI引数のテストを記述しやすく、
ちょっと堅牢な設計をすることも出来そうです。
