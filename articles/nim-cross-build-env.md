---
title: "Nimで作るCLIのクロスプラットフォーム提供所感"
emoji: "📦"
type: "tech"
topics:
  - Nim
  - GitHub
  - Linux
  - Windows
  - Mac
published: true
---

:::message
これは、Qiitaで開催されている[Nim Advent Calendar 2021](https://qiita.com/advent-calendar/2021/nim) 8日目の記事です。
:::

先週～今週にかけてですが、[gitignore.io](https://www.toptal.com/developers/gitignore)にあるテンプレートから`.gitignore`を出力する `gigi` というCLIをNimで作りました。

https://github.com/attakei/gigi

この記事を書いている時点では以下のような特徴を持っています。

- Windows, macOS, Linuxのクロスプラットフォームでのバイナリ提供
- 全バイナリがスタンドアローンで動作

「どうやって使うのか」「何が出来るのか」に関しては、[README](https://github.com/attakei/gigi/blob/development/README.md)あたりを見てもらうほうが早いので省略します。
この記事自体の主旨は **「上記特徴のためにどのような構成・設計をしたか」** となります。

## 前提

以下の環境などを主眼にしています。

- GitHub上のプロジェクトとして開発し、ビルドはGitHub Actionsで実施
- ローカルの環境はChoosenimで用意(メイン環境はWSL)
- ※細かい検証のために、Windows側にもChoosenimを導入

## クロスプラットフォームビルドおさらい

Nimは `--cpu` / `--os` といったオプションでビルドターゲットとなるCPUアーキテクチャやOSを指定することが出来ます。 [^1]
このオプション+ビルド環境の準備によって、クロスコンパイルが比較的容易となっています。

Nimのドキュメントにはいくつかのクロスコンパイルパターンが記載されています。
その中には「Linux上でWindows向けバイナリのビルドも紹介されています」

...が、今回の話ではメインどころではありません。（ただし、この後もちょっとだけこの話題が出てきます）

[^1]: https://nim-lang.org/docs/nimc.html#crossminuscompilation

## 手っ取り早く、各OS用バイナリを提供するには

### GitHub Actionsによって複数OS上でワークフローを実行する

前提にもある通り、此処から先はGitHub/GitHub Actionsがベースになります。

GitHubにはCI/CDパイプラインとしてGitHub Actionsが提供されています。
ここにはLinuxだけでなくWindows、macOSの仮想マシンの利用が可能となっており、
公開リポジトリであれば無料となっています。便利ですね。

というわけで、「単一マシンでクロスビルド」をするよりも **「複数マシンでOSごとにビルド」** をするほうが、遥かに手っ取り早くなっています。

### 仮想マシンにNim環境を用意する

さて、ここで[各仮想マシンのスペック](https://github.com/actions/virtual-environments)を見てみましょう。 [^2]
見て分かる通り、Nimはインストールされていないのでインストールする必要があります。

とはいえ、ここもすでに先駆者の方によってChoosenim [^3] を利用したActionsが用意されています。

https://qiita.com/jiro4989/items/809f2a520c2e40d65bd3

[^2]: 今回はOSごとに `xxx-latest` を使うので、リンク先のテキストからマシンスペックを参照してみてください。
[^3]: Nimのバージョン管理ツール。

### 整理する

以上のことを踏まえて、次のステップを踏むことでOS別のバイナリ提供が容易に実現可能です。

- `strategy` に複数OSの仮想マシンを指定する
- `jiro4989/setup-nim-action` を利用して無理なくNim環境を用意する
- 整理された環境上で、ごく普通にビルドする

（ワークフローの一部抜粋）

```yml
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      os:
        - ubuntu-latest
        - windows-latest
        - macosx-latest
    steps:
      - uses: actions/checkout@v1
      - uses: jiro4989/setup-nim-action@v1
        with:
          nim-version: 1.6.0
      - name: Run main
        run: |
          nimble build -d:release -Y
```

## 目指すは「シングルバイナリ」（現在編）

### そもそもなぜ「シングルバイナリ」を目指すか

Nim製CLIをローカルインストールする手段として一番楽なのは、間違いなく`nimble install`です。
この記事の公開前に[勢いでNimble Directory [^5] 上でも公開を行った](https://nimble.directory/pkg/gigi)ため、
`nimble install gigi`でインストールすることが出来るようになっています。

しかし、これだと「とりあえずツール使ってみたい人」への導線としてちょっとばかり不便そうです。
出来ることなら、「GitHub Releaseにビルト済みバイナリがあるからダウンロードして使ってみてくださいな」と言いたいですね。

というわけで、以下の流れを体感しやすくするため、シングルバイナリを目指すことにしました。

1. ダウンロード
1. アーカイブから中身の実行ファイルを取り出す
1. そのままターミナル実行
1. 機能する！

:::message
一切依存ライブラリを取り込みきった純正なるスタンドアローンは大変です。
そこで、まずは「OS標準のライブラリに依存しつつも、実行ファイル自体は単体で持ち込める」程度のシングルバイナリを目指します
:::

LinuxビルドとmacOSビルドは「完全無欠なシングルバイナリ」を目指さなければそこまで難しくありません。
実際に普段使いしそうな範囲ではファイル単体を持ち込めば動くようになっています。

### 難敵、Windows

今回のビルド環境下で作成したCLIは、条件によってはそのまま実行しても起動できないことがあります。

実は `gigi` のプロトタイプ版のビルドでは、ビルド済みバイナリだけをWindows実機に持ち込むと、このような現象が起きていました。

```sh
> ./gigi.exe nim
could not load: (libcrypto-1_1-x64|libeay64).dll
```

端的に言えば、「実行ファイルの動作に必要なDLLが見つけられず実行できない」状態になっています。

### なぜ、DLL不足が起きるのか

`gigi` はテンプレートの取得のために、gitignore.ioのAPIサーバーにGETリクエストをしています。
NimはHTTPリクエストのための標準モジュールとして `httpclient` を提供しており、これを使うと簡単にコンテンツを取得できます。

```nim
import std/[httpclient, json]

proc fetch(url: string): JsonNode =
  let resp = newClient().get(url)
  return parseJson(resp.body)
```

さて、[Windows版のインストールガイド](https://nim-lang.org/install_windows.html)を見てみましょう。
ページでは標準的なビルド環境としてMinGWの利用を案内しています。[^4]

今回のケースが当てはまるのですが、一部のモジュールはWindows上の処理のためにMinGW同梱のDLLなどを必要としています。
例として、これらのようなものが存在します。

- 正規表現用モジュール `re` のために `pcre`
- HTTP通信系モジュール `httpclient` でのHTTPS通信のために `libcrypto`,`libssl` 他

目標とする「シングルバイナリでの提供」のためには、これらのDLLに対する同梱をなんとかして回避しないといけません。

[^4]: Linux上でのWindows向けクロスビルドでも同様です。

### DLL不足と向き合う

以上を踏まえて、ここからは「挑戦しようとした選択肢」「実際に採用した選択肢」を紹介します。

#### MinGWのライブラリを静的リンクする

:::message alert
今回のケースでは諦めました
:::

Nimのビルドは詰まるところ `gcc` によるC言語のビルドでしかありません。
そのため、原理的にはMinGWに同梱されているライブラリファイルを静的リンクさせれば、シングルバイナリ化の実現は可能...なのかぁ？と挑戦してみました。

ただし、私自身はC言語（というかgccのハンドリング周り）関連に強いわけではなく、後述の手段を取れたのもあって散々苦戦した末に諦めました。

#### DLL非依存に出来るサードパーティパッケージを利用する

現時点では `gigi` の中でDLL関連に依存する要素は「HTTPS通信」のみとなっています。
そして、同じくHTTPS通信をしているChoosenimはWindows版もシングルバイナリで提供されています。

Choosenimのプロジェクトを読んでみると、どうやら `httpclient` を使っておらず、代わりに `Puppy` というサードパーティ製パッケージを使っているようです。
雑な理解によれば、この `Puppy` はOS提供のAPIを直接使ってHTTP通信をするように実装しているみたいです。
そのため、Windows版でのSSL関連処理もOS側に全て委譲する構造となっており、結果として `libssl` などの存在が不要にでています。

```nim
import pkg/puppy

proc fetch(url: string): JsonNode =
  return parseJson(puppy.fetch(url))
```

というわけで、現行版の `gigi` ではPuppyを依存ライブラリとして採用しています。

## 目指すは「シングルバイナリ」（未来編）

### 今回はDLL依存を回避できた...が...

改めてとなりますが、 `gigi` は「CLIで `.gitignore` を生成する」だけのごくごく単純なツールです。

とはいえもうちょっとやりたいことはあって、そうなるといつDLL依存に戻ってしまうか油断できません。 [^5][^6]

このような状況で取れる選択肢は、先ほど挙げたものを含めてこのようになります。

1. 超頑張って静的リンクする
1. DLL対象には依存しないスタイルを実現しているパッケージを探す
1. ~~DLL対象に依存しない実装を自分で超頑張る~~
1. 諦めてDLL依存前提にしてしまう

[^5]: 「キーワードに該当するテンプレートを出す」ことなどを考えると、もしかしたら正規表現が必要になる可能性があります。
[^6]: TUIで視覚的に選択出来るようにすると、依存ライブラリの側で何かが必要になる可能性があります。

### ときには妥協（諦め）も必要

選択肢１ははっきり言って自分には茨の道でしかありません。
そのため、可能な限り選択肢２に未来を見るのが無難です。
選択肢３は、おそらく選択肢１よりさらにハードです。

そうなってくると、最終的にどこかのタイミングで選択肢４を視野に入れる必要が出てきます。
ここを、「Choosenim入れろ」とするか「MinGWを入れろ」とするかは考えどころではありますね。

## まとめと感想

というわけで、記事用のベンチマーク兼ゴールのためのプロトタイプとして `gigi` のOS別シングルバイナリを提供しつつ、
起きた課題感などをつらつらと書いていきました。

普段はLL系言語を主体で手を動かすことが多いのですが、改めてNimを触ってみると、CLIとしての本質的な部分はの実装は非常にスピーディーでした。
なおかつ、動作が軽量な仕上がりにできたので、個人的には気持ちいい開発体験になったなという感想です。

脚注にもある通り、このCLIを土台として実現したいことがまだあるので、今後も弄っていきます。
