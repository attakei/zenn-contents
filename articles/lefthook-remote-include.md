---
title: "lefthookの設定を共通化して、リモート管理する"
emoji: "🥊"
type: "tech"
topics:
  - git
  - github
  - lefthook
  - renovate
published: true
published_at: "2025-05-09 09:00"
---

この記事自体は、主にlefthookのリモート設定に関する紹介がメインです。

## 似たパッケージを横断的に同じ検査をしたい

前置きとなる自己紹介をするのですが、自分は `atsphinx-`から始まるSphinx拡張を多数PyPIに公開しています。 [^1]
これらは「Pythonライブラリ」であり「Sphinxを依存ライブラリとする」とういう共通項もあるため、リポジトリ設計がほとんど同じです。

[^1]: https://pypi.org/user/attakei/ を参照。

また、自分がコアにしている言語がPythonであることや、Sphinxを使って技術同人誌を書いたりすることもあり、Git hooksの管理にはもっぱら[lefthook](https://lefthook.dev/)を採用しています。

:::details lefthookの超概要
lefthookはGo言語で書かれたGit hooks管理ツールです。
「コマンドの並列起動による高速な動作」「YAMLによる細かい動作設定」「Go言語系CLIおなじみのツールの依存度合いの少なさ」が特徴です。

自分は以前[pre-commit](https://pre-commit.com/)を使っていたのですが、諸々あってこっちを使っています。

lefthookの自体の詳細を知りたい場合は、Zennで公開されている他の方の記事を参照してください。

- [Git フック管理ツール「Lefthook」の紹介](https://zenn.dev/sukesan0720/articles/87a8c005f82522)
- [Lefthookを使ってみたい！](https://zenn.dev/gemcook/articles/466afbc82cbff3)
:::

さて、同じような構造をしているものを管理しているからこそ発生しがちな課題として、
**「基盤部分への変更が発生したら極力全体に反映させないといけない」** というものがあります。
これは人間が複数のリポジトリに対する作業をするうえで、「コンテキストスイッチの量を減らす」という観点で非常に大切だったりします。
今回の例ではまだ引っかかりにくいのですが、パッケージ管理ツールも「あれはRye、これはuv」とやっていると、なかなかしんどいものがあります。

もちろん、「変更が発生するたびに全リポジトリへ順に反映する」という手段を取ることもできます。
GitHub Actionsなどを駆使すれば、ある程度低コストで出来る可能性はあります。

というわけで、何かしらの形で「共通化された設定を参照する」ことを検討してみます。

## 「共通化した設定」の置き場と参照を実現するアプローチ

この記事を書いている時点で、おおまかに3種類の方策を思いついています。

* モノレポにする
* サブモジュールを使う
* lefthookのリモート設定を使う

順番に軽く方策の説明と個人的評価を書いていきます。

### モノレポにする

これは、簡単に言えば「複数のPythonプロジェクトを1つのリポジトリで管理して、トップに`lefthook.yaml`を配置する」というものです。
これならトップにある`lefthook.yaml`を編集するだけで一気に反映が可能なため、かなり楽にはなるでしょう。

一方で「今からモノレポにする」というとてつもなく面倒な作業が発生します。
さらに、lefthookのプロセスでも適切にRuffやmypyを実行しようとなると、uvのワークスペース機能をある程度把握しないとなりません。

今回はイニシャルコストが高すぎるので見送っています。

### サブモジュールを使う

<!-- textlint-disable -->

例えば「共通化した設定を感じする別リポジトリ」を用意して`workspace-configs`というフォルダにサブモジュールとして配置することもできます。
この場合、lefthookには`extends`という「ローカルにある他設定ファイルを参照して継承利用する」機能を使えます。

<!-- textlint-enable -->

今回この方策も取らなかったのですが、サブモジュール化したあとに「どのような手段で変更を検知して回収するか」という部分のイメージがうまく組み立てられなかったためです。

### lefthookのリモート設定を使う

最終的に選択した手段がこれです。
これは、この後にもう少し細かく解説しますが、`remotes`設定で実現できることが想定より柔軟性があり、
今回の対象となる予定の`atsphinx-`以外でも利活用しやすそうと判断したためです。

## lefthookの`remotes`設定

ここからは実例を交えたりしつつ、`remotes`設定周りの紹介をしていきます。

この機能自体は[lefthook v1.6.0](https://github.com/evilmartians/lefthook/releases/tag/v1.6.0)で追加されたものです。
次の要素を持つ`remotes`設定が使えるようになっています。 [^2]

[^2]: https://lefthook.dev/configuration/remotes.html

- `remotes`全体はシーケンス型である。
- シーケンスの各要素は次の項目を持つ。
  - `git_url`: 取り込み対象となるリポジトリのURL。
  - `ref`: 参照対象となるリポジトリのブランチorタグ。
  - `refetch`: lefthookを実行するたびに、参照対象をフェッチするか。
  - `refetch_frequency`: 参照対象をフェッチする頻度（`refetch: true`の場合は無視）。
  - `configs`: 使用したい設定ファイル（リポジトリルートの相対パス）。

実際に動かしているlefthookの設定を見てみましょう。 [^3]

[^3]: https://github.com/attakei/age/blob/main/lefthook.yaml より一部抜粋。

```yaml:lefthook.yaml
remotes:
  - git_url: 'https://github.com/attakei/workspace-configs'
    ref: 'v0.2.0'
    configs:
      - 'projects/sphinx-doc/lefthook.yaml'

pre-commit:
  parallel: true
  commands:
    nph:
      glob: '*.nim'
      run: 'nph {staged_files}'
      stage_fixed: true
```

このファイルには、通常の`pre-commit`設定としてのコマンドとは別に、`remotes`として私が管理しているリポジトリのとあるファイルを参照する記述がされています。

そして、こちらが設定してある`projects/sphinx-doc/lefthook.yaml`です。

```yaml:lefthook.yaml
pre-commit:
  commands:
    doc8:
      glob: '*.rst'
      run: '{run_python} doc8 {staged_files}'
```

一見すると、普通のlefthook設定が書かれているだけです。

この設定がおかれている状態で、`lefthook install`からの`lefthook run pre-commit --all-files`を実行してみてください。
次のような表示になるでしょう。

```console
$ lefthook run pre-commit --all-files                                                                                                                   130 ↵
╭────────────────────────────────────────╮
│ 🥊 lefthook v1.10.10  hook: pre-commit │
╰────────────────────────────────────────╯
┃  nph ❯

┃  doc8 ❯

summary: (done in 0.16 seconds)
✔ nph
✔ doc8
```

メインの`lefthook.yaml`に記述されている`nph`と一緒に`remotes`経由で参照している`doc8`も実行していることがわかります。
これで、当初の目的である「lefthookのリモート設定を使う」が達成できました。

## `remotes`における工夫点と注意点

ドキュメントなどを追っていくと分かるのですが、`remotes`設定を利用するにあたり知っておくと良い点がいくつかあります。

### `templates`を利用して設定をコントロールする余地を与える

これは先程も掲載した、`remotes`で参照している先の「共通化した設定」です。

```yaml:lefthook.yaml
pre-commit:
  commands:
    doc8:
      glob: '*.rst'
      run: '{run_python} doc8 {staged_files}'
```

実行するコマンドを定義している`run`に、チェック対象のファイルが入る`{staged_files}`とは別に`{run_python}`という項目があります。
この文法はいわゆるテンプレート変数なのですが、[v1.10.8](https://github.com/evilmartians/lefthook/releases/tag/v1.10.8)から使用可能になった[`templates`](https://lefthook.dev/configuration/templates.html)項目を使うことで、独自に変数を作成出来るようになっています。

参照元の掲載時には省略していましたが、[実際のファイル](https://github.com/attakei/age/blob/main/lefthook.yaml)を見ると、`run_python`に`'uv run'`を設定しています。
この記述を用意しておくことで、「pre-commit時に`doc8`を使うこと」「その際にパッケージ管理ツールは自由に選択できること」の両立が可能です。
（例えば、この値を指定しないことで「`venv activate`済みが前提」あるいは「グローバルインストールした`doc8`を使う」という振る舞いもできます）

### `remotes`や他項目の優先順位関係

lefthookの設定項目には`remotes`の他にローカルの相対パスを指定する`extends`があります。
当然ながら`lefthook.yaml`自体にhooksの設定を記述するのが標準です。

さて、同じ項目がバッティングした場合、どのような処理になるでしょうか。

自分の感覚としては不思議ではあるのですが、直接記述より`remotes`が優先されます。
更に`remotes`より`extends`が優先される仕様となっています。
これは、`lefthook.yaml`に直書きしても、`remotes`や`extends`にあると無駄になってしまうので注意が必要です。

では、どうしても上書きしたい場合はどうすればよいでしょうか。

lefthookが参照している設定ファイルにはもう1つ、`lefthook-local.yml`があります。
これは、最終的に解決した設定を更に上書きするときに使われるものです。
作者的には`.gitignore`で除外してやむを得ないケースでのみ使う想定のようです。

まとめると、このような順に上書きしていきます。

1. `lefthook.yaml`に直接記述したhooks設定
1. `lefthook.yaml`の`remotes`で取得したhooks設定
1. `lefthook.yaml`の`extends`で取得したhooks設定
1. `lefthook-local.yml`に記述したhooks設定

### 依存ライブラリの管理は自己責任

当たり前ですが、lefthook自体には依存ライブラリのフォローアップする機能はありません。
したがって、参照したい設定が何かしらのインストールを要求している場合は、リポジトリ側で忘れずに実施する必要があります。

共有化した設定を管理する側は、なるべくなら「何が必要か」を明記してあげるとよいでしょう。

## 共通化した設定を追従するためには

ここまでで「共通化した設定」を作り管理するスタートを切ることができました。
最後に、「どう追従するか」について忘れずに目を向けてみましょう。

一番手っ取り早い方法は、「`ref: 'main'`, `refetch: true`にする」ことです（この"main"はデフォルトランチであれば何でも平気です）。

```yaml:lefthook.yaml
remotes:
  - git_url: 'https://github.com/attakei/workspace-configs'
    ref: 'main'
    refetch: true
```

この設定にすることで、lefthookが起動するたびに"main"へpush済みの最新設定を使うことができます。
とはいえ、頻繁にコミットするような（適切な）戦術を取っていると頻繁な`git-fetch`はかえって速度の低下を招きます。

現在自分が取っている戦略は「共通化した設定を管理するリポジトリで適宜タグを設定しつつ、Renovateを使って追従する」というものです。
この戦略の地味なメリットとして「Renovateが更新をいい感じに追ってくれるためPRが溢れたりはしない」というポイントがあったりします。
しかし、Renovateが標準提供している項目の中にlefthookはないため、ちょっとした工夫が必要になります。

<!-- textlint-disable -->

少し長くなるので今回は省略していますが、下記のファイルなどを見るとなんとなく想像できるかもしれません。
（後ほどこれについては別途記事を書く予定です）

<!-- textlint-enable -->

- [参照する側のlefthook設定](https://github.com/attakei/age/blob/main/lefthook.yaml)
- [参照先となるlefthook設定](https://github.com/attakei/workspace-configs/blob/main/projects/sphinx-doc/lefthook.yaml)
- [参照する側のRenovate設定](https://github.com/attakei/age/blob/main/renovate.json5)
- [参照する側のRenovate設定の継承元](https://github.com/attakei/workspace-configs/blob/main/renovate/lefthook.json)

ちなみに、この手法自体も再利用可能になるように気をつけて実装したので、興味があって理解できそうなら手を出してみてください。
