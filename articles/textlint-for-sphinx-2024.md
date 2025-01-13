---
title: "Sphinxのドキュメントにtextlintを適用する構成(2024年末版)"
emoji: "📚"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["sphinx", "textlint", "qiitaadventcalende", "adventcalendar2024"]
published: true
published_at: "2024-12-08 06:00"
---

:::message
この記事は、Qiita上の[NIJIBOX Advent Calendar 2024](https://qiita.com/advent-calendar/2024/nijibox)の8日目を担当している記事です。
:::

今年にちょっとしたきっかけで、PDF版の技術同人誌を書いてました。
その際に「執筆基盤はSphinx」「最低限の校正としてtextlint」という組み合わせを採用していたので、整理を兼ねて構成についての解説をしてみます。

## ちょっとした前提

記事内では、次の環境を使用しています。各ツール自体は置き換え可能なので、試したい場合は自分の好みで切り替えてください。

* pnpm - Node.js系のパッケージ管理
* uv - Python系のパッケージ管理
* lefthook - Git hooksの管理

また、SphinxではreStructuredTextを使っています。

### 参考リンク

各ツールに関する説明をだいぶ端折ってます。もし、「〇〇って？」となった場合は下記のリンクから事前に概要を追ってください。

* textlint
  * [Webサイト](https://textlint.github.io/)
* Sphinx
  * [Webサイト](https://www.sphinx-doc.org/ja/master/)
  * [日本のユーザー会](https://sphinx-users.jp/)
* uv
  * [Webサイト](https://docs.astral.sh/uv/)
* pnpm
  * [Webサイト](https://pnpm.io/)
  * [(日本語)](https://pnpm.io/ja/)
* lefthook
  * [Webサイト(リポジトリ)](https://github.com/evilmartians/lefthook)

## textlintのプロセスまわり

:::message
全体として、かなり簡易な表現に抑えています。
:::

textlintの挙動をかなり大雑把に図示すると、下記のようになります。

```mermaid
graph LR
  A[Sources] --> B((Parser))
  B --> C(AST)
  C --> D((Linter))
  D --> E[Result]
```

ステップとしては4段階あって、このような動きをします。
(1)はフォルダやglobを使えば全探索しますし、単体ファイルを指定するならそれのみが対象になります。
最終的に(1)で対象となった全てに対して(2)を(3)実施した後に、(4)の出力プロセスに移行する形式です。

1. 検査対象のファイルを探索する。
2. 対象となったソースを、パーサーを通してASTに変換する。
3. ASTをLinterによる検査にかけて、ルール違反がないかを判定する。
4. 判定時に通知するべき内容があれば、結果を出力する。

(1)は言ってしまえば「ただのファイル探索」ですし、(3)から先はすでにASTに変換後の話であるため、特に何か問題になると言ったことはありません。
一方で、(2)に関してはtextlintが標準で扱うフォーマットはMarkdownのため、「reStructuredTextをASTにする」というプロセスが必要になってきます。

## textlint上でreStructuredTextからASTを生成する

とはいえ、このプロセスを達成するライブラリはすでに存在しており、**textlint-plugin-rst** という名称で公開されています。
ただし、これだけでは目的の達成はできず、**docutils-ast-writer**というパーサーをPython環境上に用意する必要があります。 [^1]

[^1]: ASTとしての基本的な構造変換はdocutils-ast-writerが行い、textlint向けの整形をtextlint-plugin-rstが行う体制となっています。

大本の作者は[jimo1001](https://github.com/jimo1001)さんなのですが、時雨堂さんがOSSとしてフォークしたものがより現行環境に適合したものとなっています。
自分の場合は、「時雨堂さんのフォークがアーカイブになっている」「フォークされたものでも個人的に足りていない箇所がある」という理由から、更にフォーク+改修をしたものを使っています。 [^2]

[^2]: 時雨堂版はnpmjsやPyPIにはアップロードされていません。自分もまだそこまでの意思はありません。

<!-- textlint-disable -->

Node環境においてGitHub上のリポジトリとして公開している野良パッケージは、`github:[OWNER_NAME]/[REPO_NAME]#[REF_NAME]`の形式で指定するとインストールが可能です。

<!-- textlint-enable -->

```json:package.json
{
  "あれこれ略": "...",
  "dependencies": {
    "textlint-plugin-rst": "github:attakei-sandbox/textlint-plugin-rst#for-literal"
  }
}
```

<!-- textlint-disable -->

Python環境においてはGitHub上にリポジトリとして公開している野良パッケージは、`pyproject.toml`上にパッケージ名は登録ししつつ出どころをツールに合わせて明記することでインストールが可能です。
uvの場合は、`tool.uv.sources`へパッケージごとに必要な情報を記述しておけば、よしなに処理してくれます。

<!-- textlint-enable -->

```toml:pyproject.toml
[tool.uv]
dev-dependencies = [
    "docutils-ast-writer",
]

[tool.uv.sources]
docutils-ast-writer = { url = "https://github.com/attakei-sandbox/docutils-ast-writer/archive/refs/heads/dev.zip" }
```

## 実際にreStructuredTextでドキュメントを書いて、textlintでチェックする

環境準備を終えたら、まずはreStructuredTextの形式でドキュメントを書いてみましょう。
…とは言ったものの、「textlintを使うから」「MarkdownではなくreStructuredTextだから」という理由で特別な何かが加わるわけではありません。
ごくごく普通にSphinxドキュメントをreStructuredTextで書いてください。

ある程度書いたところで、textlintによるチェックを通してみましょう。
ここでの注意点としては、「`textlint-plugin-rst`が動作する際に`docutils-ast-writer`をインストールしたPython環境を呼び出す」という点です。
そのため、Pythonの仮想環境上にインストールしている場合は、適切にこの仮想環境を使用する必要があります。

今回の環境では環境管理にuvを使っているため、下記のように若干ですが冗長なコマンドとなります。

```console:本環境での例(uv runを通すことでPython仮想環境を使用している)
uv run pnpm textlint source/index.rst
```

### コメントによる一時的な無効化

textlintとしての文法チェック周りは、textlintのプラグインを普通に使っていく形式で問題ありません。
自分も技術同人誌を書いた際には、技術書向けにもなるプリセットである "textlint-rule-preset-ja-technical-writing" を使用していました。

とはいえ、時にはルールを崩したいケースもあります。
textlintでは "textlint-filter-rule-comments" プラグインを利用することで、特定コメントによってlinterによるチェックの有効/無効を切り替えることができます。

Markdownでの利用時は、下記のような書き方を可能にします。

```md:source.md
全体としてtextlintが有効なら、この行はチェック対象になります。
例えばこの文の文字数が長すぎると、エラーになります。

<!-- textlint-dsable -->
Markdownで↑のコメントを差し込むと、↓のコメントが登場するまでの間はtextlintは検査対象外にします。
そのため、ここではルール外の書き方をしてもエラーになりません。
<!-- textlint-enable -->
```

これが、reStructuredTextではどうなるか？というと、今回の組み合わせであればreStructuredText内のコメント文法に従っておけば、適切に動作してくれます。

```rst:source.rst
全体としてtextlintが有効なら、この行はチェック対象になります。
例えばこの文の文字数が長すぎると、エラーになります。

.. textlint-disable

reStructuredTextでは、 ".. " で始まってディレクティブにならない行+ネストされた行は、コメントとみなされます。
そのため、↑のコメントを差し込むと、↓のコメントが登場するまでの間はtextlintは検査対象外にします。
そのため、ここではルール外の書き方をしてもエラーになりません。

.. textlint-enable
```

## より安定したチェックの準備

### pre-commit hooksを利用して、より安定したチェックをする

コマンドラインによるtextlintを用いたチェックなら、前述のコマンドを適宜実行するだけでも十分ですが、少々面倒でもあります。
そこで、Gitのpre-commit hookを利用して、コミット時にtextlintを実行するようにしておきます。

この分野には[Node製のhusky](https://typicode.github.io/husky/)や[Python製のpre-commit](https://pre-commit.com/)などもありますが、
最近は[Golang製のlefthook](https://github.com/evilmartians/lefthook)を試しています。
そこで、今回はlefthookの例を掲載します。

```yaml:lefthook.yaml
pre-commit:
  parallel: true
  commands:
    textlint:
      glob: "*.rst"
      run: "uv run pnpm textlint {staged_files}"
```

実態としては非常にシンプルで、「pre-commit時に」「.rstファイルがステージされていたら」「textlintを前述の手法で実行する」だけです。

### さらに、GitHub Actionsでもチェックをする

例えば共同作業などの過程で、「自分以外はGitHub上で直接修正する」という可能性が起こることもあります。
そんなときに備えて、GitHub Actions上でもtextlintを動作するようにしておくとよいでしょう。

```yaml:workflow.yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: 'actions/checkout@v4'
      - uses: 'astral-sh/setup-uv@v3'
      - uses: 'pnpm/action-setup@v4'
        with:
          version: '9.5.0'
      - uses: 'actions/setup-node@v4'
        with:
          cache: 'pnpm'
      - name: 'Configure env'
        run: |
          uv sync --frozen
          pnpm install
      - name: 'Run linter'
        run: |
          uv run pnpm lefthook run pre-commit --all-files
```

自分の場合は、上記のようにlefthookの構成をなるべく利用することで、ワークフローとしての記述を簡素にしています。


## まとめとおまけ

というわけで、Sphinxドキュメントをtextlintで検査する構成例の紹介でした。

ある程度の「型」にはなっているので、もし「ドキュメントの品質を底上げしたい」といった需要があるなら、エッセンスを抽出してみてください。

### おまけ

ここで書いた内容をある程度試せるデモリポジトリを公開しています。
フォークしていじってみてください。

https://github.com/attakei-sandbox/demo-textlint-with-sphinx

たとえば、`source/index.rst`にある`.. textlint-disable`という行を削除してコミットすると、GitHub Actionsのワークフローが失敗することを体験できます。
