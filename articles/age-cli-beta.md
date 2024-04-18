---
title: "ageという名前のalt bumpversionツールを作ってます"
emoji: "📚"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["バージョニング", "Rust"]
published: true
published_at: "2024-04-19 10:00"
---

3月ぐらいから、`age`という名前のCLIツールを作ってます。
ちょっと直近の課題整理を兼ねて、このツールの紹介記事を書いてみます。

## ageとは

プロジェクトのリリースには「リリースする機能の実装」や「機能の正常性を担保するテスト」といったものだけではなく、
「プロジェクトのバージョン表明」が必要です。
当たり前ではありますが、新しいバージョンとして使うためにはソースコードやメタデータファイルなどに新しいバージョンを付与する必要があります。

:::details 一例
Pythonのライブラリを開発していると、よく下記のファイルにバージョン情報を付与するケースがあります。

<!-- textlint-disable ja-technical-writing/no-mix-dearu-desumasu -->
* `package/__init__.py` or `package.py`
  * `__version__` という変数にバージョン文字列が設定されていることが多く、
    `from package import __version__` でバージョンを参照する機会があったりします。
* `pyproject.toml`, `setup.py`, `setup.cfg`
  * Pythonパッケージであることを示すメタデータファイルにはPyPIなどにバージョンを表明するために、`version`というセクションでバージョン文字列を設定します。
  * （場合によっては、パッケージ本体を参照しているケースもあります）
* `docs/conf.py`など
  * パッケージのドキュメントをSphinxで書いていると、`release`変数を通じて「このドキュメントはどのバージョンのものか」を表明する機会があります。
  * （メタデータファイルと同様に、importを利用してパッケージ本体を参照することもあります）
<!-- textlint-enable ja-technical-writing/no-mix-dearu-desumasu -->
:::

`age`は「バージョンに関わるテキスト」の更新をサポートするためのツールです。

<!-- textlint-disable ja-technical-writing/sentence-length -->
設定ファイル上で、「現在のバージョン」「バージョン更新時に編集が必要なファイル・置換条件」を記述しておくことで、
リリース作業時に1コマンドで「バージョン文字列+付随するテキストの一斉置換」を実現しています。
<!-- textlint-enable ja-technical-writing/sentence-length -->

編集対象のファイルは「テキストファイル」で「置換条件をある程度明確に出来ること」なので、単純なソースコードのバージョン文字列だけではなく、ダウンロード時のURLといったようなものにも対応可能です。

:::message
もし`bumpversion`というCLIツールにここあたりがあるならば、
**「Rust製のalt bumpversion」** という表現で位置づけを理解できるでしょう。
:::

:::details bumpversionについて
https://pypi.org/project/bumpversion/

同じことを実現しているPython製のCLIで、ある意味ageの源流です。

かなり古くから存在するのですが、すでにメンテナンスは行われていません。
現在は後継ポジションの[bump2version](https://pypi.org/project/bump2version/)もメンテナンスが停止され、
さらなる後継ポジションである[bump-my-version](https://pypi.org/project/bump-my-version/)がPythonプロジェクトとしてアクティブになっています。
:::

### 使い方

[ソースコードはGitHub上で管理している](https://github.com/attakei/age-cli/)のですが、タグ付与時にWindows/macOS/Linuxのx64向けバイナリをビルドしています。
[GitHub Releases](https://github.com/attakei/age-cli/releases)から最新版のZipファイルをダウンロードすれば、利用可能です。

※ARM系CPUのビルドは準備していないので、その場合はRustの開発環境をセットアップして、`cargo build`でバイナリをビルドしてください。

挙動を知りたい場合、設定が充実しているage本体のリポジトリを利用すると分かりやすいでしょう。

```Console
$ git clone https://github.com/attakei/age-cli
$ cd age-cli
$ age update 1.2.3
Updated!!

$ git state
```

`age update 1.2.3`で「各ファイルのバージョン文字列を`1.2.3`にする」処理を行っています。
おそらく、一切の待ち時間なしに、更新完了を表す`Updated!!`が表示されるでしょう。

`git state`を実行すると、7ファイルに差分が発生していることがわかります。

### ageの由来

`age`は次の2個の由来をうまいこと思いついたので、この名称になっています。

* 動詞としてのage=「年を取る」から、「新しい年=バージョンを刻む」ツールであるという意味。
* 2chにおけるage=「あげる」から、「バージョンを上げる」ツールであるという意味。

## 工夫点

### Rust実装による軽量動作

インスパイア元である`bumpversion`、後継作である`bump2version`,`bump-my-version`はいずれもPythonプロジェクトです。

今回ageを作るにあたって、Rustを採用しています。 [^1]
`bumpversion`系を使っていたときの速度は計測を特にしていないのですが、↑で試していたら分かるように瞬殺で更新処理が行われます。

多分、Rustで書いたおかげでしょう。

[^1]: これは自分の思想的な理由がそれなりに強いです。 https://bsky.app/profile/attakei.dev/post/3kndwvvdtau24

### semver対応のショートカットコマンド

### 正規表現のサポート

ファイル編集のターゲット設定に、正規表現を用いることができます。

```toml
[[files]]
path = ".github/release-body.md"
regex = true
search = """
- Source changes is (.+)
"""
replace = """
- Source changes is https://github.com/attakei/age-cli/compare/v{{current_version}}...v{{new_version}}
"""
```

例えば、上記のような`regex = true`と正規表現を有効とすることで、置換対象の検索時に正規表現を利用して「`- Source changes is `で始まる行」を検索できます。

この機能は、置換対象に更に古いバージョン文字列が混ざるケースなどにおいて、有効に働きます。

:::details 実例を用いた解説
ageのリリース処理時のGitHub Releases上のテキストは[このファイル](https://github.com/attakei/age-cli/blob/main/.github/release-body.md)を参照しています。

リリースノートによく用いる手法として、「直近バージョンと現行バージョンのDiffをURLで伝える」というものがあります。
このURLは当然ながら比較対象の2バージョンの情報が必要になり、`replace`での置換内容側は`v{{current_version}}...v{{new_version}}`と記述できます。

一方、保存されているテキスト自体は、ageの実行タイミングでは「過去のバージョン」となっているため、通常のテキスト検索ができません。 [^2]
そのため、正規表現を用いて「固定文字列の部分だけ一致することで検索を特定する」手法が可能になっています。
:::

[^2]: この記事を書いた際に、可能性として「直前のバージョン」も保持すれば良いと気づきました。が、まぁいいかなと。

### （若干の）言語向けメタデータファイルでの設定管理サポート

ageの設定ファイルは標準では`.age.toml`です。

もちろんこのファイルでの管理を推奨するのですが、TOMLでメタデータ管理をするプロジェクトでは一緒にまとめたい気持ちもあります。

そこで、Rust向けの`Cargo.toml`とPython向けの`pyproject.toml`用に、指定したセクションに設定値あれば参照が可能になっています。

|      ファイル名  |       セクション       |
|:----------------:|:----------------------:|
|   `Cargp.toml`   | `package.metadata.age` |
| `pyproject.toml` |       `tool.age`       |

## 困りごと

さて、「正規表現をそなえて柔軟性のある検索が可能」で「多少のファイル数ならキビキビ動く」ツールとして、個人的にageは気に入っています。
とはいえ、ちょっとした課題を抱えています。

### 名前かぶり問題

Rustプロジェクトを開発していて「age」と聞くと、心当たりがありませんか？

そうです。Crates.ioには[暗号化ツールのage](https://crates.io/crates/age)がすでに存在します。
幸い、双方の状況から大きな問題にはなっていません。

- 向こうは、CLI名称が`rage`。そのため、バイナリクレートの重複が（おそらく）起きない。
- こちらは、そもそもライブラリクレートにする意義が薄いため、crates.ioにアップロードする意思が（まだ）ない。

が、いい感じな名前が思いついたら名前を変えてcrates.ioにアップロードしたくはあります。

GitHub上でIssueにはしているので、もしアイデアがあるなら投稿お願いします。

https://github.com/attakei/age-cli/issues/6

### テスト問題

自分にとってRustプロダクトを書くのはこれが初めてです。
日本語翻訳されたRust Bookが充実しているので、これぐらいのCLIならなんとかできてしまいます。

一方で難しいのが「テストどうしよう」という問題です。こればかりは、モチベーションだけで走るのもちょっと難しい領域です。
`mod tests`を使いつつテストを書けることまでは解っているのですが、複雑度が上がると心理的にも大変です。

そのため、今回はユニットテストの領域をほぼ捨てています。
もちろん「一切のテストを書かない」というわけではなく、別の手法である程度の動作担保を行っています。

:::message
これについては、機会をとってどこかで細かく書く予定です。
:::

### どこまで機能互換性を保つか

現時点でのageではbumpversionにあった機能のうち、「更新と同時に自動でコミットする」機能を持たせていません。
というのも、あくまでも「自分がbumpversionを使っていたときの機能をRustで快速動作させる」が主目的であるため、
積極利用していなかった機能に関しては特に意識を払っていないためです。 [^3]

[^3]: CHANGELOGに限っては手動で書いてたので、自分の中では需要を見いだせていない。 [^4]
[^4]: とはいえ、自動でCHANGELOGをまとめるツールを組み合わせる手法を思いつけば検討してみたいところ。

## まとめ

というわけで、自作のbumpversion代替となるageを作ってます。

<!-- textlint-disable ja-technical-writing/no-mix-dearu-desumasu -->
* Rust実装のおかげで動作が軽快。個人的には気分良く使ってます。
* 名前衝突の問題を抱えているので、良いアイデアがあったら教えてください。
<!-- textlint-enable ja-technical-writing/no-mix-dearu-desumasu -->
